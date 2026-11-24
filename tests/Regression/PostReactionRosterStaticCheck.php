<?php

// Dependency-free regression contract for the shared post-reaction roster.
$root = dirname(__DIR__, 2);
$read = static fn (string $path): string => file_get_contents($root.'/'.$path) ?: '';
$assert = static function (bool $condition, string $label): void {
    if (! $condition) {
        fwrite(STDERR, "FAIL: {$label}\n");
        exit(1);
    }
    echo "PASS: {$label}\n";
};

$route = $read('routes/web.php');
$controller = $read('app/Http/Controllers/Community/PostInteractionController.php');
$query = $read('app/Domain/Community/Queries/PostReactionSummary.php');
$postController = $read('app/Http/Controllers/Community/PostController.php');
$feed = $read('app/Domain/Community/Queries/FeedQuery.php');
$card = $read('resources/js/components/community/PostCard.tsx');
$actions = $read('resources/js/components/community/PostEngagementActions.tsx');
$dialog = $read('resources/js/components/community/PostReactions.tsx');
$css = $read('resources/css/pm-post-reactions.css');

$assert(str_contains($route, "Route::get('/posts/{post}/reactions/users'")
    && str_contains($route, "->middleware('throttle:60,1')"), 'Read-only, throttled reaction detail endpoint');
$assert(str_contains($controller, '$this->ensurePublic($post, $request)')
    && str_contains($controller, "'after' => ['nullable', 'integer', 'min:1']")
    && str_contains($controller, '->limit(21)')
    && str_contains($controller, "->where('r.id', '<', \$input['after'])"), 'Existing post visibility, keyset pagination and bounded data');
$assert(str_contains($controller, "->join('users as users'")
    && str_contains($controller, "->leftJoin('profiles as profile'")
    && str_contains($controller, "'profile_url' => \$accessible ?")
    && str_contains($controller, "'avatar_url' => \$publicProfile ?"), 'Real reactor names, privacy-safe avatars and profile links');
$assert(str_contains($postController, "foreach (['comments', 'reactions', 'likes', 'loves'] as \$label)")
    && str_contains($postController, "'comments' => 'comments_count'")
    && str_contains($postController, "'likes' => 'like_count'")
    && str_contains($postController, "'loves' => 'love_count'"),
    'Post detail engagement counters use string labels with the existing stored columns');
$assert(str_contains($feed, 'PostReactionSummary::attach($posts)')
    && str_contains($query, "->groupBy('post_id', 'type')")
    && str_contains($query, 'EngagementStats::readsEnabled()'), 'Seven breakdown counts batched without N+1');
$assert(str_contains($card, '<PostEngagementActions')
    && str_contains($actions, '<PostReactionSummary')
    && str_contains($actions, 'showCount={false}')
    && str_contains($card, 'showSave'), 'One shared post card owns the counter before Save');
$assert(str_contains($dialog, 'role="tablist"')
    && str_contains($dialog, 'role="tabpanel"')
    && str_contains($dialog, 'next_cursor')
    && str_contains($dialog, 'AbortController')
    && str_contains($dialog, 'disableDemoFallback'), 'Popup has accessible real reaction tabs, incremental loads and cancellation');
$assert(str_contains($css, 'var(--text-ui)')
    && str_contains($css, 'var(--border)')
    && str_contains($read('resources/css/app.css'), "@import './pm-post-reactions.css';")
    && str_contains($css, '.pm-post-save-action'), 'Styles reuse central tokens and preserve Save alignment');
$assert(str_contains($read('database/migrations/2026_11_16_000002_index_post_reaction_tabs.php'), 'CREATE INDEX CONCURRENTLY'),
    'Reaction tab queries use nonblocking PostgreSQL indexes');
