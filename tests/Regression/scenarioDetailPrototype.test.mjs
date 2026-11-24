import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const page = read('resources/js/pages/scenarios/Show.tsx');
const story = read('resources/js/components/scenarios/ScenarioStoryContent.tsx');
const aside = read('resources/js/components/scenarios/ScenarioDetailsAside.tsx');
const css = read('resources/css/pm-daily-challenge.css');

test('scenario detail uses isolated, reusable story and context components', () => {
    assert.match(page, /<ScenarioStoryContent scenario=\{scenario\}/);
    assert.match(page, /<ScenarioDetailsAside scenario=\{scenario\} isGuest=\{isGuest\}/);
    assert.match(page, /pm-scenario-detail-page/);
});

test('prototype story sections render server scenario facts, topics, and expiry', () => {
    for (const label of ['The situation', 'What you know', 'Your decision', "TODAY'S SCENARIO", 'Discussion closes on']) {
        assert.ok(story.includes(label), `Missing: ${label}`);
    }
    assert.match(story, /scenario\.situation\.split/);
    assert.match(story, /scenario\.known_facts\.map/);
    assert.match(story, /scenario\.topics\.join/);
    assert.match(story, /scenario\.ai_generated/);
});

test('prototype sidebar reuses its stat row, AI disclosure, and existing community links', () => {
    assert.equal((aside.match(/<ScenarioFactRow /g) ?? []).length, 3);
    for (const label of ['About this scenario', 'How AI feedback works', 'Your perspective belongs here.', 'View assessment criteria', '/register', '/login']) {
        assert.ok(aside.includes(label), `Missing: ${label}`);
    }
});

test('scoped visual rules use centralized tokens and leave actions intact', () => {
    assert.match(css, /\.pm-scenario-detail-layout \.pm-scenario-detail-article/);
    assert.match(css, /\.pm-scenario-detail-info-row/);
    assert.match(css, /var\(--s10\)/);
    assert.match(css, /var\(--blue-soft\)/);
    for (const label of ['<ReactionPicker', 'scenarioShare.share()', '<CommentComposer', 'scenario-responses', 'scenario-submit-card']) {
        assert.ok(page.includes(label), `Existing interaction altered: ${label}`);
    }
});
