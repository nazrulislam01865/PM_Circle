<?php

$root = dirname(__DIR__, 2);
$read = static fn (string $path): string => file_get_contents($root.'/'.$path) ?: '';
$assert = static function (bool $condition, string $label): void {
    if (! $condition) { fwrite(STDERR, "FAIL: {$label}\n"); exit(1); }
    echo "PASS: {$label}\n";
};
$tabs = $read('resources/js/components/community/FeedScopeTabs.tsx');
$scope = $read('app/Models/Post.php');
$query = $read('app/Domain/Community/Queries/FeedQuery.php');
$menu = $read('resources/js/components/community/PostActionMenu.tsx');
$card = $read('resources/js/components/community/PostCard.tsx');
$actions = $read('resources/js/components/community/PostEngagementActions.tsx');
$css = $read('resources/css/pm-post-reactions.css');
$directory = $read('resources/js/pages/members/Directory.tsx');

$assert(str_contains($tabs, 'counts.saved > 0') && str_contains($tabs, 'counts.hidden > 0')
    && str_contains($tabs, "'following'") && str_contains($tabs, "'mine'"), 'Saved and Hidden tabs appear conditionally after the three original tabs');
$assert(str_contains($scope, "if (\$viewerId && \$tab === 'hidden')")
    && str_contains($scope, "if (\$tab === 'saved' || \$tab === 'hidden')")
    && str_contains($query, "viewer_hidden"), 'Personal scopes use viewer-filtered SQL and the existing paginated feed');
$assert(str_contains($menu, "action('hide', hidden ? 'DELETE' : 'POST')")
    && str_contains($read('routes/web.php'), "Route::delete('/posts/{post}/hide'")
    && str_contains($read('app/Http/Controllers/Community/PostManagementController.php'), "where('user_id', \$request->user()->id)"), 'Unhide is authorized per member and the existing hide action is reused');
$assert(str_contains($card, 'viewer_hidden') && str_contains($actions, 'pm-post-engagement-trailing')
    && str_contains($css, 'margin-inline-start: auto') && str_contains($css, '.pm-post-save-action'), 'Save stays on the right with and without reactions; hidden posts are read-only');
$assert(str_contains($directory, 'following: result.following')
    && str_contains($directory, 'aria-pressed=')
    && str_contains($read('resources/css/pm-member-directory.css'), '--pm-members-action-column'), 'Follow state uses confirmed JSON and member columns are aligned');
$assert(str_contains($read('database/migrations/2026_11_16_000003_index_personal_post_scopes.php'), 'CREATE INDEX CONCURRENTLY'), 'User-scoped saved/hidden queries have nonblocking PostgreSQL indexes');
