<?php

namespace App\Services\Resume;

/** The accepted CV-to-profile contract. No output key is ever used as a column name. */
final class ResumeImportShape
{
    public const SCALARS = [
        'name' => 255, 'headline' => 180, 'role' => 80, 'phone' => 32,
        'industry' => 120, 'country' => 120, 'city' => 120, 'about' => 2000,
        'current_organization' => 160, 'tools_software' => 1000, 'delivery_methods' => 500,
    ];

    public const RECORDS = [
        'experiences' => ['job_title', 'organization', 'employment_type', 'location', 'work_arrangement', 'start_month', 'end_month', 'is_current', 'responsibilities', 'achievements'],
        'projects' => ['title', 'role', 'organization', 'industry', 'start_month', 'end_month', 'status', 'scale', 'scope', 'outcomes', 'work_url'],
        'educations' => ['degree', 'institution', 'field_of_study', 'location', 'start_month', 'end_month', 'is_current', 'grade', 'honours'],
        'certifications' => ['name', 'issuing_organization', 'issue_month', 'expiry_month', 'does_not_expire', 'credential_number', 'verification_url'],
        'courses' => ['name', 'provider', 'completion_month', 'hours', 'evidence_url'],
        'awards' => ['name', 'organization', 'award_month', 'details'],
        'publications' => ['title', 'publisher', 'month', 'details', 'url'],
        'volunteering' => ['role', 'organization', 'start_month', 'end_month', 'is_current', 'contribution'],
        'languages' => ['name', 'proficiency'],
        'links' => ['label', 'url'],
    ];

    public const REQUIRED = [
        'experiences' => ['job_title', 'organization', 'start_month'],
        'projects' => ['title', 'role'],
        'educations' => ['degree', 'institution'],
        'certifications' => ['name', 'issuing_organization'],
        'courses' => ['name'], 'awards' => ['name'], 'publications' => ['title'],
        'volunteering' => ['role', 'organization'], 'languages' => ['name'], 'links' => ['label', 'url'],
    ];

    public const CAREER = ['target_roles', 'seniority', 'locations', 'work_arrangement', 'employment_type', 'notice_period'];

    public const LABELS = [
        'name' => 'Full name', 'headline' => 'Professional headline', 'role' => 'Current role',
        'phone' => 'Contact (phone)', 'industry' => 'Industry', 'country' => 'Country', 'city' => 'City',
        'about' => 'About', 'skills' => 'Skills', 'current_organization' => 'Current organisation',
        'tools_software' => 'Tools & software', 'delivery_methods' => 'Delivery methods',
        'experiences' => 'Experience', 'projects' => 'Selected projects', 'educations' => 'Education',
        'certifications' => 'Certifications & licences', 'courses' => 'Courses & professional development',
        'awards' => 'Awards & honours', 'publications' => 'Publications & speaking',
        'volunteering' => 'Volunteering', 'languages' => 'Languages', 'links' => 'Portfolio & links',
        'career' => 'Career preferences',
    ];

    private const MONTHS = ['start_month', 'end_month', 'issue_month', 'expiry_month', 'completion_month', 'award_month', 'month'];
    private const BOOLEAN_FIELDS = ['is_current', 'does_not_expire'];
    private const URL_FIELDS = ['work_url', 'verification_url', 'evidence_url', 'url'];

    private const ENUMS = [
        'employment_type' => ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Temporary', 'Volunteer'],
        'work_arrangement' => ['On-site', 'Remote', 'Hybrid'],
        'status' => ['Planned', 'In progress', 'On hold', 'Completed'],
        'proficiency' => ['Elementary proficiency', 'Limited working proficiency', 'Professional working proficiency', 'Full professional proficiency', 'Native or bilingual'],
    ];

    /** Responses API strict structured-output schema: every property required, unknown keys forbidden. */
    public function jsonSchema(): array
    {
        $properties = [];
        foreach (self::SCALARS as $key => $max) {
            $properties[$key] = ['type' => 'string'];
        }
        $properties['skills'] = ['type' => 'array', 'items' => ['type' => 'string']];
        foreach (self::RECORDS as $section => $columns) {
            $fields = [];
            foreach ($columns as $column) {
                $fields[$column] = ['type' => in_array($column, self::BOOLEAN_FIELDS, true) ? 'boolean' : 'string'];
            }
            $properties[$section] = ['type' => 'array', 'items' => [
                'type' => 'object', 'properties' => $fields,
                'required' => array_keys($fields), 'additionalProperties' => false,
            ]];
        }
        $career = array_fill_keys(self::CAREER, ['type' => 'string']);
        $properties['career'] = ['type' => 'object', 'properties' => $career,
            'required' => array_keys($career), 'additionalProperties' => false];

        return ['type' => 'object', 'properties' => ['fields' => [
            'type' => 'object', 'properties' => $properties,
            'required' => array_keys($properties), 'additionalProperties' => false,
        ]], 'required' => ['fields'], 'additionalProperties' => false];
    }

    public function normalize(array $response): array
    {
        $raw = $response['fields'] ?? null;
        if (! is_array($raw)) {
            throw new \UnexpectedValueException('CV response is missing structured fields.');
        }
        $fields = [];
        foreach (self::SCALARS as $key => $length) {
            $value = $this->safeText($raw[$key] ?? null, $length);
            if ($value === '') continue;
            if ($key === 'phone' && (! preg_match('/^[+()\d\s.-]{8,32}$/', $value)
                || strlen(preg_replace('/\D/', '', $value)) < 7
                || strlen(preg_replace('/\D/', '', $value)) > 15)) continue;
            $fields[$key] = $value;
        }
        $skills = [];
        foreach (array_slice(is_array($raw['skills'] ?? null) ? $raw['skills'] : [], 0, 100) as $value) {
            $value = $this->safeText($value, 50);
            if ($value !== '') $skills[mb_strtolower($value)] = $value;
        }
        if ($skills) $fields['skills'] = array_slice(array_values($skills), 0, 40);

        foreach (self::RECORDS as $section => $columns) {
            $rows = [];
            $seen = [];
            foreach (array_slice(is_array($raw[$section] ?? null) ? $raw[$section] : [], 0, 30) as $candidate) {
                if (! is_array($candidate)) continue;
                $row = [];
                foreach ($columns as $column) {
                    if (in_array($column, self::BOOLEAN_FIELDS, true)) {
                        $row[$column] = ($candidate[$column] ?? null) === true;
                        continue;
                    }
                    $max = in_array($column, ['responsibilities', 'achievements', 'scope', 'outcomes', 'honours', 'details', 'contribution'], true) ? 4000 : 255;
                    if (in_array($column, self::URL_FIELDS, true)) $max = 500;
                    $max = match (true) {
                        $section === 'experiences' && in_array($column, ['job_title', 'organization'], true) => 150,
                        $section === 'projects' && $column === 'title' => 180,
                        $section === 'projects' && $column === 'role' => 100,
                        $section === 'educations' && in_array($column, ['degree', 'institution'], true) => 180,
                        $section === 'certifications' && $column === 'name' => 100,
                        $section === 'certifications' && $column === 'credential_number' => 120,
                        default => $max,
                    };
                    $value = $this->safeText($candidate[$column] ?? null, $max);
                    if (in_array($column, self::MONTHS, true) && $value !== '' && ! $this->validMonth($value)) $value = '';
                    if (in_array($column, self::URL_FIELDS, true) && $value !== '' && ! $this->validUrl($value)) $value = '';
                    if (isset(self::ENUMS[$column]) && $value !== '' && ! in_array($value, self::ENUMS[$column], true)) $value = '';
                    $row[$column] = $value;
                }
                if (in_array('is_current', $columns, true) && $row['is_current']) $row['end_month'] = '';
                if (in_array('does_not_expire', $columns, true) && $row['does_not_expire']) $row['expiry_month'] = '';
                foreach (self::REQUIRED[$section] as $required) {
                    if (empty($row[$required])) continue 2;
                }
                $signature = mb_strtolower(implode('|', array_map(fn ($key) => (string) $row[$key], self::REQUIRED[$section])));
                if (isset($seen[$signature])) continue;
                $seen[$signature] = true;
                $rows[] = $row;
            }
            if ($rows) $fields[$section] = array_slice($rows, 0, 8);
        }

        $career = [];
        foreach (self::CAREER as $key) {
            $value = $this->safeText(is_array($raw['career'] ?? null) ? ($raw['career'][$key] ?? null) : null, 180);
            if ($value !== '') $career[$key] = $value;
        }
        if ($career) $fields['career'] = $career;

        return ['fields' => $fields, 'warnings' => count($fields) < 2
            ? ['Only a few fields could be confidently extracted. Review the source document before applying.'] : []];
    }

    private function safeText(mixed $value, int $limit): string
    {
        if (! is_string($value)) return '';
        $clean = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '');
        return mb_strlen($clean) <= $limit ? $clean : ''; // Reject instead of silently storing truncated credentials/URLs.
    }

    private function validMonth(string $value): bool
    {
        if (! preg_match('/^(\d{4})-(\d{2})$/', $value, $m)) return false;
        return (int) $m[1] >= 1900 && (int) $m[1] <= (int) date('Y') + 10
            && (int) $m[2] >= 1 && (int) $m[2] <= 12;
    }

    private function validUrl(string $url): bool
    {
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        return in_array($scheme, ['http', 'https'], true) && filter_var($url, FILTER_VALIDATE_URL) !== false;
    }
}
