import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const header = readFileSync('resources/js/components/dashboard/MemberHomeHeader.tsx', 'utf8');
const home = readFileSync('app/Http/Controllers/PublicSite/HomeController.php', 'utf8');

test('My Learning is only rendered for onboarded members in the shared dropdown', () => {
    assert.match(header, /\{isMember && <Link href="\/dashboard\/learning"[^\n]*>My Learning<\/Link>\}/);
    assert.doesNotMatch(header, /href=\{isMember \? '\/dashboard\/learning' : '\/learning'\}[^\n]*My Learning/);
});

test('the public home controller sends authenticated members to the existing dashboard route', () => {
    assert.match(home, /if \(\$user && ! \$user->is_admin && \$user->status === 'active'\)\s*\{\s*return to_route\('dashboard'\);/);
    assert.match(home, /return Inertia::render\('public\/Home'/);
});
