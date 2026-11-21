<?php

namespace Tests\Feature\Community;

use App\Domain\Community\Jobs\OptimizeCommunityImage;
use App\Domain\Community\Media\CommunityImageVariants;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class CommunityImageVariantsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
        config()->set('community.media_variants_enabled', true);
        config()->set('community.media_max_dimension', 2048);
    }

    public function test_only_known_media_folders_can_be_optimized(): void
    {
        $variants = app(CommunityImageVariants::class);
        $this->assertTrue($variants->allowed('public', 'post-images/valid_123.jpg'));
        $this->assertTrue($variants->allowed('local', 'post-images-private/valid_123.png'));
        $this->assertTrue($variants->allowed('local', 'comment-media/valid_123.jpeg'));
        $this->assertFalse($variants->allowed('local', 'post-check-images/valid_123.jpg'));
        $this->assertFalse($variants->allowed('public', 'comment-media/valid_123.jpg'));
        $this->assertFalse($variants->allowed('public', 'post-images/../private.jpg'));
        $this->assertFalse($variants->allowed('s3', 'post-images/valid.jpg'));
    }

    public function test_optimization_is_queued_and_never_queues_unapproved_staging_media(): void
    {
        Queue::fake();
        $variants = app(CommunityImageVariants::class);
        $variants->queue('public', 'post-images/photo.jpg');
        $variants->queue('local', 'post-check-images/private.jpg');
        Queue::assertPushed(OptimizeCommunityImage::class, 1);
    }

    public function test_delivery_falls_back_to_original_when_variant_is_missing(): void
    {
        Storage::disk('public')->put('post-images/a.jpg', 'original-exact-bytes');
        $response = app(CommunityImageVariants::class)->response('public', 'post-images/a.jpg', 640, true);
        $this->assertSame('image/jpeg', $response->headers->get('Content-Type'));
        $this->assertSame('public, max-age=60', $response->headers->get('Cache-Control'));
        $this->assertSame(Storage::disk('public')->path('post-images/a.jpg'), $response->getFile()->getPathname());
    }

    public function test_delivered_variant_is_private_when_source_is_private(): void
    {
        Storage::disk('local')->put('comment-media/a.png', 'original');
        Storage::disk('local')->put('comment-media/a.png.w320.webp', 'variant');
        $response = app(CommunityImageVariants::class)->response('local', 'comment-media/a.png', 320, false);
        $this->assertSame('image/webp', $response->headers->get('Content-Type'));
        $this->assertSame('private, no-store', $response->headers->get('Cache-Control'));
        $this->assertSame(Storage::disk('local')->path('comment-media/a.png.w320.webp'), $response->getFile()->getPathname());
    }

    public function test_image_worker_replaces_uncompressed_upload_and_keeps_retries_idempotent(): void
    {
        if (! extension_loaded('gd') || ! function_exists('imagewebp')) {
            $this->markTestSkipped('GD with WebP support is required for image optimization.');
        }
        $image = imagecreatetruecolor(1600, 900);
        $this->assertNotFalse($image);
        imagefill($image, 0, 0, imagecolorallocate($image, 230, 242, 253));
        $filename = Storage::disk('public')->path('post-images/source.png');
        if (! is_dir(dirname($filename))) mkdir(dirname($filename), 0775, true);
        imagepng($image, $filename, 0); // Deliberately uncompressed upload.
        imagedestroy($image);
        $initialSize = filesize($filename);
        $initialHash = hash_file('sha256', $filename);

        $job = new OptimizeCommunityImage('public', 'post-images/source.png');
        $job->handle(app(CommunityImageVariants::class));

        $this->assertNotSame($initialHash, hash_file('sha256', $filename));
        $this->assertLessThan($initialSize, filesize($filename));
        $this->assertSame([1600, 900], array_slice(getimagesize($filename), 0, 2));
        $this->assertTrue(Storage::disk('public')->exists('post-images/source.png.w640.webp'));
        $this->assertSame(hash_file('sha256', $filename), Storage::disk('public')->get('post-images/source.png.optimized'));

        $optimizedHash = hash_file('sha256', $filename);
        $job->handle(app(CommunityImageVariants::class)); // No second lossy encoding.
        $this->assertSame($optimizedHash, hash_file('sha256', $filename));
    }

    public function test_oversized_upload_is_resized_in_place_without_a_second_original(): void
    {
        if (! extension_loaded('gd') || ! function_exists('imagewebp')) {
            $this->markTestSkipped('GD with WebP support is required.');
        }
        $image = imagecreatetruecolor(2400, 1600);
        $this->assertNotFalse($image);
        imagefill($image, 0, 0, imagecolorallocate($image, 100, 130, 220));
        $filename = Storage::disk('local')->path('comment-media/portrait.png');
        if (! is_dir(dirname($filename))) mkdir(dirname($filename), 0775, true);
        imagepng($image, $filename);
        imagedestroy($image);

        (new OptimizeCommunityImage('local', 'comment-media/portrait.png'))
            ->handle(app(CommunityImageVariants::class));

        $this->assertSame([2048, 1365], array_slice(getimagesize($filename), 0, 2));
        $this->assertTrue(Storage::disk('local')->exists('comment-media/portrait.png.optimized'));
        $this->assertTrue(Storage::disk('local')->exists('comment-media/portrait.png.w640.webp'));
        $this->assertFalse(Storage::disk('public')->exists('comment-media/portrait.png'));
        app(CommunityImageVariants::class)->deleteVariants('local', 'comment-media/portrait.png');
        $this->assertFalse(Storage::disk('local')->exists('comment-media/portrait.png.optimized'));
        $this->assertTrue(Storage::disk('local')->exists('comment-media/portrait.png'));
    }
}
