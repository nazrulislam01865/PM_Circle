<?php

// Verify that the production Vite manifest, app loader, and review chunk agree.
// Run after deploying the packaged build or after running npm run build.
$root = dirname(__DIR__, 2);
$manifestPath = $root.'/public/build/manifest.json';
$manifest = json_decode((string) file_get_contents($manifestPath), true);
if (! is_array($manifest)) {
    fwrite(STDERR, "FAIL: Invalid Vite manifest.\n");
    exit(1);
}
$keys = [
    'review' => 'resources/js/pages/exam/Review.tsx',
    'app' => 'resources/js/app.tsx',
    'css' => 'resources/css/app.css',
];
$files = [];
foreach ($keys as $label => $entry) {
    $path = $manifest[$entry]['file'] ?? null;
    if (! is_string($path) || ! preg_match('~^assets/[a-zA-Z0-9_.-]+\.(?:js|css)$~', $path)) {
        fwrite(STDERR, "FAIL: Missing/invalid {$label} entry.\n");
        exit(1);
    }
    $full = $root.'/public/build/'.$path;
    if (! is_file($full)) {
        fwrite(STDERR, "FAIL: Manifest points to a missing {$label} asset: {$path}\n");
        exit(1);
    }
    $files[$label] = [$path, (string) file_get_contents($full)];
}
[$reviewPath, $review] = $files['review'];
[$appPath, $app] = $files['app'];
[$cssPath, $css] = $files['css'];
$checks = [
    'App loader imports the manifest review chunk' => str_contains($app, basename($reviewPath)),
    'Compiled review contains exactly one explanation root' => substr_count($review, 'className:`pm-review-explanation`') === 1,
    'Compiled review contains exactly one tab panel' => substr_count($review, 'className:`pm-review-tab-content`') === 1,
    'Compiled review identifies the corrected release' => str_contains($review, 'data-pm-review-single-panel'),
    'Compiled review keeps all four tabs' => str_contains($review, '`Explanation`,`Key Takeaway`,`Related Concepts`,`References`'),
    'Compiled CSS protects against stacked legacy panels' => str_contains($css, '.pm-review-explanation ~ .pm-review-explanation'),
];
foreach ($checks as $name => $ok) {
    echo ($ok ? 'PASS: ' : 'FAIL: ').$name.PHP_EOL;
    if (! $ok) {
        exit(1);
    }
}
echo "Active build: app={$appPath} review={$reviewPath} css={$cssPath}\n";
