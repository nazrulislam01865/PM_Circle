<?php

namespace App\Domain\Community\Actions;

use App\Models\Post;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class PublishPost
{
    /** @param array<string, mixed> $data */
    public function execute(User $user, array $data): Post
    {
        $image = $data['image'] ?? null;
        $storedPath = null;
        if ($image instanceof UploadedFile) {
            $storedPath = $image->store('post-images', 'public');
            if (! is_string($storedPath) || $storedPath === '') {
                throw new RuntimeException('The post image could not be stored.');
            }
        }

        try {
            return $user->posts()->create([
                'body' => trim((string) ($data['body'] ?? '')),
                'topic' => $data['topic'],
                'is_anonymous' => (bool) ($data['is_anonymous'] ?? false),
                'image_path' => $storedPath ? '/post-media/'.basename($storedPath) : null,
                'visibility' => 'public',
                'status' => 'published',
                'published_at' => now(),
                'ai_generated' => false,
            ]);
        } catch (Throwable $exception) {
            if ($storedPath) {
                Storage::disk('public')->delete($storedPath);
            }

            throw $exception;
        }
    }
}
