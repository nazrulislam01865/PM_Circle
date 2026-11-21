<?php

namespace App\Domain\Community\Queries;

use App\Domain\Community\Services\PostCheckPolicy;
use App\Models\Post;
use Illuminate\Support\Facades\DB;

/** Small owner-only projection; never joins these posts to the public feed. */
final class PostCheckFeed
{
    public function forMember(int $userId): array
    {
        $posts = Post::query()->where('author_id', $userId)
            ->whereIn('status', ['pending_check', 'check_error', 'restricted', 'pending_review'])
            ->latest('id')->limit(30)
            ->get(['id', 'body', 'image_path', 'topic', 'status', 'is_anonymous', 'check_reason',
                'check_target', 'check_category', 'created_at', 'restricted_at']);
        $restrictionPolicy = app(PostCheckPolicy::class)->settings();

        return [
            'posts' => $posts->map(fn (Post $post) => [
                'id' => $post->id, 'body' => $post->body,
                'image_path' => $post->image_path, 'topic' => $post->topic,
                'status' => $post->status, 'is_anonymous' => $post->is_anonymous,
                'check_reason' => $post->check_reason, 'check_target' => $post->check_target,
                'check_category' => $post->check_category,
                'created_at' => $post->created_at?->toIso8601String(),
            ])->all(),
            'restricted_count' => Post::query()->where('author_id', $userId)->where('status', 'restricted')->count(),
            'blocked_until' => app(PostCheckPolicy::class)->restrictionUntil($userId),
            'restriction_policy' => $restrictionPolicy,
            'violation_count' => DB::table('post_check_violations')->where('user_id', $userId)
                ->where('created_at', '>=', now()->subDays($restrictionPolicy['window_days']))->count()
                + DB::table('comment_check_violations')->where('user_id', $userId)
                    ->where('created_at', '>=', now()->subDays($restrictionPolicy['window_days']))->count(),
        ];
    }
}
