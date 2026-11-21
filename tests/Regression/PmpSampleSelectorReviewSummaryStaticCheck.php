<?php

$root = dirname(__DIR__, 2);
$read = static fn (string $path): string => file_get_contents($root.'/'.$path);
$check = static function (bool $ok, string $label): void {
    if (! $ok) { fwrite(STDERR, "FAIL: {$label}\n"); exit(1); }
    echo "PASS: {$label}\n";
};
$bank = $read('app/Http/Controllers/Admin/PmpExamBankController.php');
$routes = $read('routes/web.php');
$picker = $read('resources/js/components/admin/PmpSampleQuestionSelect.tsx');
$review = $read('resources/js/components/exam/ExamShared.tsx');
$styles = $read('resources/css/pm-pmp-review-prototype.css');
$check(str_contains($routes, 'sample-options') && str_contains($bank, 'function sampleOptions')
    && str_contains($bank, "->where('is_active', true)") && str_contains($bank, '->limit(20)')
    && str_contains($bank, "'sample_question_ids'"), 'Sample selector searches a bounded set of active exam questions');
$check(str_contains($picker, 'Dialog.Content') && str_contains($picker, 'type="checkbox"')
    && str_contains($picker, 'AbortController') && str_contains($picker, 'value.filter(id => id !== item.id)')
    && str_contains($picker, 'ArrowDown'), 'Sample picker supports bounded search, ordered multi-selection, removal, and keyboard-accessible modal');
$check(str_contains($review, 'pm-exam-summary-row') && str_contains($review, 'correct / total * 100')
    && str_contains($review, "toFixed(1)") && str_contains($review, 'Unanswered')
    && str_contains($styles, 'margin: var(--s3) auto var(--s1)')
    && str_contains($styles, 'grid-template-columns: minmax(0,1fr)'), 'Review Summary uses centered donut and exact count/percentage rows');
