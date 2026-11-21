<?php

// Dependency-free guard for the review prototype and pre-submit dialog.
$root = dirname(__DIR__, 2);
$source = static fn (string $path): string => (string) file_get_contents($root.'/'.$path);
$check = static function (bool $condition, string $label): void {
    if (! $condition) {
        fwrite(STDERR, "FAIL: {$label}\n");
        exit(1);
    }
    echo "PASS: {$label}\n";
};

$page = $source('resources/js/pages/exam/Review.tsx');
$explanation = $source('resources/js/components/exam/PmpReviewExplanation.tsx');
$summary = $source('resources/js/components/exam/PmpSubmitReviewSummary.tsx');
$take = $source('resources/js/pages/exam/Take.tsx');
$controller = $source('app/Http/Controllers/Exam/PmpExamController.php');
$styles = $source('resources/css/pm-pmp-review-prototype.css');

$check(str_contains($page, '<ExamPage shell={shell} className="pm-exam-review-page">')
    && str_contains($page, '<ExamStatus total={attempt.total} correct={attempt.correct} answered={answered}/>')
    && str_contains($page, '<PmpReviewExplanation key={question.id} question={question}/>'),
    'Review reuses authenticated member layout, scoring, and modular explanation panel');
$check(str_contains($source('resources/js/components/exam/pmpReviewContent.ts'), "filter === 'missed'")
    && str_contains($source('resources/js/components/exam/pmpReviewContent.ts'), "filter === 'unanswered'")
    && str_contains($source('resources/js/components/exam/pmpReviewContent.ts'), "filter === 'flagged'")
    && str_contains($page, 'setPosition(0)'),
    'Question filtering covers missed/blank/flagged and resets navigation');
$check(str_contains($page, '<ExamOptionList question={question} chosen={responses[question.id]?.choice} readonly reveal/>')
    && str_contains($source('resources/js/components/exam/PmpQuestionAiChat.tsx'), 'Ask AI About This Answer')
    && str_contains($page, "'Single Select'")
    && str_contains($controller, "'code' => \$row->code"),
    'Correct/incorrect styling, AI request, and question code use real saved question data');
$check(str_contains($explanation, "['Explanation', 'Key Takeaway', 'Related Concepts', 'References']")
    && str_contains($explanation, 'role="tablist"')
    && str_contains($explanation, "event.key === 'ArrowRight'")
    && str_contains($explanation, 'aria-labelledby='),
    'All four explanation tabs support keyboard and accessible tab semantics');
$check(str_contains($summary, 'Your timer keeps running while you review.')
    && str_contains($summary, 'Unanswered questions')
    && str_contains($summary, 'Marked for review')
    && str_contains($summary, 'canVisit(index)')
    && str_contains($take, '<PmpSubmitReviewSummary')
    && str_contains($take, 'setConfirmSubmit(true)'),
    'New popup renders summary and interactive questions without changing final confirmation');
$check(str_contains($styles, '.pm-exam-page.pm-exam-review-page')
    && str_contains($styles, '.pm-exam-modal.pm-exam-finish-prototype')
    && str_contains($styles, 'var(--font-ui)')
    && str_contains($styles, 'var(--blue)')
    && str_contains($source('resources/css/app.css'), "@import './pm-pmp-review-prototype.css';"),
    'Review and popup are scoped and use the centralized theme');
$check(str_contains($controller, '$this->authorizeMember($request, $plans)')
    && str_contains($controller, '$this->ownedAttempt($attempt, $request->user()->id)'),
    'Review retains membership and attempt ownership validation');
