<?php

namespace App\Domain\Community\Queries;

use App\Domain\Community\Services\EngagementStats;
use App\Models\Comment;
use App\Models\Post;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

/** Bounded rank snapshot carried in an authenticated, expiring cursor; no shared viewer cache. */
final class RelevantCommentPage
{
    public const WINDOW = 200;
    public const SIZE = 12;

    public static function page(Post $post, Request $request, Builder $query): array
    {
        $token = $request->query('rank_cursor');
        $viewer = (int) ($request->user()?->id ?? 0);
        $offset = 0;
        $expired = false;
        if (is_string($token) && strlen($token) <= 8192) {
            try {
                $snapshot = json_decode(Crypt::decryptString($token), true, 512, JSON_THROW_ON_ERROR);
                if ($snapshot['post'] !== $post->id || $snapshot['viewer'] !== $viewer || $snapshot['expires'] < time()
                    || ! is_array($snapshot['ids']) || count($snapshot['ids']) > self::WINDOW || ! is_int($snapshot['offset'])) {
                    throw new \RuntimeException('Invalid rank cursor');
                }
                $ids = $snapshot['ids']; $offset = $snapshot['offset'];
                $truncated = $snapshot['truncated']; $expires = $snapshot['expires'];
            } catch (\Throwable) {
                $expired = true;
            }
        } elseif ($token !== null) {
            $expired = true;
        }
        if (! isset($ids)) {
            $ranking = Comment::query()->visible()->where('comments.post_id', $post->id)->whereNull('comments.parent_id')->select('comments.id');
            if (EngagementStats::commentReadsEnabled()) {
                $ranking->leftJoin('comment_engagement_stats as rank_stats', 'rank_stats.comment_id', '=', 'comments.id')
                    ->selectRaw('COALESCE(rank_stats.reactions_count, (SELECT COUNT(*) FROM comment_likes WHERE comment_likes.comment_id = comments.id)) AS likes_count');
            } else {
                $ranking->withCount('likes');
            }
            $ranked = $ranking->orderByDesc('likes_count')->orderByDesc('comments.id')->limit(self::WINDOW + 1)->get()->pluck('id');
            $truncated = $ranked->count() > self::WINDOW;
            $ids = $ranked->take(self::WINDOW)->values()->all();
            $expires = time() + 300;
        }
        $pageIds = array_slice($ids, $offset, self::SIZE);
        $byId = $query->whereIn('comments.id', $pageIds)->get()->keyBy('id');
        $rows = collect($pageIds)->map(fn ($id) => $byId->get($id))->filter()->values();
        $nextOffset = $offset + self::SIZE;
        $next = $nextOffset < count($ids) ? route('posts.show', ['post' => $post->id, 'sort' => 'relevant',
            'rank_cursor' => Crypt::encryptString(json_encode(['post' => $post->id, 'viewer' => $viewer, 'expires' => $expires,
                'ids' => $ids, 'offset' => $nextOffset, 'truncated' => $truncated], JSON_THROW_ON_ERROR))], false) : null;
        return ['rows' => $rows, 'next' => $next, 'refresh' => $expired || ($next === null && $truncated)];
    }
}
