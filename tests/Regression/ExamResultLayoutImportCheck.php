<?php

// Dependency-free regression for the result page and macOS-safe exam countdown imports.
$root = dirname(__DIR__, 2);
$read = static fn (string $path): string => file_get_contents($root.'/'.$path) ?: '';
$check = static function (bool $condition, string $message): void {
    if (! $condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "PASS: {$message}\n";
};

$result = $read('resources/js/pages/exam/Result.tsx');
$css = $read('resources/css/pm-exam-simulator.css');
$progress = $read('resources/js/components/exam/ExamTimeProgress.tsx');
$math = $read('resources/js/components/exam/examCountdownMath.ts');
$take = $read('resources/js/pages/exam/Take.tsx');
$sample = $read('resources/js/components/exam/PmpPublicSampleExam.tsx');
$nodeTest = $read('tests/Regression/examTimeAndFooter.test.mjs');

$check(str_contains($result, 'className="pm-exam-result-page"')
    && str_contains($result, '<OverallPerformance correct={attempt.correct} total={attempt.total}/>')
    && str_contains($result, '<DomainPerformance domains={domains}/>')
    && str_contains($result, '<PracticeSummary attempt={attempt}/>'),
    'Result preserves live scoring and prototype sections inside the shared member page');
$check(str_contains($css, '.pm-exam-page.pm-exam-result-page')
    && preg_match('/\.pm-exam-page\.pm-exam-result-page\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*0;/s', $css) === 1
    && ! preg_match('/\.pm-exam-page\.pm-exam-result-page\s*\{[^}]*var\(--content-width\)/s', $css)
    && str_contains($css, 'var(--text-h1)')
    && str_contains($css, 'var(--text-h4)'),
    'Result fills the existing member content container with shared typography and normal footer flow');
$check(preg_match('/\.pm-exam-report-scale\s*\{[^}]*padding-top:var\(--s10\)/s', $css) === 1
    && preg_match('/\.pm-exam-report-pointer\s*\{[^}]*height:var\(--s10\);[^}]*justify-content:flex-end/s', $css) === 1
    && preg_match('/\.pm-exam-report-pointer\s+i\s*\{[^}]*border-top:9px/s', $css) === 1
    && str_contains($result, 'className="pm-exam-report-pointer"'),
    'Result label and triangle have a dedicated marker lane above the score bands');
$check(str_contains($result, '<ExamPage shell={shell}')
    && ! str_contains($result, 'Sidebar'),
    'Result uses the existing header layout with no added sidebar');
$check(is_file($root.'/resources/js/components/exam/ExamTimeProgress.tsx')
    && is_file($root.'/resources/js/components/exam/examCountdownMath.ts')
    && ! is_file($root.'/resources/js/components/exam/examTimeProgress.ts'),
    'Countdown component and utility have unique, case-insensitive safe filenames');
$check(str_contains($progress, "from './examCountdownMath'")
    && str_contains($progress, 'export function ExamTimeProgress')
    && str_contains($math, 'export function remainingTimePercentage')
    && str_contains($take, "from '@/components/exam/examCountdownMath'")
    && str_contains($sample, "from './ExamTimeProgress'")
    && str_contains($nodeTest, 'examCountdownMath.ts'),
    'Every exam import and countdown regression points to the correct module');
