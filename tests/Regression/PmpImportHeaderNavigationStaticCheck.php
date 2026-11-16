<?php

$root = dirname(__DIR__, 2);
$contents = static fn (string $name): string => file_get_contents($root.'/'.$name) ?: '';
$mustContain = [
    'app/Http/Controllers/Admin/PmpExamBankController.php' => ["resource_path('templates/pmp-question-import.xlsx')", 'pm-circle-pmp-question-template.xlsx'],
    'app/Http/Requests/Admin/ImportPmpExamQuestionsRequest.php' => ['mimes:csv,txt,xlsx'],
    'app/Services/Exam/PmpQuestionImporter.php' => ["'xlsx' =>", "'csv' =>", 'DB::transaction', 'count($rows) > 1001'],
    'resources/js/pages/admin/PmpQuestionBank.tsx' => ['Download Excel template', 'pm-pmp-import-picker', 'Choose file', '.xlsx,.csv'],
    'resources/js/components/dashboard/MemberHomeHeader.tsx' => ['pm-member-home-nav-home', 'aria-label="Home"', 'Community menu', '>Feed</Link>', '>Members</Link>', 'pm-member-home-utility-submenu', '>Careers</Link>'],
    'resources/css/pm-header-prototype.css' => ['is-navigation-open', 'position: static', 'max-height: calc(100dvh - var(--header-height)'],
    'resources/css/pm-member-shell.css' => ['grid-template-rows: minmax(var(--pm-member-home-header-height), max-content)'],
];
foreach ($mustContain as $file => $needles) {
    $value = $contents($file);
    foreach ($needles as $needle) {
        if (! str_contains($value, $needle)) {
            fwrite(STDERR, "FAIL: {$file} missing {$needle}\n");
            exit(1);
        }
    }
}
if (str_contains($contents('app/Services/Exam/PmpQuestionImporter.php'), "'docx' =>") ||
    str_contains($contents('app/Http/Requests/Admin/ImportPmpExamQuestionsRequest.php'), 'docx')) {
    fwrite(STDERR, "FAIL: DOCX remains enabled as a question import format\n");
    exit(1);
}
if (! is_file($root.'/resources/templates/pmp-question-import.xlsx')) {
    fwrite(STDERR, "FAIL: XLSX template is missing\n");
    exit(1);
}
// Keep the picker and import button in one grid row, with guidance underneath.
$importPage = $contents('resources/js/pages/admin/PmpQuestionBank.tsx');
$importCss = $contents('resources/css/pm-admin.css');
if (! preg_match('/<form onSubmit=\{importQuestions\}[^>]*>\s*<span className="pm-pmp-import-label".*?<div className="pm-pmp-import-picker">.*?<\/div>\s*<button type="submit".*?<\/button>\s*<span id="pmp-import-guidance"/s', $importPage) ||
    ! str_contains($importCss, '.pm-pmp-bank-import > .pm-admin-button { align-self: stretch; }') ||
    ! str_contains($importCss, '.pm-pmp-bank-import > .pm-pmp-import-hint,') ||
    ! str_contains($importCss, '.pm-pmp-bank-import, .pm-pmp-bank-filters { grid-template-columns: minmax(0, 1fr); }')) {
    fwrite(STDERR, "FAIL: PMP import picker and button are not aligned in the same responsive row\n");
    exit(1);
}
echo "PASS: XLSX template, Excel/CSV-only imports, accessible picker and responsive header routes\n";
