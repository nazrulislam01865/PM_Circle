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
        $period = fn ($row) => implode(' – ', array_filter([$row->start_date, $row->is_current ? 'Present' : $row->end_date]));
        $document = array_fill_keys(self::CONTACT, '');
        foreach (self::SECTIONS as $section => $fields) $document[$section] = [];
        $document['headline'] = $profile?->headline ?: ($profile?->role ?? '');
        $document['phone'] = $profile?->phone ?? '';
        $document['linkedin'] = $profile?->linkedin_url ?? '';
        $document['education'] = $user->educations->sortBy('id')->map(fn ($row) => ['title' => $row->institution, 'subtitle' => $row->degree, 'period' => (string) ($row->year ?? '')])->values()->all();
        $document['experience'] = $user->experiences->map(fn ($row) => ['title' => $row->organization, 'subtitle' => $row->job_title, 'period' => $period($row), 'description' => $row->responsibilities])->values()->all();
        $document['projects'] = $user->profileProjects->map(fn ($row) => ['title' => $row->title, 'subtitle' => $row->role, 'description' => $row->summary])->values()->all();
        if ($profile?->skills) $document['skills'] = [['title' => 'Professional skills', 'description' => implode(', ', $profile->skills)]];
        $document['languages'] = collect($profile?->languages ?? [])->filter(fn ($value) => is_string($value))->map(fn ($value) => ['title' => $value])->values()->all();
        $document['certifications'] = $user->certifications->map(fn ($row) => ['title' => $row->name, 'period' => $row->valid_until, 'description' => $row->credential_number ? 'Credential number: '.$row->credential_number : ''])->values()->all();
        // Eloquent dates and years may be scalar or date objects; keep the browser contract string-only.
        foreach (self::SECTIONS as $section => $fields) {
            $document[$section] = array_map(fn ($row) => array_map(fn ($value) => $value === null ? '' : (string) $value, $row), $document[$section]);
        }
        return $document;
    }
}
