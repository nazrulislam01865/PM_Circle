<?php

// Dependency-free checks for shared countdown progress and footer coverage.
$root = dirname(__DIR__, 2);
$read = static fn (string $path): string => file_get_contents($root.'/'.$path) ?: '';
$assert = static function (bool $condition, string $label): void {
    if (! $condition) {
        fwrite(STDERR, "FAIL: {$label}\n");
        exit(1);
    }
    echo "PASS: {$label}\n";
};

$controller = $read('app/Http/Controllers/Exam/PmpExamController.php');
$assert(str_contains($controller, 'Carbon::parse($record->started_at)->diffInSeconds(Carbon::parse($record->expires_at), true)'),
    'Controller sends full positive attempt duration (start to expiry, absolute), not negative Carbon 3 difference');
$paid = $read('resources/js/pages/exam/Take.tsx');
$sample = $read('resources/js/components/exam/PmpPublicSampleExam.tsx');
$component = $read('resources/js/components/exam/ExamTimeProgress.tsx');
$assert(str_contains($controller, "'serverNow' => now()->toIso8601String()")
    && str_contains($paid, 'examServerClockOffset(attempt.serverNow, Date.now())')
    && str_contains($paid, 'examSecondsUntilExpiry(attempt.expiresAt, Date.now(), serverClockOffset)'),
    'Exam timer and progress bar use server-synchronized seconds, accounting for device clock skew');
$math = $read('resources/js/components/exam/examCountdownMath.ts');
$policy = $read('resources/js/components/pm/siteFooterVisibility.ts');
$assert(str_contains($paid, '<ExamTimeProgress secondsRemaining={seconds} durationSeconds={duration}/>')
    && str_contains($sample, '<ExamTimeProgress secondsRemaining={seconds} durationSeconds={pmpPublicSampleDurationSeconds}'),
    'Paid and public exams use one time-remaining progress component');
$assert(str_contains($paid, 'Math.abs(attempt.durationSeconds)'),
    'Paid exam normalizes legacy negative duration before computing time remaining percentage');
$assert(str_contains($paid, 'useMemo(') && str_contains($paid, '[attempt.id, attempt.durationSeconds, attempt.expiresAt, serverClockOffset]'),
    'Paid exam progress uses a stable initial duration');
$assert(str_contains($math, 'remainingTimeSeconds') && str_contains($math, 'remainingTimePercentage')
    && str_contains($component, 'aria-valuenow={remaining}'),
    'Countdown and accessible progress use the same clamped remaining value');
$assert(! str_contains($paid, 'duration - seconds') && ! str_contains($sample, 'pmpPublicSampleDurationSeconds - seconds'),
    'Elapsed-time fill calculation removed from both exam views');
$assert(str_contains($policy, 'return true;') && ! str_contains($policy, 'exams|exam-simulator|simulators'),
    'Shared footer no longer hides entire simulator route families');
$assert(str_contains($read('resources/js/layouts/pm/MemberDashboardLayout.tsx'), '<SiteFooter')
    && str_contains($read('resources/js/layouts/pm/PublicLayout.tsx'), '<SiteFooter'),
    'Public and member content pages reuse existing site footer');
