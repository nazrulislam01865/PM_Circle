import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const show = read('resources/js/pages/members/Show.tsx');
const controller = read('app/Http/Controllers/Members/MemberDirectoryController.php');
const overview = read('app/Domain/Identity/Services/MemberProfileOverview.php');
const feed = read('app/Domain/Community/Queries/FeedQuery.php');
test('member view reuses My Profile overview and post cards without owner edit handlers', () => {
    assert.match(show, /<ProfileHeroPhoto name=\{profile.name\} src=\{profile.avatar_path\}/);
    assert.match(show, /<ProfileOverviewSections profile=\{profile\} visibleFields=\{overview.visibleFields\}/);
    assert.match(show, /<PostCard key=\{post.id\} post=\{post\}/);
    assert.match(show, /<AdjacentPagination previous=\{posts.previous_cursor/);
    assert.match(show, /isOwnProfile \? <Link href="\/settings\/profile"/);
    assert.doesNotMatch(show, /<ProfileEditorPrototype|<ResumeImportsTab|<ProfilePrivacyTab/);
});
test('member profile server projection filters sections and excludes private account payloads', () => {
    assert.match(controller, /MemberProfileAccess::allows\(\$member, \$viewer\)/);
    assert.match(overview, /ProfileFieldPrivacy::visible\(\$profile, \$key, \$viewer, \$member->id\)/);
    assert.match(overview, /\$includeSections && \$can\(\$privacy\)/);
    assert.match(overview, /Arr::only\(\$row, \$fields\)/);
    assert.doesNotMatch(overview, /'email' =>|'phone' =>|'resume' =>|'work_sample_path'/);
});
test('author-specific cursor filters are bound to the requested author and exclude anonymous posts', () => {
    assert.match(feed, /\$scope\[\] = \$authorId/);
    assert.match(feed, /where\('posts.author_id', \$authorId\)->where\('posts.is_anonymous', false\)/);
    assert.match(feed, /->cursorPaginate\(/);
    assert.match(controller, /\$feed->page\('all', 'All', null, \$viewer, .*\$member->id\)/);
    assert.doesNotMatch(controller, /limit\(8\)/);
});

test('member profile has one full-width column in both tabs and no duplicate heading or right rail', () => {
    assert.match(show, /className="pm-profile-main-col min-w-0 w-full"/);
    assert.match(show, /className="pm-hero-name">\{profile.name\}/);
    assert.doesNotMatch(show, /pm-profile-overview-grid|pm-profile-side-col|<aside|pm-profile-top-titles|Professional profile and community contributions|Recent posts|View overview|pm-feature-privacy/);
    assert.match(show, /className="pm-profile-top-actions ml-auto flex-wrap"/);
    assert.match(show, /canFollow && <button/);
});
