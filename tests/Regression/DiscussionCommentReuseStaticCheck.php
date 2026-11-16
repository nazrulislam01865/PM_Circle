<?php

$root = dirname(__DIR__, 2);
$read = fn (string $path): string => file_get_contents($root.'/'.$path) ?: '';
$composer = $read('resources/js/components/community/CommentComposer.tsx');
$commentActions = $read('resources/js/components/community/CommentEngagementActions.tsx');
$scenario = $read('resources/js/pages/scenarios/Show.tsx');
$controller = $read('app/Http/Controllers/Scenario/ScenarioController.php');
$css = $read('resources/css/pm-comment-thread.css');
$checks = [
    'Post comments and nested replies have no film/video option; image picker still accepts GIF' =>
        !str_contains($composer, '<Film') && !str_contains($composer, 'gifInput')
        && str_contains($composer, 'image/png,image/webp,image/gif'),
    'Scenario replies use the same composer as post comments, without unsupported media' =>
        str_contains($scenario, 'import { CommentComposer }')
        && substr_count($scenario, '<CommentComposer') >= 2
        && str_contains($scenario, 'allowMedia={false}'),
    'Parent and child scenario responses reuse the existing reaction and reply bar' =>
        substr_count($scenario, '<CommentEngagementActions') >= 2
        && str_contains($commentActions, 'endpoint={endpoint ??'),
    'Scenario replies are scoped to the original root response' =>
        str_contains($scenario, 'submitScenarioReply(resp.id, body)')
        && str_contains($controller, "->whereNull('parent_id')"),
    'Scenario responses eager-load child reaction counts and member reaction types' =>
        str_contains($controller, "->withCount('reactions')->oldest()")
        && str_contains($controller, "'reactions' => fn (\$reactions)"),
    'JSON reply returns public user fields only' =>
        str_contains($controller, "->where('visibility', 'public')")
        && str_contains($controller, "'reactions_count' => 0"),
    'Scenario replies reuse centralized comment tokens' =>
        str_contains($css, '.pm-nested-reply-card .pm-comment-engagement')
        && str_contains($css, 'var(--s2)'),
];
foreach ($checks as $message => $ok) {
    if (!$ok) { fwrite(STDERR, "FAIL: {$message}\n"); exit(1); }
    echo "PASS: {$message}\n";
}
