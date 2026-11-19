<?php

namespace App\Domain\Community\Actions;

use App\Models\Post;
use App\Domain\Community\Services\PostCheckQueue;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class PublishPost
{
    /** @param array<string, mixed> $data */
    public function execute(User $user, array $data): Post
    {
        if (! config('pm-ai.post_check_enabled', false)) {
            // Anonymous posts must not bypass AI checks or fall back to manual approval.
            if (! empty($data['is_anonymous'])) {
                throw ValidationException::withMessages([
                    'body' => 'Anonymous posting is temporarily unavailable while AI checking is disabled.',
                ]);
            }

            return $this->publishLegacy($user, $data);
        }
        $image = $data['image'] ?? null;
        $storedPath = null;
        if ($image instanceof UploadedFile) {
            // Never expose an uploaded image before AI approval.
            $storedPath = $image->store('post-check-images', 'local');
            if (! is_string($storedPath) || $storedPath === '') {
                throw new RuntimeException('The post image could not be stored.');
            }
        }

        try {
            return DB::transaction(function () use ($user, $data, $storedPath): Post {
                $post = $user->posts()->create([
                    'body' => trim((string) ($data['body'] ?? '')),
                    'topic' => $data['topic'],
                    'is_anonymous' => (bool) ($data['is_anonymous'] ?? false),
                    'image_path' => null,
                    'visibility' => $data['visibility'] ?? 'public',
                    'status' => 'pending_check',
                    'published_at' => null,
                    'check_version' => 1,
                    'ai_generated' => false,
                ]);
                if ($storedPath) {
                    $post->image_path = '/posts/'.$post->id.'/check-media/'.basename($storedPath);
                    $post->save();
                }
                if ($post->topic === 'Poll') {
                    foreach (array_values($data['poll_options'] ?? []) as $position => $label) {
                        DB::table('post_poll_options')->insert([
                            'post_id' => $post->id, 'label' => trim($label), 'position' => $position,
                        ]);
                    }
                }
                app(PostCheckQueue::class)->dispatch($post);
                return $post;
            });
        } catch (Throwable $exception) {
            if ($storedPath) {
                Storage::disk('local')->delete($storedPath);
            }

            throw $exception;
        }
    }

    /** Retain the existing posting behavior until the new checker is explicitly enabled. */
    private function publishLegacy(User $user, array $data): Post
    {
        $image = $data['image'] ?? null;
        $storedPath = null;
        if ($image instanceof UploadedFile) {
            $private = ($data['visibility'] ?? 'public') === 'members';
            $storedPath = $image->store($private ? 'post-images-private' : 'post-images', $private ? 'local' : 'public');
            if (! is_string($storedPath) || $storedPath === '') {
                throw new RuntimeException('The post image could not be stored.');
            }
        }

        try {
            return DB::transaction(function () use ($user, $data, $storedPath): Post {
                $post = $user->posts()->create([
                    'body' => trim((string) ($data['body'] ?? '')),
                    'topic' => $data['topic'],
                    'is_anonymous' => (bool) ($data['is_anonymous'] ?? false),
                    'image_path' => $storedPath && ($data['visibility'] ?? 'public') !== 'members' ? '/post-media/'.basename($storedPath) : null,
                    'visibility' => $data['visibility'] ?? 'public',
                    'status' => 'published',
                    'published_at' => now(),
                    'ai_generated' => false,
                ]);
                if ($storedPath && $post->visibility === 'members') {
                    $post->image_path = '/posts/'.$post->id.'/media/'.basename($storedPath);
                    $post->save();
                }
                if ($post->topic === 'Poll') {
                    foreach (array_values($data['poll_options'] ?? []) as $position => $label) {
                        DB::table('post_poll_options')->insert([
                            'post_id' => $post->id, 'label' => trim($label), 'position' => $position,
                        ]);
                    }
                }
                return $post;
            });
        } catch (Throwable $exception) {
            if ($storedPath) {
                Storage::disk(($data['visibility'] ?? 'public') === 'members' ? 'local' : 'public')->delete($storedPath);
            }

            throw $exception;
        }
    }
}
