import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalog = readFileSync('resources/js/pages/learning/Catalog.tsx', 'utf8');
const publicPage = readFileSync('resources/js/components/learning/PublicCourseCatalog.tsx', 'utf8');
const sharedMetrics = readFileSync('resources/js/components/learning/courseSampleMetrics.ts', 'utf8');
const css = readFileSync('resources/css/pm-learning-public.css', 'utf8');
const tokens = readFileSync('resources/css/pm-design-tokens.css', 'utf8');
const routes = readFileSync('routes/web.php', 'utf8');
const data = readFileSync('app/Domain/Learning/Queries/DemoCourseCatalog.php', 'utf8');

test('public and member Browse courses share the prototype; other member tabs remain available', () => {
    assert.match(catalog, /legacyTab \? <LegacyCatalog key=\{tab\} \{\.\.\.props\} \/> : <PublicCourseCatalog courses=\{props\.courses\} memberView=\{memberView\} \/>/);
    for (const tab of ['paths', 'practice', 'exams']) assert.ok(catalog.includes(`tab === '${tab}'`));
    assert.match(readFileSync('app/Http/Controllers/Learning/LearningController.php', 'utf8'), /\$request->query\('tab'\) === 'my-learning'/);
    assert.match(catalog, /router\.visit\(`\$\{catalogRoot\}\?tab=courses`\)/);
    assert.match(publicPage, /<PublicLayout siteLayout homePrototype guideLayout homeOfferLabel=/);
    assert.match(publicPage, /<Head title="Learn & Practice \| PM Circle"/);
    assert.match(publicPage, /Find Your Starting Point/);
    assert.doesNotMatch(publicPage, /How we develop our courses|PM Circle courses draw on decades|pm-learn-v3-course-note/);
    assert.doesNotMatch(css, /pm-learn-v3-course-note/);
});

test('filters, pagination, three-question result, and empty state are functional', () => {
    assert.match(publicPage, /const PAGE_SIZE = 4/);
    assert.match(publicPage, /const startingQuestions = \[/);
    assert.equal((publicPage.match(/prompt: '/g) ?? []).length, 3);
    for (const token of ['Search courses', 'Career level', 'All courses', 'Sort by', 'Clear filters', 'No matching courses', 'See recommendation']) assert.ok(publicPage.includes(token), token);
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

test('prototype uses horizontal controls, four equal-height tiles and bounded responsive grids', () => {
    assert.match(publicPage, /<CatalogCourseTile key=\{course.slug\}/);
    assert.match(publicPage, /<select id="pm-learn-access"/);
    assert.match(publicPage, /<MobileFilterPanel[\s\S]*?pm-learn-v3-clear/);
    assert.match(publicPage, /Ratings and learner counts are sample data/);
    assert.match(css, /\.pm-learn-v3-rows \{ display: grid; grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
    assert.match(css, /\.pm-learn-v3-course \{ display: flex; flex-direction: column/);
    assert.match(css, /\.pm-learn-v3-rows \{[^}]*grid-auto-rows: 1fr/);
    assert.match(css, /@container learning-catalog \(max-width: 53\.125rem\) \{\s*\.pm-learn-v3-rows \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css, /\.pm-learn-v3-course-metrics \{[^}]*margin-top: auto/);
    assert.match(css, /\.pm-learn-v3-detail-link\.is-outline \{ width: 100%/);
    assert.match(css, /@container learning-catalog \(max-width: 28rem\)/);
    assert.doesNotMatch(css, /(?:font-size|font-weight|font-family):\s*(?:[0-9]|["'])/);
});

test('compact shared course tiles use central roles and the approved illustrative metrics', () => {
    assert.match(css, /\.pm-learn-v3-course h3 \{ font-size: var\(--pm-guide-text-h4\)/);
    assert.match(css, /\.pm-learn-v3-course-body > p \{[^}]*font-size: var\(--pm-guide-text-meta\)/);
    assert.match(css, /\.pm-learn-v3-detail-link\.is-outline \{[^}]*border-color: var\(--pm-guide-hover-border\)/);
    assert.match(sharedMetrics, /'PMP Exam Preparation \(Complete Course\)': \{ rating: '4.9', learners: 1240 \}/);
    assert.match(sharedMetrics, /'Agile & Scrum Fundamentals': \{ rating: '4.8', learners: 986 \}/);
    assert.match(publicPage, /sampleMetrics\[course.title.trim\(\)\]/);
    assert.match(publicPage, /Ratings and learner counts are sample data/);
});
