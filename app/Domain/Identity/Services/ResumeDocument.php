<?php

namespace App\Domain\Identity\Services;

use App\Models\User;

/** Private CV document schema; independent of public profile visibility and credentials. */
final class ResumeDocument
{
    public const CONTACT = ['headline', 'phone', 'portfolio', 'github', 'linkedin'];
    public const SECTIONS = [
        'education' => ['title', 'location', 'subtitle', 'period', 'description', 'courses'],
        'experience' => ['title', 'location', 'subtitle', 'period', 'description', 'technical', 'soft'],
        'research' => ['title', 'location', 'subtitle', 'period', 'description', 'technical', 'soft'],
        'projects' => ['title', 'location', 'subtitle', 'period', 'description', 'technical', 'soft', 'team'],
        'skills' => ['title', 'description'],
        'achievements' => ['period', 'title', 'subtitle'],
        'interests' => ['title', 'description'],
        'languages' => ['title', 'description'],
        'certifications' => ['title', 'subtitle', 'period', 'description'],
    ];

    public static function rules(): array
    {
        $keys = implode(',', [...self::CONTACT, ...array_keys(self::SECTIONS)]);
        $rules = ['document' => ['sometimes', 'array:'.$keys, 'required_array_keys:'.implode(',', array_keys(self::SECTIONS))]];
        foreach (self::CONTACT as $key) {
            $rules['document.'.$key] = ['nullable', 'string', 'max:255'];
        }
        foreach (self::SECTIONS as $section => $fields) {
            $rules['document.'.$section] = ['array', 'max:20', 'list'];
            $rules['document.'.$section.'.*'] = ['array:'.implode(',', $fields)];
            foreach ($fields as $field) {
                $rules['document.'.$section.'.*.'.$field] = ['nullable', 'string', 'max:'.(in_array($field, ['description', 'courses'], true) ? 4000 : 255)];
            }
        }
        return $rules;
    }

    public static function fromProfile(User $user): array
    {
        $profile = $user->profile;
        $details = $profile?->editor_details ?? [];
        $records = $details['records'] ?? [];
        $extras = fn (string $section) => collect($records[$section] ?? [])->keyBy('id');
        $experienceDetails = $extras('experiences');
        $educationDetails = $extras('educations');
        $projectDetails = $extras('projects');
        $certificationDetails = $extras('certifications');
        $period = static fn ($start, $end, $current = false) => implode(' – ', array_filter([$start, $current ? 'Present' : $end]));
        $description = static fn (...$parts) => implode("\n", array_filter($parts, fn ($part) => filled($part)));
        $document = array_fill_keys(self::CONTACT, '');
        foreach (self::SECTIONS as $section => $fields) $document[$section] = [];
        $document['headline'] = $profile?->headline ?: ($profile?->role ?? '');
        $document['phone'] = $profile?->phone ?? '';
        $document['linkedin'] = $profile?->linkedin_url ?? '';
        $document['portfolio'] = $details['portfolio'] ?? '';
        $document['github'] = $details['github'] ?? '';
        $document['education'] = $user->educations->sortBy('id')->map(function ($row) use ($educationDetails, $period) {
            $extra = $educationDetails->get($row->id, []);
            return ['title' => $row->institution, 'subtitle' => $row->degree, 'location' => $extra['location'] ?? '',
                'period' => $extra['period'] ?? $period($extra['start_month'] ?? '', $extra['end_month'] ?? $row->year, $extra['is_current'] ?? false),
                'description' => $extra['honours'] ?? '', 'courses' => $extra['courses'] ?? ''];
        })->values()->all();
        $document['experience'] = $user->experiences->map(function ($row) use ($experienceDetails, $period, $description) {
            $extra = $experienceDetails->get($row->id, []);
            return ['title' => $row->organization, 'subtitle' => $row->job_title, 'location' => $extra['location'] ?? '',
                'period' => $extra['period'] ?? $period($row->start_date, $row->end_date, $row->is_current),
                'description' => $description($row->responsibilities, $extra['achievements'] ?? ''),
                'technical' => $extra['technical'] ?? '', 'soft' => $extra['soft'] ?? ''];
        })->values()->all();
        $document['projects'] = $user->profileProjects->map(function ($row) use ($projectDetails, $period, $description) {
            $extra = $projectDetails->get($row->id, []);
            return ['title' => $row->title, 'subtitle' => ($extra['organization'] ?? '') ?: $row->role, 'location' => $extra['location'] ?? '',
                'period' => $extra['period'] ?? $period($extra['start_month'] ?? '', $extra['end_month'] ?? ''),
                'description' => $description(($extra['organization'] ?? '') && $row->role ? 'Role: '.$row->role : '', $row->summary, $extra['outcomes'] ?? ''), 'technical' => $extra['technical'] ?? '',
                'soft' => $extra['soft'] ?? '', 'team' => $extra['team'] ?? ''];
        })->values()->all();
        $document['research'] = collect($records['research'] ?? [])->map(fn ($row) => [
            'title' => $row['title'] ?? '', 'location' => $row['location'] ?? '', 'subtitle' => $row['team_role'] ?? '',
            'period' => $row['period'] ?? '', 'description' => $row['description'] ?? '', 'technical' => $row['technical'] ?? '', 'soft' => $row['soft'] ?? '',
        ])->values()->all();
        $categorized = [];
        foreach ($records['skill_groups'] ?? [] as $row) {
            $document['skills'][] = ['title' => $row['category'] ?? '', 'description' => $row['skills'] ?? ''];
            foreach (preg_split('/[,\r\n]+/', (string) ($row['skills'] ?? '')) as $skill) $categorized[mb_strtolower(trim($skill))] = true;
        }
        $remaining = array_values(array_filter($profile?->skills ?? [], fn ($skill) => ! isset($categorized[mb_strtolower(trim($skill))])));
        if ($remaining) $document['skills'][] = ['title' => 'Professional skills', 'description' => implode(', ', $remaining)];
        $document['achievements'] = collect($records['awards'] ?? [])->map(fn ($row) => [
            'title' => $row['name'] ?? '', 'subtitle' => $row['organization'] ?? '', 'period' => $row['period'] ?? $row['award_month'] ?? '',
        ])->values()->all();
        $document['interests'] = collect($records['interests'] ?? [])->map(fn ($row) => [
            'title' => $row['title'] ?? '', 'description' => $row['description'] ?? '',
        ])->values()->all();
        $document['languages'] = collect($records['languages'] ?? array_map(fn ($name) => ['name' => $name], $profile?->languages ?? []))
            ->map(fn ($row) => ['title' => $row['name'] ?? '', 'description' => $row['proficiency'] ?? ''])->values()->all();
        $document['certifications'] = $user->certifications->map(function ($row) use ($certificationDetails, $period, $description) {
            $extra = $certificationDetails->get($row->id, []);
            return ['title' => $row->name, 'subtitle' => $extra['issuing_organization'] ?? '',
                'period' => $extra['period'] ?? $period($extra['issue_month'] ?? '', ($extra['does_not_expire'] ?? false) ? 'Does not expire' : $row->valid_until),
                'description' => $description($extra['details'] ?? '', $row->credential_number ? 'Credential number: '.$row->credential_number : '')];
        })->values()->all();
        // Eloquent dates and years may be scalar or date objects; keep the browser contract string-only.
        foreach (self::SECTIONS as $section => $fields) {
            $document[$section] = array_map(fn ($row) => array_map(fn ($value) => $value === null ? '' : (string) $value, $row), $document[$section]);
        }
        return $document;
    }
}
