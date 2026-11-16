<?php

/** Dependency-free safeguards for the one-page PMP member workspace. */
$root = dirname(__DIR__, 2);
$files = [
    'resources/js/pages/exam/Index.tsx' => [
        "active === 'overview'", "active === 'performance'", "active === 'history'", "active === 'ai'",
        'PmpOverview', 'PmpPerformance', 'PmpHistory', 'PmpAiUsage', 'role="tabpanel"',
    ],
    'resources/js/components/exam/PmpWorkspacePanels.tsx' => [
        'Target exam date', 'Start Focused Practice',
        'Last 5 completed', 'Exam History', 'AI Usage',
    ],
    'resources/js/pages/exam/Review.tsx' => [
        'Back to Exam History', 'missed', 'unanswered', 'flagged', 'PmpQuestionAiChat',
    ],
    'app/Http/Controllers/Exam/PmpExamController.php' => [
        'updateTargetDate', 'aiHelp', 'where(\'user_id\'', 'DB::transaction',
    ],
    'resources/js/components/exam/PmpQuestionAiChat.tsx' => ['Ask AI About This Answer'],
    'resources/js/components/dashboard/MemberHomeHeader.tsx' => ['PMP Exam Simulator', '/exams/pmp/enter'],
];
foreach ($files as $relative => $fragments) {
    $content = file_get_contents($root.'/'.$relative);
    if ($content === false) {
        fwrite(STDERR, "Missing {$relative}\n");
        exit(1);
    }
    foreach ($fragments as $fragment) {
        if (! str_contains($content, $fragment)) {
            fwrite(STDERR, "Missing '{$fragment}' in {$relative}\n");
            exit(1);
        }
    }
}
// The prototype needs real tabs, not continuous scrolling or hidden anchor stacks.
$index = file_get_contents($root.'/resources/js/pages/exam/Index.tsx');
$panel = file_get_contents($root.'/resources/js/components/exam/PmpWorkspacePanels.tsx');
$header = file_get_contents($root.'/resources/js/components/dashboard/MemberHomeHeader.tsx');
$css = file_get_contents($root.'/resources/css/pm-pmp-workspace.css');
if ($index === false || $panel === false || $header === false || $css === false
    || str_contains($index, 'IntersectionObserver')
    || ! str_contains($index, 'role="tabpanel"')
    || ! str_contains($panel, 'role="tablist"')
    || ! str_contains($panel, 'role="tab"')
    || ! str_contains($css, 'overflow-x: auto')
    || substr_count($header, '>PMP Exam Simulator</Link>') !== 1
    || str_contains($header, '>My Dashboard</Link>')
    || str_contains($header, '>Public PMP page</Link>')) {
    fwrite(STDERR, "Prototype tab navigation contract failed.\n");
    exit(1);
}
// Keep the paid question-taking interface untouched by dashboard work.
$take = file_get_contents($root.'/resources/js/pages/exam/Take.tsx');
if ($take === false || ! str_contains($take, 'attempt.expiresAt')) {
    fwrite(STDERR, "Timed question-taking contract not found.\n");
    exit(1);
}
echo "PMP four-tab dashboard source contract: PASS\n";
