import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalog = readFileSync('resources/js/pages/learning/Catalog.tsx', 'utf8');
const publicPage = readFileSync('resources/js/components/learning/PublicCourseCatalog.tsx', 'utf8');
const css = readFileSync('resources/css/pm-learning-public.css', 'utf8');
const tokens = readFileSync('resources/css/pm-design-tokens.css', 'utf8');
const routes = readFileSync('routes/web.php', 'utf8');
const data = readFileSync('app/Domain/Learning/Queries/DemoCourseCatalog.php', 'utf8');

test('public and member Browse courses share the prototype; other member tabs remain available', () => {
    assert.match(catalog, /legacyTab \? <LegacyCatalog key=\{tab\} \{\.\.\.props\} \/> : <PublicCourseCatalog courses=\{props\.courses\} memberView=\{memberView\} settings=\{props\.catalogSettings!\} \/>/);
    for (const tab of ['paths', 'practice', 'exams']) assert.ok(catalog.includes(`tab === '${tab}'`));
    assert.match(readFileSync('app/Http/Controllers/Learning/LearningController.php', 'utf8'), /\$request->query\('tab'\) === 'my-learning'/);
    assert.match(catalog, /router\.visit\(`\$\{catalogRoot\}\?tab=courses`\)/);
    assert.match(publicPage, /<PublicLayout siteLayout homePrototype guideLayout homeOfferLabel=/);
    assert.match(publicPage, /<Head title=\{`\$\{settings.title\} \| PM Circle`\}/);
    assert.match(publicPage, /settings.starting_title/);
    assert.doesNotMatch(publicPage, /How we develop our courses/);
    assert.doesNotMatch(css, /pm-learn-v3-course-note/);
});

test('filters, pagination, three-question result, and empty state are functional', () => {
    assert.match(publicPage, /const PAGE_SIZE = 4/);
    assert.match(publicPage, /const startingQuestions = useMemo\(\(\) => \[/);
    assert.equal((publicPage.match(/prompt: '/g) ?? []).length, 3);
    for (const token of ['Search courses', 'Career level', 'All courses', 'Sort by', 'Clear filters', 'settings.empty_title', 'See recommendation']) assert.ok(publicPage.includes(token), token);
    assert.match(publicPage, /courses\.filter\(course =>/);
    assert.match(publicPage, /setPage\(1\)/);
});

test('published courses use existing DB-backed query, public details and safe asset fallback', () => {
    assert.match(routes, /Route::get\('\/learning', \[LearningController::class, 'index'\]\)/);
    assert.match(data, /LearningCourse::query\(\)->where\('is_published', true\)/);
    assert.match(publicPage, /demoCourseHref\(slug\)/);
    assert.match(publicPage, /`\/dashboard\/learning\/courses\/\$\{encodeURIComponent\(slug\)\}`/);
    assert.match(publicPage, /href=\{courseHref\(recommendation\.slug\)\}/);
    assert.match(publicPage, /const fallback = `\/images\/learning\/course-\$\{course\.thumbnail\}\.webp`/);
    assert.match(publicPage, /src=\{course\.coverUrl \|\| fallback\}/);
    assert.match(publicPage, /onError=\{event =>/);
    assert.match(data, /withAvg/);
    assert.doesNotMatch(publicPage, /sampleMetrics/);
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

test('prototype uses horizontal controls, four equal-height tiles and bounded responsive grids', () => {
    assert.match(publicPage, /<CatalogCourseTile key=\{course.slug\}/);
    for (const id of ['level','topic','access','sort']) assert.ok(publicPage.includes(`<AdminChoice id="pm-learn-${id}"`));
    assert.doesNotMatch(publicPage, /<select\b/);
    assert.match(publicPage, /<MobileFilterPanel[\s\S]*?pm-learn-v3-clear/);
    assert.doesNotMatch(publicPage, /Ratings and learner counts are sample data|pm-learn-v3-result-count/);
    assert.match(css, /\.pm-learn-v3-rows \{ display: grid; grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
    assert.match(css, /\.pm-learn-v3-course \{ display: flex; flex-direction: column/);
    assert.match(css, /\.pm-learn-v3-rows \{[^}]*grid-auto-rows: 1fr/);
    assert.match(css, /@container learning-catalog \(max-width: 53\.125rem\) \{\s*\.pm-learn-v3-rows \{ grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
    assert.match(css, /\.pm-learn-v3-course-metrics \{[^}]*margin-top: auto/);
    assert.match(css, /\.pm-learn-v3-detail-link\.is-outline \{ width: 100%/);
    assert.match(css, /@container learning-catalog \(max-width: 28rem\)/);
    assert.doesNotMatch(css, /(?:font-size|font-weight|font-family):\s*(?:[0-9]|["'])/);
});

test('compact shared course tiles use central roles and the published review metrics', () => {
    assert.match(css, /\.pm-learn-v3-course h3 \{ font-size: var\(--pm-guide-text-h3\)/);
    assert.match(css, /\.pm-learn-v3-course-body > p \{[^}]*font-size: var\(--pm-guide-text-body\)/);
    assert.match(css, /\.pm-learn-v3-detail-link\.is-outline \{[^}]*border-color: var\(--pm-guide-hover-border\)/);
    assert.match(publicPage, /course\.rating\.toFixed\(1\)/);
    assert.match(publicPage, /course\.reviewCount/);
    assert.doesNotMatch(publicPage, /sampleMetrics|learners \(sample\)/);
    assert.doesNotMatch(publicPage, /Ratings and learner counts are sample data|pm-learn-v3-result-count/);
});


test('catalog restores real learner and rating metadata with a truthful empty state', () => {
    assert.match(data, /leftJoinSub\(\$learnerCounts/);
    assert.match(data, /groupBy\('course_slug'\)/);
    assert.match(data, /'learnerCount' => \(int\)/);
    assert.match(publicPage, /course\.learnerCount\.toLocaleString/);
    assert.match(publicPage, /No reviews yet/);
    assert.match(css, /\.pm-learn-v3-catalog-card \{ border-radius: var\(--pm-guide-radius-card\); font-family: var\(--pm-guide-font\)/);
    assert.match(css, /\.pm-learn-v3-catalog-card \.pm-learn-v3-course-image \{ flex: none/);
    assert.match(css, /gap: var\(--pm-guide-card-gap\)/);
});
