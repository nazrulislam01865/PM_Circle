<?php

namespace App\Domain\Community\Services;

use App\Models\Post;
use App\Domain\Community\Media\CommunityImageVariants;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class PostCheckMedia
{
    public function bytes(Post $post): array
    {
        $url = $post->getRawOriginal('image_path');
        if (! $url) {
            return [null, null];
        }
        $name = basename(parse_url($url, PHP_URL_PATH) ?: '');
        if (! preg_match('/\A[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)\z/iD', $name)) {
            throw new RuntimeException('POST_CHECK_INVALID_IMAGE');
        }
        $disk = 'local';
        $folder = 'post-check-images';
        if (str_starts_with($url, '/post-media/')) {
            $disk = 'public';
            $folder = 'post-images';
        } elseif (str_starts_with($url, '/posts/'.$post->id.'/media/')) {
            $folder = 'post-images-private';
        } elseif (! str_starts_with($url, '/posts/'.$post->id.'/check-media/')) {
            throw new RuntimeException('POST_CHECK_INVALID_IMAGE');
        }
        $storage = Storage::disk($disk);
        if (! $storage->exists($folder.'/'.$name)) {
            throw new RuntimeException('POST_CHECK_IMAGE_MISSING');
        }
        $contents = $storage->get($folder.'/'.$name);
        $mime = match (strtolower(pathinfo($name, PATHINFO_EXTENSION))) {
            'png' => 'image/png', 'webp' => 'image/webp', default => 'image/jpeg',
        };
        return [$contents, $mime];
    }

    /** Release a never-public image only after the checker approves it. */
    public function approve(Post $post): void
    {
        $url = (string) $post->getRawOriginal('image_path');
        if (! str_starts_with($url, '/posts/'.$post->id.'/check-media/')) {
            return;
        }
        $name = basename($url);
        $source = 'post-check-images/'.$name;
        $destinationDisk = $post->visibility === 'members' ? 'local' : 'public';
        $destination = ($post->visibility === 'members' ? 'post-images-private/' : 'post-images/').$name;
        if (! Storage::disk('local')->exists($source)) {
            throw new RuntimeException('POST_CHECK_IMAGE_MISSING');
        }
        if (! Storage::disk($destinationDisk)->put($destination, Storage::disk('local')->get($source))) {
            throw new RuntimeException('POST_CHECK_IMAGE_PUBLISH_FAILED');
        }
        $post->image_path = $post->visibility === 'members'
            ? '/posts/'.$post->id.'/media/'.$name : '/post-media/'.$name;
        // Delete the staged copy only after the record has been successfully saved by the caller.
    }

    public function cleanupApproved(Post $post, ?string $oldUrl): void
    {
        if ($oldUrl && str_starts_with($oldUrl, '/posts/'.$post->id.'/check-media/')) {
            Storage::disk('local')->delete('post-check-images/'.basename($oldUrl));
            // Callers invoke cleanup only after the approved record has committed.
            // The passed Post instance may still have its pre-approval status.
            $disk = $post->visibility === 'members' ? 'local' : 'public';
            $folder = $post->visibility === 'members' ? 'post-images-private/' : 'post-images/';
            app(CommunityImageVariants::class)->queue($disk, $folder.basename($oldUrl));
        }
    }

    public function delete(?string $url, int $postId): void
    {
        if (! $url) return;
        $name = basename($url);
        if (! preg_match('/\A[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)\z/iD', $name)) return;
        if (str_starts_with($url, '/posts/'.$postId.'/check-media/')) {
            Storage::disk('local')->delete('post-check-images/'.$name);
        } elseif (str_starts_with($url, '/posts/'.$postId.'/media/')) {
            $path = 'post-images-private/'.$name;
            Storage::disk('local')->delete($path);
            app(CommunityImageVariants::class)->deleteVariants('local', $path);
        } elseif (str_starts_with($url, '/post-media/')
            || preg_match('~\A/?(?:storage/)?post-images/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)\z~iD', $url)) {
            $path = 'post-images/'.$name;
            Storage::disk('public')->delete($path);
            app(CommunityImageVariants::class)->deleteVariants('public', $path);
        }
    }
}
