import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, statSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const home = read('resources/js/pages/public/Home.tsx');
const benefits = read('resources/js/components/home/HomeAiFeatures.tsx');
const css = read('resources/css/pm-home-ai.css');
const layout = read('resources/css/pm-home.css');
const tokens = read('resources/css/pm-design-tokens.css');
const guide = read('docs/PM_CIRCLE_UI_STYLE_GUIDE_APPROVED_2026_11_09.html');

const images = [
    'exam-question-review.webp',
    'daily-challenge-feedback.webp',
    'community-admin-review.webp',
    'learn-with-ai.webp',
];

function cssVariables(source) {
    const rootBlock = source.match(/:root\s*\{([^}]*)\}/);
    assert.ok(rootBlock, 'missing canonical :root declaration');
    return new Map([...rootBlock[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)]
        .map(([, name, value]) => [name, value.trim()]));
}

test('public homepage V2 follows approved prototype section order', () => {
    const exams = home.indexOf('<HomeCertification ');
    const courses = home.indexOf('<HomeCourses ');
    const community = home.indexOf('<HomeCommunity ');
    const ai = home.indexOf('<HomeAiPractice ');
    const resume = home.indexOf('<HomeResume ');
    const events = home.indexOf('<HomeEvents ');
    assert.ok(exams >= 0 && courses > exams && community > courses && ai > community && resume > ai && events > resume);
    assert.equal(home.split('<HomeAiPractice ').length - 1, 1);
});

test('four cards retain the approved prototype defaults and are admin editable', () => {
    const defaults = read('config/home-ai-features.php');
    for (const phrase of [
        'How AI helps you on PM Circle', 'Explore Plus plans',
        'Exam Simulator', 'Ask AI about any question',
        'Daily Challenge', 'A new AI challenge every day',
        'Community Feed', 'AI helps keep the feed safe',
        'Learn & Practice', 'Learn with AI support',
    ]) assert.ok(defaults.includes(phrase), phrase);
    assert.match(benefits, /href=\{content.button_url\}/);
    assert.match(read('resources/js/pages/admin/Homepage.tsx'), /selected === 'ai_features'/);
});

test('local WebP images remain lazy, accessible, and bandwidth efficient', () => {
    for (const file of images) {
        assert.ok(read('config/home-ai-features.php').includes(file));
        const path = new URL(`public/images/home/ai-features/${file}`, root);
        const bytes = statSync(path).size;
        assert.ok(bytes > 0 && bytes < 80_000, `${file}: ${bytes} bytes`);
    }
    assert.match(benefits, /loading="lazy"/);
    assert.match(benefits, /decoding="async"/);
    assert.match(benefits, /alt=\{benefit.alt\}/);
    assert.doesNotMatch(benefits, /fetch\(|axios\.|useEffect\(|useState\(/);
});

test('reuses existing button, icon scale, and homepage width instead of alternate controls', () => {
    assert.match(benefits, /className="pm-home-ai-section pm-home-wide-container"/);
    assert.match(benefits, /className="pm-button pm-home-ai-cta"/);
    assert.match(layout, /:is\(\.pm-pathway-container, \.pm-home-wide-container\)/);
    assert.match(css, /\.pm-home-ai-cta svg,[\s\S]*?width: var\(--icon\)/);
    assert.doesNotMatch(css, /\.pm-home-ai-cta\s*\{[^}]*\b(?:background|border-radius|font-size|font-weight|min-height|padding|color):/);
    for (const forbidden of ['--pm-home-ai-cta:', '--pm-home-ai-cta-hover:', '--pm-home-ai-card-border:']) {
        assert.ok(!tokens.includes(forbidden), `redundant control token: ${forbidden}`);
    }
});

test('typography, spacing, colors, border, and card radius reference canonical guide tokens', () => {
    for (const [selector, rules] of [
        [/\.pm-home-ai-heading h2/, ['--text-h2', '--line-h2', '--bold']],
        [/\.pm-home-ai-category\s*\{/, ['--text-h4', '--line-h4', '--semibold']],
        [/\.pm-home-ai-card-content h3/, ['--text-h3', '--line-h3', '--semibold']],
        [/\.pm-home-ai-card-content p/, ['--text-body', '--line-body', '--regular']],
        [/\.pm-home-ai-card\s*\{/, ['--border', '--radius-card', '--surface']],
    ]) {
        assert.match(css, selector);
        for (const token of rules) assert.ok(css.includes(`var(${token})`), token);
    }
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'No section-local color literals');
    assert.doesNotMatch(css, /font-size:\s*[0-9]/, 'No section-local font-size literals');
    assert.match(css, /box-shadow:\s*var\(--pm-home-ai-card-shadow\)/);
    assert.ok(tokens.includes('--pm-home-ai-card-shadow:'));
    assert.match(css, /gap:\s*var\(--s4\)/);
    assert.match(css, /padding:\s*var\(--s5\)/);
    assert.match(css, /@media \(max-width: 64rem\)/);
    assert.match(css, /@media \(max-width: 42rem\)/);
    assert.match(css, /repeat\(4, minmax\(0, 1fr\)\)/);
    assert.match(css, /repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(read('resources/css/app.css'), /@import '\.\/pm-home-ai.css';/);
});

test('relevant canonical global tokens match the uploaded authoritative UI style guide', () => {
    const approved = cssVariables(guide);
    const actual = cssVariables(tokens);
    for (const token of [
        '--font-ui', '--text-ui',
        '--regular', '--semibold', '--bold', '--s2', '--s3', '--s4', '--s5', '--s6',
        '--s8', '--s10', '--radius-control', '--radius-card', '--control-height',
        '--control-touch', '--icon', '--ink', '--surface', '--border', '--blue',
        '--blue-hover', '--focus',
    ]) {
        if (token === '--font-ui') assert.ok(actual.get(token)?.startsWith('\"Inter\"'), 'sitewide Inter font');
        else assert.equal(actual.get(token), approved.get(token), token);
    }
    // The newest HTML guide also supersedes legacy H1-H4 and meta typography.
    for (const [token, expected] of Object.entries({
        '--text-body': '1rem', '--line-body': '1.6',
        '--text-h1': 'var(--pm-guide-text-h1)', '--line-h1': 'var(--pm-guide-line-h1)',
        '--text-h2': 'var(--pm-guide-text-h2)', '--line-h2': 'var(--pm-guide-line-h2)',
        '--text-h3': 'var(--pm-guide-text-h3)', '--line-h3': 'var(--pm-guide-line-h3)',
        '--text-h4': 'var(--pm-guide-text-h4)', '--line-h4': 'var(--pm-guide-line-h4)',
        '--line-ui': '1.35',
    })) assert.equal(actual.get(token), expected, token);
    // The existing homepage/header layout intentionally retains its approved dimensions.
});
