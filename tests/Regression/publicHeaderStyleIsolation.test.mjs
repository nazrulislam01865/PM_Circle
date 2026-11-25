import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = name => readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8');

// The guest header was already shared; legacy page-wide Brand selectors caused
// different computed fonts and geometry even when the React markup was identical.
test('pricing Brand overrides are confined to legacy chrome, never the homepage header', () => {
    const css = read('resources/css/pm-comparison.css');
    assert.doesNotMatch(css, /\.pm-pricing-shell\s+\.pm-brand-(?:copy|icon)/);
    assert.match(css, /\.pm-pricing-shell :is\(\.pm-header,\.pm-footer\) \.pm-brand-copy small/);
    assert.doesNotMatch(css, /\.pm-v2-header/);
    assert.match(read('resources/js/pages/public/Pricing.tsx'), /<PublicLayout[^>]*pricingPrototype/);
});

test('original signup typography stays local to onboarding; older homepage chrome cannot override public Brand typography', () => {
    const signup = read('resources/css/pm-signup.css');
    const legacy = read('resources/css/pm-home.css');
    assert.match(signup, /\.pm-signup \.pm-brand-copy strong \{ font-size:var\(--type-h3\); \}/);
    assert.match(signup, /\.pm-signup \.pm-brand-copy small \{ font-size:var\(--type-caption\); \}/);
    assert.match(read('resources/js/layouts/pm/OnboardingLayout.tsx'), /className=\{`pm-signup signup-step-/);
    assert.doesNotMatch(read('resources/js/layouts/pm/PublicLayout.tsx'), /pm-signup/);
    assert.doesNotMatch(legacy, /\.pm-app:has\(\.pm-home\)\s+\.pm-brand-copy/);
});

test('shared header owns the central font and navigation active state', () => {
    const css = read('resources/css/pm-home-v2-layout.css');
    assert.match(css, /\.pm-v2-header\s*\{[^}]*font-family:\s*var\(--font-ui\)/);
    assert.match(css, /\.pm-v2-header \.pm-brand-copy small\s*\{[^}]*font-size:\s*var\(--pm-v2-font-caption\)/);
    assert.match(css, /\.pm-v2-header-nav > a\[aria-current="page"\]/);
    assert.doesNotMatch(read('resources/css/pm-trends-public.css'), /\.pm-v2-header/);
    assert.doesNotMatch(read('resources/js/components/home/v2/HomeHeader.tsx'), /help-center|Help Cent(?:re|er)/i);
});
