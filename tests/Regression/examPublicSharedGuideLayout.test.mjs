import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const browse = read('resources/js/pages/exam/Browse.tsx');
const detail = read('resources/js/pages/exam/Public.tsx');
const shell = read('resources/js/layouts/pm/PublicLayout.tsx');
const catalogCss = read('resources/css/pm-simulator-catalog.css');
const detailCss = read('resources/css/pm-pmp-public.css');
const tokens = read('resources/css/pm-design-tokens.css');
const sections = read('resources/js/components/exam/PmpPublicSections.tsx');
const controller = read('app/Http/Controllers/PublicSite/PmpPublicPageController.php');
const footer = read('resources/js/components/home/v2/HomeFooter.tsx');

test('browse and PMP details reuse one homepage header, footer and guide rail', () => {
    assert.match(browse, /<PublicLayout siteLayout homePrototype guideLayout/);
    assert.match(detail, /<PublicLayout siteLayout homePrototype guideLayout/);
    assert.match(shell, /guideLayout\s*\? ' pm-guide-public-shell'/);
    assert.match(shell, /const showHomeHeader = homePrototype \|\| isGuest/);
    assert.match(shell, /showHomeHeader \? <HomeHeader/);
    assert.match(shell, /variant=\{homePrototype \? 'home' : footerVariant\}/);
    assert.match(catalogCss, /\.pm-home-v2-shell\.pm-guide-public-shell\s*\{/);
    assert.match(catalogCss, /--pm-v2-container-width: min\(var\(--pm-guide-container\)/);
    assert.match(catalogCss, /--pm-v2-footer-bg: var\(--pm-guide-footer\)/);
    assert.match(detailCss, /\.pm-pmp-public-container\s*\{\s*width: min\(var\(--pm-guide-container\)/);
    assert.match(detailCss, /--pm-guide-gutter-mobile/);
    assert.doesNotMatch(footer, /Homepage design mockup|Sample content/);
});

test('PMP sections, admin-controlled footer visibility and multiple sample questions remain in place', () => {
    for (const component of ['PmpPublicHero','PmpPublicBenefits','PmpPublicSampleStudy','PmpPublicPlans','PmpPublicFaq','PmpPublicVideoStories','PmpPublicTestimonials']) {
        assert.ok(detail.includes(`<${component}`), component);
    }
    assert.match(detail, /pmpFooterContent=\{content\.sections\.footer \? content\.footer : undefined\}/);
    assert.match(detail, /hideFooter=\{!content\.sections\.footer\}/);
    assert.match(detail, /sampleQuestions=\{sampleQuestions\}/);
    assert.match(controller, /sampleQuestions' => \$samples/);
    assert.match(sections, /href="\/exam-simulator\/pmp"/);
    assert.match(sections, /href="#sample-question"/);
    assert.match(read('resources/js/components/exam/SimulatorCatalog.tsx'), /href="\/exam-simulator\/pmp\/details" primary/);
});

test('the prototype weight is preserved using the guide static face without changing global Inter', () => {
    assert.match(read('PM_Circle_Design_Guidelines (1).html'), /static fonts, load 400, 600 and 700/);
    assert.match(tokens, /--pm-guide-weight-h1: 750;/);
    assert.match(tokens, /--pm-guide-static-h1-weight: var\(--bold\);/);
    assert.match(catalogCss, /\.pm-sim-banner h1\s*\{[^}]*font-weight: var\(--pm-guide-static-h1-weight\);/s);
    assert.match(detailCss, /\.pm-pmp-public-hero h1\s*\{[^}]*font-weight: var\(--pm-guide-static-h1-weight\);/s);
    assert.match(detailCss, /min-height: var\(--pm-guide-button-height\);/);
});
