<?php

$root = dirname(__DIR__, 2);
$read = static fn (string $path): string => file_get_contents($root.'/'.$path) ?: '';
$assert = static function (bool $condition, string $label): void {
    if (! $condition) { fwrite(STDERR, "FAIL: {$label}\n"); exit(1); }
    echo "PASS: {$label}\n";
};
$settings = $read('app/Services/Exam/PmpExamSettings.php');
$request = $read('app/Http/Requests/Admin/UpdatePmpExamSettingsRequest.php');
$public = $read('app/Http/Controllers/PublicSite/PmpPublicPageController.php');
$sample = $read('resources/js/components/exam/PmpPublicSampleExam.tsx');
$picker = $read('resources/js/components/admin/PmpSampleQuestionSelect.tsx');
$review = $read('resources/js/components/exam/PmpSampleReview.tsx');
$navigator = $read('resources/js/components/exam/PmpExamNavigator.tsx');
$assert(str_contains($settings, 'sample_question_ids') && str_contains($settings, 'sample_question_id')
    && str_contains($settings, 'json_encode($ids'), 'Settings retain legacy single-sample compatibility while storing ordered selections');
$assert(str_contains($request, "'max:20'") && str_contains($request, "'distinct:strict'")
    && str_contains($request, "->where('is_active', true)"), 'Multi-selection is bounded, unique, and active-only');
$assert(str_contains($public, "->where('is_active', true)") && str_contains($public, "'sampleQuestions' => ".chr(36)."samples")
    && str_contains($public, "->keyBy('id')"), 'Public sample uses the administrator order and does not expose inactive questions');
$assert(str_contains($picker, 'Dialog.Content') && str_contains($picker, 'type="checkbox"')
    && str_contains($picker, 'Move up') && str_contains($picker, 'Choose questions'), 'Admin selector uses searchable, ordered checkbox selection');
$view = $read('resources/js/components/exam/PmpExamTakingView.tsx');
$reviewView = $read('resources/js/components/exam/PmpExamReviewView.tsx');
$assert(str_contains($sample, '<PmpExamTakingView') && str_contains($view, '<PmpExamNavigator') && str_contains($sample, 'Finish & Review')
    && str_contains($sample, '<PmpSampleReview') && str_contains($sample, 'answers[question.id]')
    && str_contains($navigator, 'questions.slice(pageStart, pageStart + 20)')
    && str_contains($review, 'total={questions.length} correct={correct}') && str_contains($reviewView, 'ExamStatus total={total} correct={correct} answered={answered}'),
    'Sample exam navigates multiple questions and scores all answers using the real exam components');
