<?php

namespace Tests\Feature;

use App\Domain\Community\Actions\PublishPost;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CommunityPostComposerTest extends TestCase
{
    use RefreshDatabase;

    public function test_published_post_is_visible_in_community_and_own_profile(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);
        $member->profile()->create(['visibility' => 'public']);

        $response = $this->actingAs($member)->post('/posts', [
            'topic' => 'From my project',
            'body' => 'A **strong** project lesson with 🙂',
            'return_to' => 'dashboard',
        ]);

        $post = Post::query()->sole();
        $response->assertRedirect(route('dashboard'));
        $this->assertSame($member->id, $post->author_id);
        $this->assertSame('published', $post->status);
        $this->assertSame('public', $post->visibility);

        $this->get('/dashboard')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('account/Dashboard')
            ->where('dashboard.posts.0.id', $post->id)
            ->etc());

        $this->get('/community')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('community/Feed')
            ->where('posts.data.0.id', $post->id)
            ->etc());

        $this->get('/members/'.$member->id)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('members/Show')
            ->where('posts.0.id', $post->id)
            ->etc());
    }

    public function test_post_body_allows_one_character_and_enforces_five_thousand_character_maximum(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);

        $this->actingAs($member)->post('/posts', [
            'topic' => 'From my project',
            'body' => 'A',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->actingAs($member)->post('/posts', [
            'topic' => 'From my project',
            'body' => str_repeat('A', 5000),
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->actingAs($member)->post('/posts', [
            'topic' => 'From my project',
            'body' => str_repeat('A', 5001),
        ])->assertSessionHasErrors('body');

        $this->actingAs($member)->post('/posts', [
            'topic' => 'From my project',
            'body' => '',
        ])->assertSessionHasErrors('body');

        $this->assertDatabaseCount('posts', 2);
    }

    public function test_image_only_post_uploads_validated_file_and_serves_it_without_symlink(): void
    {
        Storage::fake('public');
        $member = User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);
        $file = tempnam(sys_get_temp_dir(), 'pm-image-');
        file_put_contents($file, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+bV8sAAAAASUVORK5CYII='));
        try {
            $this->actingAs($member)->post('/posts', [
                'topic' => 'From my project',
                'image' => new UploadedFile($file, 'diagram.png', 'image/png', null, true),
            ])->assertRedirect();
        } finally {
            @unlink($file);
        }

        $post = Post::query()->sole();
        $this->assertSame('', $post->body);
        $this->assertNotNull($post->image_path);
        $filename = basename($post->image_path);
        Storage::disk('public')->assertExists('post-images/'.$filename);
        $this->get($post->image_path)->assertOk();
    }

    public function test_post_image_is_available_in_all_feed_and_profile_projections(): void
    {
        config()->set('pm-circle.demo_content_enabled', false);
        Storage::fake('public');
        $member = User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);
        $member->profile()->create(['visibility' => 'public']);
        $file = tempnam(sys_get_temp_dir(), 'pm-test-media-');
        file_put_contents($file, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+bV8sAAAAASUVORK5CYII='));
        try {
            $this->actingAs($member)->post('/posts', [
                'topic' => 'From my project', 'body' => 'Image attachment verification',
                'image' => new UploadedFile($file, 'image.png', 'image/png', null, true),
            ])->assertRedirect();
        } finally {
            @unlink($file);
        }

        $post = Post::query()->sole();
        $image = $post->image_path;
        $this->assertStringStartsWith('/post-media/', $image);
        $this->get($image)->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->get('/dashboard?tab=mine')->assertInertia(
            fn (Assert $page) => $page->where('dashboard.posts.0.image_path', $image)->etc()
        );
        $this->get('/community?tab=mine')->assertInertia(
            fn (Assert $page) => $page->where('posts.data.0.image_path', $image)->etc()
        );
        $this->get('/posts/'.$post->id)->assertInertia(
            fn (Assert $page) => $page->where('post.image_path', $image)->etc()
        );
        $this->get('/members/'.$member->id)->assertInertia(
            fn (Assert $page) => $page->where('posts.0.image_path', $image)->etc()
        );
        $this->get('/')->assertInertia(
            fn (Assert $page) => $page->where('posts.0.image_path', $image)->etc()
        );
    }

    public function test_legacy_image_path_uses_the_media_endpoint_without_storage_symlink(): void
    {
        $post = new Post(['image_path' => '/storage/post-images/example.png']);
        $this->assertSame('/post-media/example.png', $post->image_path);
        $post->image_path = 'post-images/example.jpg';
        $this->assertSame('/post-media/example.jpg', $post->image_path);
        $this->get('/post-media/not-an-upload.png')->assertNotFound();
    }

    public function test_anonymous_post_never_exposes_author_in_public_feeds_or_profile(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);
        $member->profile()->create(['visibility' => 'public']);
        $post = Post::create([
            'author_id' => $member->id,
            'body' => 'An anonymous community question.',
            'topic' => 'Ask the community',
            'is_anonymous' => true,
            'status' => 'published',
            'visibility' => 'public',
            'published_at' => now(),
        ]);

        $this->get('/community')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('community/Feed')
            ->where('posts.data.0.id', $post->id)
            ->where('posts.data.0.author.name', 'Anonymous member')
            ->missing('posts.data.0.author_id')
            ->etc());
        $this->get('/posts/'.$post->id)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('community/PostShow')
            ->where('post.author.name', 'Anonymous member')
            ->missing('post.author_id')
            ->etc());
        $this->get('/members/'.$member->id)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('members/Show')
            ->has('posts', 0)
            ->etc());
    }

    public function test_invalid_upload_and_free_member_anonymous_request_are_rejected(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);
        $this->actingAs($member)->post('/posts', [
            'topic' => 'From my project', 'body' => 'A valid example',
            'image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])->assertSessionHasErrors('image');
        $this->actingAs($member)->post('/posts', [
            'topic' => 'Ask the community', 'body' => 'A valid question', 'is_anonymous' => true,
        ])->assertSessionHasErrors('is_anonymous');
        $this->assertDatabaseCount('posts', 0);
    }
}
