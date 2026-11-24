import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const access = read('app/Domain/Identity/Services/MemberProfileAccess.php');
const controller = read('app/Http/Controllers/Members/MemberDirectoryController.php');

test('member route and serialized author links share active, verification and audience access rules', () => {
    assert.match(access, /\$status !== 'active' \|\| \$administrator \|\| ! \$verified/);
    assert.match(access, /\$viewer\?->id === \$id \|\| in_array\(\$visibility, ProfileFieldPrivacy::profileAudiences\(\$viewer\), true\)/);
    assert.match(access, /relationLoaded\('profile'\)/);
    assert.match(controller, /MemberProfileAccess::allows\(\$member, \$viewer\)/);
    assert.match(access, /self::allows\(\$member, \$viewer\) \? route\('members.show'/);
    assert.doesNotMatch(access, /->load\(|->loadMissing\(|::query\(|->profile\(\)/);
});

test('all existing post projections eagerly load validation fields and remove them before serialization', () => {
    for (const file of ['app/Domain/Community/Queries/FeedQuery.php', 'app/Http/Controllers/Community/PostController.php', 'app/Http/Controllers/Account/SavedPostsController.php', 'app/Http/Controllers/PublicSite/HomeController.php']) {
        const source = read(file);
        assert.match(source, /author:id,name,status,is_admin,email_verified_at/);
        assert.match(source, /MemberProfileAccess::decorateAuthor\(\$post->author,/);
        assert.match(source, /\$post->anonymizeForPublic\(\)/);
    }
    assert.match(access, /makeHidden\(\['status', 'is_admin', 'email_verified_at'\]\)/);
    assert.match(access, /setRelation\('profile', null\)/);
});

test('post and comment clients never derive a profile URL from a raw author ID', () => {
    const post = read('resources/js/components/community/PostAuthorLinks.tsx');
    const comments = read('resources/js/components/community/CommunityComment.tsx');
    assert.match(post, /if \(sample \|\| post.is_anonymous\) return undefined/);
    assert.match(post, /return post.author.profile_url \?\? undefined/);
    assert.match(comments, /const authorHref = comment.author.profile_url/);
    assert.doesNotMatch(post + comments, /`\/members\/\$\{/);
    assert.match(read('resources/js/components/dashboard/DashboardFeed.tsx'), /profile_url: post.authorProfileUrl \?\? null/);
});

test('stale member URLs render the shared layout with HTTP 404 without replacing global exception handling', () => {
    assert.match(controller, /User::query\(\)->find\(\$id\)/);
    assert.match(controller, /abort_if\(\$request->expectsJson\(\), 404\)/);
    assert.match(controller, /Inertia::render\('members\/Unavailable'\)->toResponse\(\$request\)->setStatusCode\(404\)/);
    const page = read('resources/js/pages/members/Unavailable.tsx');
    assert.match(page, /<PublicLayout active="\/members">/);
    assert.match(page, /<FeatureEmpty title="Profile unavailable"/);
});
