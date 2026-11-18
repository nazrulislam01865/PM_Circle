<?php

namespace App\Domain\Community\Services;

use App\Domain\AI\Jobs\CheckCommunityPost;
use App\Domain\AI\Services\PostContentCheckService;
use App\Models\Post;
use Illuminate\Support\Facades\DB;

/** Must be called inside the same transaction that marks the post pending. */
final class PostCheckQueue
{
    public function dispatch(Post $post): void
    {
        DB::table('post_check_runs')->insertOrIgnore([
            'post_id' => $post->id, 'check_version' => $post->check_version,
            'status' => 'queued', 'model' => PostContentCheckService::selectedModel(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::afterCommit(fn () => CheckCommunityPost::dispatch($post->id, $post->check_version)
            ->onQueue(config('pm-ai.post_check_queue', 'ai-editorial')));
    }
}
