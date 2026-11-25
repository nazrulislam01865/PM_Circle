import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const component = name => source(`resources/js/components/exam/${name}.tsx`);
const sample = component('PmpPublicSampleExam');
const take = source('resources/js/pages/exam/Take.tsx');
const review = component('PmpSampleReview');
const realReview = source('resources/js/pages/exam/Review.tsx');
const taking = component('PmpExamTakingView');
const dialogs = component('PmpExamDialogs');
const reviewView = component('PmpExamReviewView');
const report = component('PmpExamResultReport');
const result = source('resources/js/pages/exam/Result.tsx');
const css = source('resources/css/pm-pmp-public.css');

test('both modes mount the same complete taking view and dialogs, rather than copying their JSX', () => {
    for (const consumer of [take, sample]) {
        for (const name of ['PmpExamTakingView', 'PmpExamFinishDialog', 'PmpExamCalculator']) assert.ok(consumer.includes(`<${name} `));
        assert.doesNotMatch(consumer, /<PmpExamNavigator|<ExamOptionList|<Dialog\.Content|className="pm-exam-examhead"/);
    }
    for (const name of ['PmpExamNavigator', 'PmpExamQuestionHeading', 'PmpExamQuestionTools', 'ExamOptionList', 'ExamTimeProgress', 'ExamToolGuide']) assert.ok(taking.includes(`<${name}`));
    assert.match(dialogs, /<PmpSubmitReviewSummary/);
    assert.match(dialogs, /<Dialog.Title>Calculator/);
    assert.match(taking, /Previous Marked/);
    assert.match(taking, /Next Marked/);
});

test('sample remains local, scroll-started, unrestricted, and retains single and multi-question completion', () => {
    assert.match(sample, /IntersectionObserver/);
    assert.match(sample, /Math.max\(30, Math.min\(900, sampleDurationSeconds\)\)/);
    assert.match(sample, /Date.now\(\) \+ duration \* 1000/);
    assert.match(sample, /canVisit=\{\(\) => true\}/);
    assert.match(sample, /if \(total === 1\)/);
    assert.match(sample, /Select an answer before checking/);
    assert.match(sample, /finalLabel=\{total === 1 \? 'Check answer' : 'Finish & Review'\}/);
    assert.match(sample, /onConfirm=\{complete\}/);
    assert.match(sample, /finished \? <PmpSampleReview/);
    assert.match(sample, /setAnswers\(\{\}\)/);
    for (const file of [sample, review, taking, dialogs, reviewView, report]) assert.doesNotMatch(file, /fetch\(|router\.visit\(|localStorage\.|\/attempts\/|PmpQuestionAiChat|useExamStart\(/);
    assert.match(take, /persist\(id, next\)/);
    assert.match(take, /examSecondsUntilExpiry\(attempt.expiresAt/);
    assert.match(take, /canVisit=\{canVisit\}/);
});

test('review and result are single shared views with result-first sample actions and registration-only public AI prompt', () => {
    for (const consumer of [review, realReview]) assert.match(consumer, /<PmpExamReviewView/);
    for (const name of ['ExamStatus', 'ExamOptionList', 'PmpReviewExplanation']) assert.ok(reviewView.includes(`<${name}`));
    assert.match(reviewView, /setFilter\(item.value\); setPosition\(0\);/);
    assert.match(realReview, /<PmpQuestionAiChat/);
    assert.match(review, /useState<'review' \| 'result'>\('result'\)/);
    for (const consumer of [review, result]) assert.match(consumer, /<PmpExamResultReport/);
    assert.match(review, /total: questions.length, correct, answered/);
    assert.match(review, /openReview\('missed'\)/);
    assert.match(review, /openReview\('all'\)/);
    assert.match(review, /onClick=\{\(\) => setView\('result'\)\}/);
    assert.match(review, /onClick=\{onTryAgain\}/);
    assert.match(review, /<SampleAiRegistrationPrompt key=\{question.id\} metadata=\{metadata\}/);
    assert.match(review, /Ask AI About This Answer/);
    assert.match(review, /aria-expanded=\{open\} aria-controls=\{panelId\}/);
    assert.match(review, /open && <div id=\{panelId\} className="pm-review-ai-chat"/);
    assert.match(review, /<Link href="\/register"/);
    assert.match(review, /<Link href="\/login"/);
    assert.match(review, /eligible Plus or Pro membership/);
    assert.doesNotMatch(review, /<textarea|<form|requestJson|\/ai\/requests|PmpQuestionAiChat/);
    assert.match(report, /<OverallPerformance/);
    assert.match(report, /<DomainPerformance/);
    assert.match(report, /<PracticeSummary/);
});

test('sample uses existing admin-selected active question settings and only layout-specific CSS', () => {
    const controller = source('app/Http/Controllers/PublicSite/PmpPublicPageController.php');
    assert.match(controller, /whereIn\('id', \$sampleIds\)->where\('is_active', true\)/);
    assert.match(controller, /'readinessThresholds' => array_intersect_key/);
    assert.match(controller, /'sampleDurationSeconds' => \$settings\['sample_duration_seconds'\]/);
    assert.match(css, /@container sample-exam/);
    assert.match(css, /h2:not\(:where\(\.pm-exam h2\)\)/);
    assert.doesNotMatch(css, /\.pm-pmp-public-sample-review \.pm-exam-review-top h2/);
});
