import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { trendArticleHref } from '../../resources/js/data/pm-trends.ts';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const reports = JSON.parse(read('database/data/legacy-trend-reports.json'));
const sampleTrendReports = reports.filter(report => report.listed);
const trendArticles = reports.filter(report => !report.listed);
const page = read('resources/js/pages/trends/Show.tsx');
const css = read('resources/css/pm-trends-detail.css');
const tokens = read('resources/css/pm-design-tokens.css');

test('first report retains the approved title, content order, date, metadata and both local images', () => {
    const report = sampleTrendReports[0];
    assert.equal(report.readMinutes, 1);
    assert.equal(report.date, '22 Nov 2026');
    assert.equal(report.intro, '');
    assert.deepEqual(report.sections.map(section => section.title), ['Start with the project record', 'Keep accountability with the project team', '', 'Build an example for your portfolio']);
    assert.match(report.sections[0].text, /approved inputs such as the action log, decision register and the current schedule/);
    assert.match(report.sections[1].text, /Follow your organisation’s rules/);
    assert.match(report.sections[3].text, /Save an anonymised before-and-after example/);
    for (const url of [report.hero, report.sections[2].image]) assert.ok(existsSync(new URL(`../../public${url}`, import.meta.url)));
    assert.equal(report.sources[0].reportTitle, 'Apply AI for Project Management');
});

test('report details use homepage layout, shared banner, controls, photos and the shared full-width article rail', () => {
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout active="\/pm-trends" banner=\{\{[^\n]*\}\}>/);
    assert.match(page, /pm-terms-banner/);
    assert.match(page, /pm-public-trends-wrap pm-report-main/);
    assert.match(page, /pm-guide-button is-outline/);
    assert.match(page, /<HomePhoto photo=\{fallback\}/);
    const readingRule = css.match(/\.pm-report-reading\s*\{([^}]+)\}/)?.[1] ?? '';
    assert.match(readingRule, /width:\s*100%/);
    assert.doesNotMatch(readingRule, /max-width|margin-inline/);
    const sharedCss = read('resources/css/pm-trends-public.css');
    assert.match(sharedCss, /\.pm-public-trends-wrap\s*\{[^}]*width:\s*var\(--pm-v2-container-width\)/);
    assert.match(page, /<div className="pm-public-trends-wrap pm-report-main">\s*<article className="pm-report-reading">/);
    assert.match(css, /aspect-ratio: 2 \/ 1/);
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|font-size:\s*(?:[0-9.]|clamp\()/);
    for (const [, token] of css.matchAll(/var\((--[\w-]+)/g)) assert.ok(tokens.includes(`${token}:`), token);
});

test('existing report URLs and bookmark storage contract are preserved; share failures are handled', () => {
    assert.match(read('app/Http/Controllers/PublicSite/ContentPagesController.php'), /TrendReports::published\(\)->where\('slug', \$slug\)/);
    assert.match(page, /<ReportDetail key=\{article.slug\}/);
    assert.match(page, /window\.localStorage\.setItem\(`pm-trend-bookmark-\$\{slug\}`/);
    assert.match(page, /Could not update saved reports/);
    assert.match(page, /navigator\.share/);
    assert.match(page, /navigator\.clipboard\.writeText/);
    assert.match(page, /AbortError/);
    assert.match(read('app/Http/Controllers/PublicSite/ContentPagesController.php'), /abort_unless\(\$row, 404\)/);
    for (const report of [...sampleTrendReports, ...trendArticles]) assert.equal(trendArticleHref(report.slug), `/pm-trends/${report.slug}`);
});

test('prototype comments are browser-local, bounded, plain-text and gated by the existing sign-in state', () => {
    assert.match(page, /if \(!auth\?\.user\) return/);
    assert.match(page, /Log in to comment/);
    assert.match(page, /Comments you post in this prototype are visible only in this browser/);
    assert.match(page, /maxLength=\{2000\}/);
    assert.match(page, /slice\(-100\)/);
    assert.match(page, /Could not save your comment/);
    assert.match(page, /href="#report-comments"/);
    assert.match(page, /\{comment\.text\}/);
    assert.doesNotMatch(page, /fetch\(|axios\.|router\.post\(/);
    assert.match(page, /settings.relatedTitle/);
    assert.match(read('app/Domain/Trends/TrendReports.php'), /'html_input' => 'strip', 'allow_unsafe_links' => false/);
});
