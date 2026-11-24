<?php

namespace App\Domain\Community\Queries;

use App\Models\Post;
use App\Domain\Identity\Services\ProfileFieldPrivacy;
use App\Domain\Identity\Services\MemberProfileAccess;
use App\Domain\Community\Services\EngagementStats;
use App\Models\User;
use Illuminate\Pagination\Cursor;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Contracts\Encryption\DecryptException;

/** A single, cursor-stable read path for public discussion and member dashboard feeds. */
final class FeedQuery
{
    public const INITIAL_SIZE = 20;
    public const NEXT_SIZE = 12;

    public function page(string $tab, string $topic, ?string $search, ?User $viewer, ?string $token = null, bool $includeSaved = false, ?int $authorId = null): array
    {
        $search = trim($search ?? '');
        $scope = [$viewer?->getKey(), $tab, $topic, $search];
        if ($authorId !== null) {
            $scope[] = $authorId;
        }
        $key = hash('sha256', json_encode($scope));
        $anchor = null;
        $cursor = null;

        if ($token !== null) {
            try {
                $payload = json_decode(Crypt::decryptString($token), true, 512, JSON_THROW_ON_ERROR);
                if (! is_array($payload) || ($payload['key'] ?? null) !== $key || ! is_string($payload['cursor'] ?? null)
                    || ! is_array($payload['anchor'] ?? null)
                    || ! is_string($payload['anchor']['time'] ?? null)
                    || ! is_int($payload['anchor']['id'] ?? null)) {
                    abort(422, 'This feed cursor does not match the selected filters.');
                }

                $cursor = Cursor::fromEncoded($payload['cursor']);
                if ($cursor === null) {
                    abort(422, 'Invalid feed cursor.');
                }
                $anchor = $payload['anchor'];
            } catch (DecryptException|\JsonException $exception) {
                abort(422, 'Invalid or expired feed cursor.');
            }
        }

        $query = Post::query()->forFeed($tab, $viewer && $viewer->status === 'active' && ! $viewer->is_admin
                && $viewer->onboarding_step >= 3 && $viewer->hasVerifiedEmail() ? $viewer->getKey() : null)
            ->whereNotNull('posts.published_at')
            ->when($authorId !== null, fn ($query) => $query->where('posts.author_id', $authorId)->where('posts.is_anonymous', false))
            ->when($tab === 'restricted', fn ($query) => $query->whereRaw('1 = 0'))
            ->when($topic !== 'All', function ($query) use ($topic): void {
                if ($topic === 'Questions') {
                    $query->whereIn('posts.topic', ['Questions', 'Ask the community']);
                } else {
                    $query->where('posts.topic', $topic);
                }
            })
            ->when($search !== '', function ($query) use ($search): void {
                $escaped = addcslashes(mb_strtolower($search), '\\%_');
                $query->where(function ($query) use ($escaped): void {
                    $query->whereRaw('LOWER(posts.title) LIKE ?', ['%'.$escaped.'%'])
                        ->orWhereRaw('LOWER(posts.body) LIKE ?', ['%'.$escaped.'%']);
                });
            })
            ->when($anchor, fn ($query) => $query->where(fn ($inner) => $inner
                ->where('posts.published_at', '<', $anchor['time'])
                ->orWhere(fn ($same) => $same->where('posts.published_at', '=', $anchor['time'])
                    ->where('posts.id', '<=', $anchor['id']))))
            ->with([
                'author:id,name,status,is_admin,email_verified_at',
                'author.profile:id,user_id,role,avatar_path,visibility,field_visibility',
            ])
            ->orderByDesc('posts.published_at')->orderByDesc('posts.id');

        $columns = ['posts.id', 'posts.author_id', 'posts.title', 'posts.body', 'posts.image_path',
            'posts.is_anonymous', 'posts.visibility', 'posts.ai_generated', 'posts.topic', 'posts.tags',
            'posts.claps_count', 'posts.notifications_muted_at', 'posts.published_at'];
        if (EngagementStats::readsEnabled()) {
            $query->leftJoin('post_engagement_stats as engagement_stats',
                'engagement_stats.post_id', '=', 'posts.id')
                ->select($columns)
                ->selectRaw('COALESCE(engagement_stats.comments_count, 0) AS comments_count')
                ->selectRaw('COALESCE(engagement_stats.reactions_count, 0) AS reactions_count')
                ->selectRaw('COALESCE(engagement_stats.like_count, 0) AS likes_count');
            PostReactionSummary::selectStats($query, 'engagement_stats');
        } else {
            $query->withCount([
                'comments' => fn ($query) => $query->visible(), 'reactions',
                'reactions as likes_count' => fn ($query) => $query->where('type', 'like'),
            ]);
        }

        $page = $query->cursorPaginate(
            $token === null ? self::INITIAL_SIZE : self::NEXT_SIZE,
            $columns,
            'cursor',
            $cursor,
        );

        $posts = $page->getCollection();
        if ($anchor === null && $posts->isNotEmpty()) {
            $newest = $posts->first();
            $anchor = [
                'time' => $newest->published_at->format('Y-m-d H:i:s.u'),
                'id' => $newest->id,
            ];
        }

        // Batched viewer state. Never serialize private author IDs for anonymous posts.
        PostReactionSummary::attach($posts);
        $ids = $posts->pluck('id')->all();
        $viewerReactions = $viewer && $ids
            ? DB::table('post_reactions')->where('user_id', $viewer->getKey())
                ->whereIn('post_id', $ids)->pluck('type', 'post_id')
            : collect();
        $viewerSaved = $viewer && $ids
            ? DB::table('post_saves')->where('user_id', $viewer->getKey())
                ->whereIn('post_id', $ids)->pluck('post_id')->all()
            : [];
        // Poll rows are loaded in two batched lookups, only when a page contains polls.
        $pollIds = $posts->where('topic', 'Poll')->pluck('id')->all();
        $pollOptions = $pollIds ? DB::table('post_poll_options as options')
            ->leftJoin('post_poll_votes as votes', 'votes.option_id', '=', 'options.id')
            ->whereIn('options.post_id', $pollIds)
            ->groupBy('options.id', 'options.post_id', 'options.label', 'options.position')
            ->orderBy('options.position')
            ->selectRaw('options.id, options.post_id, options.label, options.position, count(votes.user_id) as votes_count')
            ->get()->groupBy('post_id') : collect();
        $pollVotes = $viewer && $pollIds ? DB::table('post_poll_votes')
            ->whereIn('post_id', $pollIds)->where('user_id', $viewer->id)->pluck('option_id', 'post_id') : collect();
        foreach ($posts as $post) {
            if ($post->topic === 'Poll') {
                $post->setAttribute('poll_options', ($pollOptions->get($post->id) ?? collect())->map(fn ($option) => [
                    'id' => $option->id, 'label' => $option->label, 'votes_count' => (int) $option->votes_count,
                ])->all());
                $post->setAttribute('viewer_vote', $pollVotes->get($post->id));
            }
            $post->setAttribute('viewer_reaction', $viewerReactions->get($post->id));
            $post->setAttribute('viewer_saved', in_array($post->id, $viewerSaved, true));
            $post->setAttribute('viewer_hidden', $tab === 'hidden');
            $post->setAttribute('viewer_is_author', (bool) ($viewer && $post->author_id === $viewer->id));
            $post->setAttribute('viewer_muted', (bool) ($viewer && $post->author_id === $viewer->id && $post->notifications_muted_at));
            $post->makeHidden('notifications_muted_at');
            MemberProfileAccess::decorateAuthor($post->author, $viewer);
            if ($authorId !== null && $post->author?->profile
                && ! ProfileFieldPrivacy::visible($post->author->profile, 'full_name', $viewer, $post->author->id)) {
                $post->author->name = 'PM Circle member';
            }
            $post->anonymizeForPublic();
        }

        $signCursor = static fn (?Cursor $value): ?string => $value && $anchor
            ? Crypt::encryptString(json_encode([
                'key' => $key, 'cursor' => $value->encode(), 'anchor' => $anchor,
            ], JSON_THROW_ON_ERROR)) : null;
        $nextToken = $signCursor($page->nextCursor());

        return [
            'data' => $posts->map(fn (Post $post) => $post->toArray())->values()->all(),
            'next_cursor' => $nextToken,
            'previous_cursor' => $signCursor($page->previousCursor()),
            'has_more' => $nextToken !== null,
        ];
    }

    /** Preserve the existing dashboard card contract without another database query. */
    public function dashboardPosts(array $items): array
    {
        return array_map(static function (array $post): array {
            $author = $post['author'] ?? [];
            $profile = $author['profile'] ?? [];
            return [
                'id' => $post['id'], 'title' => $post['title'] ?? null,
                'body' => $post['body'], 'image_path' => $post['image_path'] ?? null,
                'topic' => $post['topic'],
                'is_anonymous' => (bool) ($post['is_anonymous'] ?? false),
                'visibility' => $post['visibility'] ?? 'public',
                'author' => $author['name'] ?? 'Member',
                'authorId' => ! empty($post['is_anonymous']) ? null : ($author['id'] ?? null),
                'authorHasPublicProfile' => empty($post['is_anonymous']) && ! empty($author['profile']),
                'authorProfileUrl' => empty($post['is_anonymous']) ? ($author['profile_url'] ?? null) : null,
                'authorRole' => $profile['role'] ?? null,
                'authorAvatar' => $profile['avatar_path'] ?? null,
                'publishedAt' => $post['published_at'] ?? null,
                'comments' => $post['comments_count'] ?? 0,
                'reactions' => $post['reactions_count'] ?? 0,
                'reactionBreakdown' => $post['reaction_breakdown'] ?? [],
                'saved' => (bool) ($post['viewer_saved'] ?? false),
                'hidden' => (bool) ($post['viewer_hidden'] ?? false),
                'isOwner' => (bool) ($post['viewer_is_author'] ?? false),
                'isMuted' => (bool) ($post['viewer_muted'] ?? false),
                'pollOptions' => $post['poll_options'] ?? [],
                'viewerVote' => $post['viewer_vote'] ?? null,
                'reaction' => $post['viewer_reaction'] ?? null,
            ];
        }, $items);
    }
}
