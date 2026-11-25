import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { filterTrendReports, reportTopics, sampleTrendReports, trendArticles, trendArticleHref } from '../../resources/js/data/pm-trends.ts';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const page = read('resources/js/pages/trends/Index.tsx');
const css = read('resources/css/pm-trends-public.css');
const tokens = read('resources/css/pm-design-tokens.css');

test('approved public list has the three exact report titles, topics, date and local photos', () => {
    assert.deepEqual(reportTopics, ['AI at Work', 'Career Paths', 'Skills']);
    assert.deepEqual(sampleTrendReports.map(report => report.title), [
        'Using AI for project updates without losing the facts',
        'What to look for in a project coordinator role in Bangladesh',
        'Agile delivery skills you can demonstrate in an interview',
    ]);
    for (const report of sampleTrendReports) {
        assert.equal(report.date, '22 Nov 2026');
        assert.ok(existsSync(new URL(`../../public${report.thumbnail}`, import.meta.url)));
        assert.ok(report.sources?.length);
        assert.equal(trendArticleHref(report.slug), `/pm-trends/${report.slug}`);
    }
    assert.equal(new Set([...trendArticles, ...sampleTrendReports].map(r => r.slug)).size, trendArticles.length + sampleTrendReports.length);
});

test('search, topic and saved filters combine and handle empty results without reading storage unnecessarily', () => {
    const unavailable = () => { throw new Error('Unexpected storage access'); };
    assert.equal(filterTrendReports('', 'All', false, unavailable).length, 3);
    assert.equal(filterTrendReports('  BANGLADESH ', 'All', false, unavailable)[0].category, 'Career Paths');
    assert.equal(filterTrendReports('AI at work', 'All', false, unavailable).length, 1);
    assert.equal(filterTrendReports('interview', 'Skills', false, unavailable).length, 1);
    assert.equal(filterTrendReports('interview', 'Career Paths', false, unavailable).length, 0);
    assert.deepEqual(filterTrendReports('', 'All', true, slug => slug === sampleTrendReports[1].slug), [sampleTrendReports[1]]);
    assert.equal(filterTrendReports('', 'Skills', true, () => false).length, 0);
});

test('uses the shared homepage layout, banner, form controls, images and existing bookmark contract', () => {
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout active="\/pm-trends" banner=\{\{[^\n]*\}\}>/);
    assert.match(page, /pm-terms-banner/);
    assert.match(page, /Search titles or topics/);
    assert.match(page, /Saved reports only/);
    assert.match(page, /window\.localStorage\.getItem\(`pm-trend-bookmark-\$\{slug\}`\)/);
    assert.match(page, /catch \{\s*return false;/);
    assert.match(page, /role="status"/);
    assert.doesNotMatch(page, /fetch\(|axios\.|router\.get\(|dangerouslySetInnerHTML/);
    const shared = read('resources/js/components/trends/TrendShared.tsx');
    assert.match(shared, /<HomePhoto photo=\{fallback\} source=\{article.thumbnail\}/);
    assert.match(shared, /rel="noopener noreferrer"/);
    assert.match(read('resources/js/pages/trends/Show.tsx'), /sampleTrendReports\.find.*\?\? trendArticles\.find/);
    assert.match(read('routes/web.php'), /Route::inertia\('\/pm-trends', 'trends\/Index'\)/);
});

test('page typography, controls and palette consume centralized tokens, with responsive layout isolated to the list', () => {
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|font-size:\s*(?:[0-9.]|clamp\()/);
    for (const [, token] of css.matchAll(/var\((--[\w-]+)/g)) assert.ok(tokens.includes(`${token}:`), token);
    assert.match(css, /font: var\(--regular\) var\(--pm-guide-text-body\)\/var\(--pm-guide-line-body\) var\(--pm-guide-font\)/);
    assert.match(css, /font-optical-sizing: var\(--pm-guide-editorial-font-optical-sizing\)/);
    assert.match(css, /var\(--pm-guide-text-legal-section\)/);
    assert.match(css, /@media \(max-width: 40\.625rem\)/);
    assert.match(page, /pm-guide-control/);
    assert.match(page, /pm-guide-field-label/);
    assert.doesNotMatch(css, /\.pm-trend-card\b|\.pm-trends-article\b|\.pm-careers\b/);
});


test('Trends banner and body share the same public rail without a narrower list override', () => {
    assert.match(page, /className="pm-public-trends-wrap pm-public-trends-list"/);
    assert.match(page, /className="pm-public-trends-wrap"/);
    assert.match(css, /\.pm-public-trends-wrap\s*\{[^}]*width:\s*var\(--pm-v2-container-width\)[^}]*margin-inline:\s*auto/);
    for (const [, declarations] of css.matchAll(/\.pm-public-trends-list\s*\{([^}]+)\}/g)) {
        assert.doesNotMatch(declarations, /(?:^|[;\s])(?:max-|min-)?width\s*:/);
    }
    assert.doesNotMatch(css, /var\(--pm-guide-report-list-width\)/);
});
