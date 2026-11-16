<?php

$root = dirname(__DIR__, 2);
$requirements = [
    'database/migrations/2026_11_16_000004_create_pmp_exam_settings.php' => ['pmp_exam_settings', 'rules_snapshot'],
    'app/Services/Exam/PmpQuestionImporter.php' => ['fgetcsv', 'ZipArchive', 'DOMDocument', 'DB::transaction', 'ValidationException'],
    'app/Http/Controllers/Admin/PmpExamBankController.php' => ['whereJsonContains', 'paginate(20)', 'import(', 'updateSettings('],
    'app/Http/Controllers/Exam/PmpExamController.php' => ['selectQuestionIds', "'rules_snapshot'", "'full_question_count'"],
    'resources/js/pages/admin/PmpQuestionBank.tsx' => ['AdminLayout', 'Import questions', 'Save exam settings'],
];
foreach ($requirements as $file => $terms) {
    $content = @file_get_contents($root.'/'.$file);
    if ($content === false) {
        fwrite(STDERR, "FAIL: Missing {$file}\n");
        exit(1);
    }
    foreach ($terms as $term) {
        if (! str_contains($content, $term)) {
            fwrite(STDERR, "FAIL: {$file} does not contain {$term}\n");
            exit(1);
        }
    }
}
echo "PASS: Admin settings, atomic question import, safe attempt snapshots, and shared management UI are present\n";
