import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalog = readFileSync('resources/js/pages/learning/Catalog.tsx', 'utf8');
const publicPage = readFileSync('resources/js/components/learning/PublicCourseCatalog.tsx', 'utf8');
const css = readFileSync('resources/css/pm-learning-public.css', 'utf8');
const tokens = readFileSync('resources/css/pm-design-tokens.css', 'utf8');
const routes = readFileSync('routes/web.php', 'utf8');
const data = readFileSync('app/Domain/Learning/Queries/DemoCourseCatalog.php', 'utf8');

test('public catalog uses existing homepage shell; member catalog remains available', () => {
    assert.match(catalog, /memberView \? <LegacyCatalog \{\.\.\.props\} \/> : <PublicCourseCatalog courses=\{props\.courses\} \/>/);
    assert.match(publicPage, /<PublicLayout siteLayout homePrototype guideLayout homeOfferLabel=/);
    assert.match(publicPage, /<Head title="Learn & Practice \| PM Circle"/);
    assert.match(publicPage, /Find Your Starting Point/);
    assert.match(publicPage, /How we develop our courses/);
});

test('filters, pagination, three-question result, and empty state are functional', () => {
    assert.match(publicPage, /const PAGE_SIZE = 5/);
    assert.match(publicPage, /const startingQuestions = \[/);
    assert.equal((publicPage.match(/prompt: '/g) ?? []).length, 3);
    for (const token of ['Search courses', 'Career level', 'All courses', 'Sort by', 'Clear filters', 'No matching courses', 'See recommendation']) assert.ok(publicPage.includes(token), token);
    assert.match(publicPage, /courses\.filter\(course =>/);
    assert.match(publicPage, /setPage\(1\)/);
});

test('published courses use existing DB-backed query, public details and safe asset fallback', () => {
    assert.match(routes, /Route::get\('\/learning', \[LearningController::class, 'index'\]\)/);
    assert.match(data, /LearningCourse::query\(\)->where\('is_published', true\)/);
    assert.match(publicPage, /demoCourseHref\(course\.slug\)/);
    assert.match(publicPage, /course\.coverUrl \|\| `\/images\/learning\/course-\$\{course\.thumbnail\}\.webp`/);
    assert.match(publicPage, /sampleMetrics/);
});

test('guide typography, layout rail, colors, buttons and focus are centrally sourced', () => {
    const refs = [...css.matchAll(/var\((--pm-guide-[\w-]+)\)/g)].map(match => match[1]);
    assert.ok(refs.length >= 40);
    for (const variable of refs) assert.ok(tokens.includes(`${variable}:`), `${variable} not centrally defined`);
    assert.match(css, /width: var\(--pm-v2-container-width\)/);
    assert.match(css, /font-size: var\(--pm-guide-text-body\)/);
    assert.match(css, /@media \(max-width: 33\.75rem\)/);
    assert.match(publicPage, /className="pm-guide-button"/);
});
