import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const page = read('resources/js/pages/public/AiResumeAssistant.tsx');
const css = read('resources/css/pm-ai-resume-public.css');
const tokens = read('resources/css/pm-design-tokens.css');

test('resume preview uses a static public route and the same homepage layout', () => {
    assert.match(read('routes/web.php'), /Route::inertia\('\/ai-resume-assistant', 'public\/AiResumeAssistant'\)->name\('ai-resume-assistant'\)/);
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout banner=\{\{[^\n]*\}\}>/);
    assert.match(page, /pm-terms-banner/);
    assert.match(page, /href="\/#pm-v2-ai">AI Tools/);
    assert.doesNotMatch(page, /fetch\(|axios\.|useEffect\(|router\.get\(|dangerouslySetInnerHTML/);
});
test('prototype study values, five steps, four examples and safety note are preserved', () => {
    assert.deepEqual([...page.matchAll(/value: '([^']+)'/g)].map(m=>m[1]), ['8% more likely','7.4 seconds']);
    assert.deepEqual([...page.matchAll(/title: '([^']+)', text:/g)].map(m=>m[1]), ['Import your résumé','Edit your draft','Review AI suggestions','Save your résumé and profile','Export a copy']);
    assert.equal([...page.matchAll(/original: '/g)].length,4);
    assert.match(page, /PM Circle’s hiring outcomes are yet to be measured/);
    assert.match(page, /Before using a suggestion, verify any added detail, responsibility, or number against your own experience/);
    assert.match(page, /rel="noopener noreferrer"/);
});
test('homepage CTA is connected while preserving admin custom destinations', () => {
    const home = read('resources/js/components/home/v2/HomeAiResume.tsx');
    assert.match(home, /href=\{content.button_url\}/);
    assert.match(read('config/homepage-v2.php'), /'button_url' => '\/ai-resume-assistant'/);
    assert.match(read('app/Support/Home/HomepagePresentation.php'), /careers\.resume\.button_url/);
    assert.match(read('resources/js/pages/admin/Homepage.tsx'), /'\/ai-resume-assistant'/);
    assert.match(page, /href="\/register" className="pm-guide-button"/);
    assert.match(page, /href="\/login" className="pm-guide-button is-outline"/);
    assert.match(page, /href="\/settings\/profile\?tab=imports"/);
});
test('all public resume styling uses existing typography and palette tokens and unique class names', () => {
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|font-size:\s*(?:[0-9.]|clamp\()/);
    for (const [,token] of css.matchAll(/var\((--[\w-]+)/g)) assert.ok(tokens.includes(`${token}:`),token);
    assert.doesNotMatch(css,/\.pm-resume-(?:step|review)\b/);
    assert.match(css,/font: var\(--regular\) var\(--pm-guide-text-body\)\/var\(--pm-guide-line-body\) var\(--pm-guide-font\)/);
    assert.match(css, /@media \(max-width: 40\.625rem\)/);
    assert.match(page, /import '\.\.\/\.\.\/\.\.\/css\/pm-ai-resume-public\.css'/);
});
test('all six illustrations are local and reuse the shared image fallback', () => {
    assert.match(page, /import \{ HomePhoto \}/);
    for(const file of ['resume/experience.webp','resume/import.webp','home/prototype/tutor.webp','home/prototype/review.webp','home/prototype/leader.webp','home/prototype/foundations.webp']) {
        assert.ok(existsSync(new URL(`../../public/images/${file}`, import.meta.url)),file);
    }
});


test('public resume editorial typography uses the compact prototype roles rather than chart metrics', () => {
    assert.match(tokens, /--pm-guide-editorial-stat: 1\.75rem;/);
    assert.match(tokens, /--pm-guide-editorial-heading: 1\.625rem;/);
    assert.match(tokens, /--pm-guide-editorial-font-optical-sizing: none;/);
    assert.match(css, /font-optical-sizing: var\(--pm-guide-editorial-font-optical-sizing\)/);
    assert.match(css, /\.pm-public-resume-stat \{[^}]*font-size: var\(--pm-guide-editorial-stat\)/);
    assert.doesNotMatch(css, /var\(--text-stat\)/);
    assert.match(css, /\.pm-public-resume-page h2 \{[^}]*letter-spacing: var\(--pm-guide-editorial-heading-tracking\)/);
});

test('prototype panel, accent and rewrite colors are centralized and opt in to the resume preview only', () => {
    assert.match(tokens, /--pm-guide-editorial-accent: #124d88;/);
    assert.match(tokens, /--pm-guide-editorial-surface: var\(--pm-tone-eff6ff\);/);
    assert.match(tokens, /--pm-tone-eff6ff: #eff6ff;/);
    assert.match(tokens, /--pm-guide-editorial-success-surface: #eaf7ee;/);
    assert.match(tokens, /--pm-guide-editorial-success-border: #d6ecdd;/);
    for (const name of ['feature', 'original', 'cta']) {
        assert.match(css, new RegExp(`\\.pm-public-resume-${name} \\{[^}]*background: var\\(--pm-guide-editorial-surface\\)`));
    }
    assert.match(css, /\.pm-public-resume-rewrite \{[^}]*background: var\(--pm-guide-editorial-success-surface\)/);
    assert.match(css, /\.pm-public-resume-page \.pm-public-resume-study a:not\([^}]+color: var\(--pm-guide-editorial-accent\)/);
});
