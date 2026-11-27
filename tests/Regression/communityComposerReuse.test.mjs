import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('community inserts the existing home composer ahead of the discussion cards, only for eligible members', () => {
    const feed = read('resources/js/pages/community/Feed.tsx');
    const composer = read('resources/js/components/dashboard/DashboardComposer.tsx');
    assert.match(feed, /!isGuest && memberShell && postChecks && \([\s\S]*?<CommunityComposer[\s\S]*?<VirtualizedFeed/);
    assert.match(feed, /<DashboardComposer[\s\S]*?plan=\{member\.plan\}[\s\S]*?blockedUntil=\{postChecks\.blocked_until\} returnTo="community"/);
    assert.match(composer, /<PostComposerCard/);
    assert.match(composer, /<PostComposerDialog[\s\S]*?returnTo=\{returnTo\}/);
    const controller = read('app/Http/Controllers/Community/PostController.php');
    assert.match(controller, /\$canCompose = \$viewer && \$viewer->status === 'active' && ! \$viewer->is_admin[\s\S]*?\$viewer->onboarding_step >= 3 && \$viewer->hasVerifiedEmail\(\)/);
    assert.match(controller, /'postChecks' => fn \(\) => \$canCompose \? app\(PostCheckFeed::class\)->forMember\(\$viewer->id\) : null/);
});

test('post creation keeps the existing home default and permits only an explicit community return route', () => {
    const dialog = read('resources/js/components/community/PostComposerDialog.tsx');
    const controller = read('app/Http/Controllers/Community/PostController.php');
    const request = read('app/Http/Requests/Community/StorePostRequest.php');
    assert.match(dialog, /returnTo = 'dashboard'/);
    assert.match(dialog, /payload\.append\('return_to', returnTo\)/);
    assert.match(request, /'return_to' => \['sometimes', Rule::in\(\['dashboard', 'community'\]\)\]/);
    assert.match(controller, /assertCanContribute[\s\S]*?\$action->execute[\s\S]*?to_route\(\$request->validated\('return_to'\) === 'community' \? 'community\.index' : 'dashboard'\)/);
});

test('both feeds reuse one owner-only moderation polling hook, with no polling in idle or hidden tabs', () => {
    const dashboard = read('resources/js/components/dashboard/DashboardFeed.tsx');
    const community = read('resources/js/pages/community/Feed.tsx');
    const hook = read('resources/js/hooks/community/usePostCheckFeed.ts');
    assert.match(dashboard, /usePostCheckFeed\(dashboard\.postChecks, onCheckCompleted\)/);
    assert.match(community, /usePostCheckFeed\(initialChecks, onCheckCompleted\)/);
    assert.match(community, /<PostCheckCard key=\{post\.id\}/);
    assert.match(hook, /if \(!hasPending\) return/);
    assert.match(hook, /if \(checkRequest\.current \|\| document\.visibilityState === 'hidden'\) return/);
    assert.match(hook, /fetch\('\/posts\/check-feed'/);
    assert.match(hook, /checkRequest\.current\?\.abort\(\)/);
    assert.doesNotMatch(community, /fetch\('\/posts\/check-feed'/);
});
