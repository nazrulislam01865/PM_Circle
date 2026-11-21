<?php

// Dependency-free guard for one question, one explanation component and one active tab.
$root = dirname(__DIR__, 2);
$read = static fn (string $path): string => (string) file_get_contents($root.'/'.$path);
$page = $read('resources/js/pages/exam/Review.tsx');
$component = $read('resources/js/components/exam/PmpReviewExplanation.tsx');
$content = $read('resources/js/components/exam/pmpReviewContent.ts');
$shared = $read('resources/js/components/exam/ExamShared.tsx');
$checks = [
    'Single explanation component in review page' => substr_count($page, '<PmpReviewExplanation ') === 1,
    'Single review panel and active tab content' => substr_count($component, 'className="pm-review-explanation"') === 1
        && substr_count($component, 'className="pm-review-tab-content"') === 1
        && str_contains($component, 'switch (tab)') && str_contains($component, '{renderSelectedContent()}'),
    'All four authored sections preserved' => str_contains($component, "['Explanation', 'Key Takeaway', 'Related Concepts', 'References']")
        && str_contains($component, "case 'Explanation':")
        && str_contains($component, "case 'Key Takeaway':")
        && str_contains($component, "case 'Related Concepts':")
        && str_contains($component, "case 'References':"),
    'One correct rationale and no correct option among wrong rationales' => substr_count($component, 'Why {question.correct} is correct') === 1
        && str_contains($component, 'rationales.filter(item => item.key !== question.correct)'),
    'Only recorded answer key receives correct styling' => str_contains($shared, 'key === question.correct')
        && str_contains($shared, 'const isCorrect = reveal && key === question.correct;'),
    'Unanswered is separate from missed' => str_contains($content, "filter === 'missed'")
        && str_contains($content, "filter === 'unanswered'")
        && str_contains($content, "Boolean(response?.choice) && response?.choice !== question.correct"),
    'Question switch replaces the entire previous review card' => str_contains($page, '<section key={question.id} className="pm-exam-panel pm-exam-review-question"'),
    'Question navigation resets when status filter changes' => str_contains($page, 'setFilter(item.value); setPosition(0);'),
];
foreach ($checks as $name => $success) {
    echo ($success ? 'PASS: ' : 'FAIL: ').$name.PHP_EOL;
    if (! $success) exit(1);
}
