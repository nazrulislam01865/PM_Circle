import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const dialog = read('resources/js/components/rewards/RewardOfferDialog.tsx');
const layout = read('resources/js/layouts/pm/PublicLayout.tsx');
const bar = read('resources/js/components/home/v2/HomeHero.tsx');
const home = read('resources/js/components/home/v2/HomeLearning.tsx');
const catalog = read('resources/js/components/exam/SimulatorCatalog.tsx');
const tokens = read('resources/css/pm-design-tokens.css');
const css = read('resources/css/pm-reward-offer-dialog.css');

test('one reused dialog opens from the offer bar and both existing simulator offer cards', () => {
    assert.match(layout, /<RewardOfferProvider discountLabel=\{discountLabel\}/);
    assert.match(layout, /homeOfferLabel \?\? rewardPromotion\?\.discountLabel/);
    assert.match(dialog, /const OfferDialogContext = createContext/);
    assert.match(dialog, /<OfferDialogContext\.Provider value=\{openOffer\}>/);
    assert.match(bar, /className="pm-v2-offer-link" onClick=\{\(\) => openOffer\?\.\(\)\}/);
    assert.match(home, /See how it works<\/button>/);
    assert.match(home, /className="pm-v2-button" onClick=\{\(\) => openOffer\?\.\(\)\}/);
    assert.match(catalog, /className="pm-sim-action" onClick=\{\(\) => openOffer\?\.\(\)\}/);
    assert.doesNotMatch(home, /<HomeAction href="\/register">See how it works/);
    assert.doesNotMatch(catalog, /<CatalogAction href="\/register">See how it works/);
});

test('modal exactly carries the offer message, four steps and guest/member destinations', () => {
    for (const text of [
        'Get {discountLabel} off your Exam Simulator',
        'Complete your PM Circle profile to unlock a discount code.',
        'Create your free account', 'Register and verify your email.',
        'Complete your profile', 'Fill in the ten required profile details to qualify for the reward.',
        'Find your discount code', 'Copy the discount code from your profile.',
        'Apply it at checkout', 'Enter the code when purchasing a PM Circle Exam Simulator.',
        'Register & complete profile', 'Already a member?', 'Log in',
    ]) assert.ok(dialog.includes(text), `Missing prototype copy: ${text}`);
    assert.match(dialog, /<ol className="pm-reward-offer-steps">/);
    assert.match(dialog, /<Gift \/>/);
    assert.match(dialog, /href=\{isMember \? '\/settings\/profile\?tab=edit' : '\/register'\}/);
    assert.match(dialog, /href="\/login"/);
    assert.doesNotMatch(dialog, /axios\.|fetch\(|router\.post\(|calculateDiscount|coupon\.create/);
});

test('Radix provides keyboard, backdrop and focus behavior; styles use centrally defined design-guide values', () => {
    for (const property of ['DialogPrimitive.Root', 'DialogPrimitive.Portal', 'DialogPrimitive.Overlay', 'DialogPrimitive.Content', 'DialogPrimitive.Close', 'DialogPrimitive.Title', 'DialogPrimitive.Description']) {
        assert.ok(dialog.includes(property), `Expected accessible dialog primitive ${property}`);
    }
    assert.match(dialog, /aria-label="Close discount offer"/);
    assert.match(css, /max-height: calc\(100dvh/);
    assert.match(css, /@media \(max-width: 33\.75rem\)/);
    assert.match(read('resources/css/app.css'), /@import '\.\/pm-reward-offer-dialog\.css';/);
    const vars = [...css.matchAll(/var\((--[a-z\d-]+)/g)].map(match => match[1]);
    for (const variable of vars) assert.ok(tokens.includes(`${variable}:`), `Undefined centralized token ${variable}`);
    assert.doesNotMatch(css, /#[\da-f]{3,8}\b/i);
    assert.doesNotMatch(css, /font-family:\s*['"]?(?:Inter|Arial)/i);
});
