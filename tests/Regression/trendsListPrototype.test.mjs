import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { trendArticleHref } from '../../resources/js/data/pm-trends.ts';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const reports = JSON.parse(read('database/data/legacy-trend-reports.json'));
const sampleTrendReports = reports.filter(report => report.listed);
const trendArticles = reports.filter(report => !report.listed);
const page = read('resources/js/pages/trends/Index.tsx');
const css = read('resources/css/pm-trends-public.css');
const tokens = read('resources/css/pm-design-tokens.css');

test('approved public list has the three exact report titles, topics, date and local photos', () => {
    assert.deepEqual(sampleTrendReports.map(report => report.category), ['AI at Work', 'Career Paths', 'Skills']);
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

test('search and topic filters are server-backed and use bounded pages and shared dropdown', () => {
    const controller = read('app/Http/Controllers/PublicSite/ContentPagesController.php');
    const domain = read('app/Domain/Trends/TrendReports.php');
    assert.match(controller, /paginate\(12, TrendReports::columns\(\)\)/);
    assert.match(controller, /where\('category', \$topic\)/);
    assert.match(controller, /ESCAPE/);
    assert.match(domain, /where\('status', 'published'\)/);
    assert.match(domain, /where\('listed', true\)/);
    assert.match(page, /<PMDropdown/);
    assert.match(page, /<LinkedPagination/);
    assert.doesNotMatch(page, /Saved reports only|AI-generated sample reports for the PM Circle prototype|localStorage|sampleTrendReports/);
});

test('uses the shared homepage layout, banner, form controls, images and accessible result count', () => {
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout active="\/pm-trends" banner=\{\{[^\n]*\}\}>/);
    assert.match(page, /pm-terms-banner/);
    assert.match(page, /listing.searchPlaceholder/);
    assert.match(page, /role="status"/);
    const shared = read('resources/js/components/trends/TrendShared.tsx');
    assert.match(shared, /<HomePhoto photo=\{fallback\} source=\{article.thumbnail\}/);
    assert.match(shared, /rel="noopener noreferrer"/);
    assert.match(read('routes/web.php'), /Route::get\('\/pm-trends', \[.*ContentPagesController::class, 'trends'\]\)/);
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
