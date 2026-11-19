<?php

// The production app requires mbstring; ASCII fallbacks make this source check portable.
if (! function_exists('mb_strlen')) { function mb_strlen(string $s): int { return strlen($s); } }
if (! function_exists('mb_strtolower')) { function mb_strtolower(string $s): string { return strtolower($s); } }
if (! function_exists('mb_substr')) { function mb_substr(string $s, int $start, ?int $len = null): string { return substr($s, $start, $len); } }
require_once __DIR__.'/../../app/Services/Resume/ResumeImportShape.php';

use App\Services\Resume\ResumeImportShape;

$contract = new ResumeImportShape();
$schema = $contract->jsonSchema();
assert(($schema['properties']['fields']['properties']['experiences']['items']['additionalProperties'] ?? null) === false);
assert(in_array('career', $schema['properties']['fields']['required'], true));
assert(count($schema['properties']['fields']['properties']) === count(ResumeImportShape::LABELS));

$normalized = $contract->normalize(['fields' => [
    'name' => 'Sample Member', 'phone' => '+880 1712 345678', 'skills' => ['Agile', 'agile', 'PMO'],
    'experiences' => [
        ['job_title' => 'Project Manager', 'organization' => 'Example', 'start_month' => '2022-07', 'is_current' => true, 'end_month' => '2024-02'],
        ['job_title' => 'Unknown tenure', 'organization' => 'Example', 'start_month' => '2020', 'is_current' => false],
    ],
    'certifications' => [
        ['name' => 'PMP', 'issuing_organization' => '', 'credential_number' => 'fake'],
        ['name' => 'Scrum', 'issuing_organization' => 'Example Body', 'verification_url' => 'javascript:alert(1)', 'does_not_expire' => true],
    ],
    'courses' => [['name' => 'Safety training', 'completion_month' => '2023-99']],
    'career' => ['target_roles' => 'Program Manager', 'availability' => 'open'],
    'injected_admin_access' => 'yes',
]]);
$fields = $normalized['fields'];
assert(! isset($fields['injected_admin_access']));
assert(count($fields['skills']) === 2);
assert(count($fields['experiences']) === 1);
assert($fields['experiences'][0]['end_month'] === '');
assert(count($fields['certifications']) === 1);
assert($fields['certifications'][0]['verification_url'] === '');
assert($fields['courses'][0]['completion_month'] === '');
assert(! isset($fields['career']['availability']));
assert(($fields['career']['target_roles'] ?? '') === 'Program Manager');

echo "CV import shape regression checks passed.\n";
