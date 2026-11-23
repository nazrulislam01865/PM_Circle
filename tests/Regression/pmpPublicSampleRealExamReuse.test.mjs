import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const sample = source('resources/js/components/exam/PmpPublicSampleExam.tsx');
const take = source('resources/js/pages/exam/Take.tsx');
const review = source('resources/js/components/exam/PmpSampleReview.tsx');
const realReview = source('resources/js/pages/exam/Review.tsx');
const css = source('resources/css/pm-pmp-public.css');

test('paid and sample question UI consume one navigator and one options presentation', () => {
    assert.match(take, /<PmpExamNavigator/);
    assert.match(sample, /<PmpExamNavigator/);
    assert.match(take, /<PmpExamQuestionHeading/);
    assert.match(sample, /<PmpExamQuestionHeading/);
    assert.match(take, /<PmpExamQuestionTools/);
    assert.match(sample, /<PmpExamQuestionTools/);
    assert.match(take, /<ExamOptionList/);
    assert.match(sample, /<ExamOptionList/);
    assert.match(sample, /pm-exam-taking pm-pmp-public-exam-preview/);
    assert.match(sample, /ExamTimeProgress/);
    assert.match(sample, /ExamToolGuide/);
});

test('public preview reuses paid submission review UI without paid API requests', () => {
    assert.match(take, /<PmpSubmitReviewSummary/);
    assert.match(sample, /<PmpSubmitReviewSummary/);
    assert.match(sample, /Finish & Review/);
    assert.match(sample, /Select an answer before checking/);
    assert.doesNotMatch(sample, /fetch\(|router\.visit\(|localStorage\.|\/attempts\/|\/answer['"`]|\/submit['"`]/);
});

test('public completed sample uses real review structure, score, filters and all explanation tabs', () => {
    for (const field of ['pm-exam-review-grid', 'pm-exam-review-side', 'pm-exam-review-question',
        'pm-pmp-review-filter-actions', 'ExamStatus', 'ExamOptionList', 'PmpReviewExplanation',
        'matchesReviewFilter', 'setPosition(0)']) {
        assert.ok(review.includes(field), `Public review missing ${field}`);
    }
    for (const field of ['pm-exam-review-grid', 'pm-exam-review-side', 'pm-exam-review-question',
        'pm-pmp-review-filter-actions', 'ExamStatus', 'ExamOptionList', 'PmpReviewExplanation']) {
        assert.ok(realReview.includes(field), `Paid review missing ${field}`);
    }
    assert.match(css, /pm-pmp-public-exam-preview\.pm-exam-taking/);
    assert.match(css, /--pm-guide-s5/);
});
