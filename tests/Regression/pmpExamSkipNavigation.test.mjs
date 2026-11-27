import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const take = read('resources/js/pages/exam/Take.tsx');
const header = read('resources/js/components/pm/SiteHeader.tsx');
const taking = read('resources/js/components/exam/PmpExamTakingView.tsx');
const navigator = read('resources/js/components/exam/PmpExamNavigator.tsx');
const summary = read('resources/js/components/exam/PmpSubmitReviewSummary.tsx');
const css = read('resources/css/pm-exam-simulator.css');

test('active exam opts out of promotional header without changing its default elsewhere', () => {
    assert.match(take, /<SiteHeader[^>]*authenticatedMemberNavigation showOffer=\{false\}/);
    assert.match(header, /showOffer = true/);
    assert.match(header, /const label = showOffer \? rewardPromotion\?\.discountLabel : undefined;/);
    assert.match(header, /\{label && <HomeOfferBar/);
    assert.match(header, /label \? <RewardOfferProvider/);
});

test('all issued questions are navigable, even when none have answers', () => {
    const expression = take.match(/const canVisit = \(target: number\) => ([^;]+);/)?.[1];
    assert.ok(expression);
    const canVisit = new Function('questions', `return target => ${expression}`)(Array(100).fill(null));
    for (let i = 0; i < 100; i++) assert.equal(canVisit(i), true);
    for (const i of [-1, 100, 1.5, NaN, Infinity]) assert.equal(canVisit(i), false);
    assert.doesNotMatch(take, /firstUnansweredIndex|lastUnlockedIndex/);
});

test('Next, navigator and review summary use the same visit rule and do not require an answer', () => {
    assert.match(taking, /disabled=\{!canVisit\(index \+ 1\)\} onClick=\{\(\) => goto\(index \+ 1\)\}/);
    assert.match(navigator, /disabled=\{!canVisit\(i\)\} onClick=\{\(\) => onNavigate\(i, marked\)\}/);
    assert.match(summary, /disabled=\{!canVisit\(index\) \|\| submitting\}/);
    assert.doesNotMatch(taking + summary, /Answer this and preceding|Answer earlier questions/);
    const goto = take.slice(take.indexOf('    const goto ='), take.indexOf('    const toggleStrike ='));
    assert.match(goto, /if \(!canVisit\(next\)\) return;/);
    assert.match(goto, /setIndex\(next\)/);
    assert.match(goto, /setNavStart\(Math.floor\(next \/ 20\) \* 20\)/);
    assert.doesNotMatch(goto, /persist\(|updateResponse\(|fetch\(|router\./);
    assert.match(navigator, /total - answeredCount/);
    assert.match(take, /unansweredIndexes=\{questions.flatMap\(\(q, i\) => !responses\[q.id\]\?\.choice \? \[i\] : \[\]\)\}/);
});

test('navigator legend spacing overrides the generic exam paragraph reset using design tokens', () => {
    assert.match(css, /\.pm-exam p \{ margin-top:0; \}/);
    assert.match(css, /\.pm-exam \.pm-exam-nav-key \{[^}]*margin: var\(--s3\) 0 0;/);
});
