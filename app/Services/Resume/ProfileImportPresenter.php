<?php

namespace App\Services\Resume;

use App\Models\ProfileImportSession;
use App\Models\User;
use Illuminate\Support\Collection;

/** Presents all Edit Profile sections from loaded relations and the existing editor JSON. */
final class ProfileImportPresenter
{
    public function __construct(private readonly ResumeImportShape $shape) {}

    public function present(User $user, ?ProfileImportSession $active, Collection $history): array
    {
        $profile = $user->profile;
        $details = is_array($profile?->editor_details) ? $profile->editor_details : [];
        $stored = is_array($details['records'] ?? null) ? $details['records'] : [];
        $current = [
            'name' => $user->name, 'headline' => $profile?->headline,
            'role' => $profile?->role, 'phone' => $profile?->phone ?: 'Private',
            'industry' => $profile?->industry, 'country' => $profile?->country,
            'city' => $profile?->city, 'about' => $profile?->about,
            'skills' => $profile?->skills ?: [],
            'current_organization' => $details['current_organization'] ?? '',
            'tools_software' => $details['tools_software'] ?? '',
            'delivery_methods' => $details['delivery_methods'] ?? '',
            'experiences' => $user->experiences->map(fn ($e) => [
                'job_title' => $e->job_title, 'organization' => $e->organization, 'start_month' => $e->start_date,
            ])->all(),
            'projects' => $user->profileProjects->map(fn ($p) => ['title' => $p->title, 'role' => $p->role])->all(),
            'educations' => $user->educations->map(fn ($e) => ['degree' => $e->degree, 'institution' => $e->institution])->all(),
            'certifications' => $user->certifications->map(fn ($c) => ['name' => $c->name])->all(),
            'courses' => $stored['courses'] ?? [], 'awards' => $stored['awards'] ?? [],
            'publications' => $stored['publications'] ?? [], 'volunteering' => $stored['volunteering'] ?? [],
            'languages' => $stored['languages'] ?? array_map(fn ($s) => ['name' => $s], $profile?->languages ?? []),
            'links' => $stored['links'] ?? ($profile?->linkedin_url ? [['label' => 'LinkedIn', 'url' => $profile->linkedin_url]] : []),
            'career' => $details['career'] ?? [],
        ];
        $comparisons = [];
        $verified = $this->shape->normalize(['fields' => $active?->extracted_data['fields'] ?? []])['fields'];
        foreach ($verified as $key => $value) {
            if (! isset(ResumeImportShape::LABELS[$key]) || empty($value)) continue;
            $collection = is_array($value);
            $newCount = $collection ? $this->countChanges($key, $current[$key] ?? [], $value) : null;
            $unchanged = $collection ? $newCount === 0
                : $this->normalise($current[$key] ?? '') === $this->normalise($value);
            $comparison = [
                'field_key' => $key, 'field' => ResumeImportShape::LABELS[$key],
                'current_value' => $this->summarize($current[$key] ?? ''),
                'imported_value' => $this->summarize($value),
                'default_action' => $collection ? 'merge' : 'replace',
                'actions' => $collection ? ['merge', 'keep'] : ['replace', 'keep'],
                'selected' => ! $unchanged && $key !== 'certifications',
                'unchanged' => $unchanged,
                'suggested_label' => $unchanged ? 'Keep existing' : ($collection ? 'Add '.$newCount.' new' : 'Replace'),
                'notice' => $key === 'certifications' ? 'Credentials are self-reported until verified manually.' : null,
            ];
            $comparisons[] = $comparison;
        }
        return [
            'id' => $active?->id,
            'status' => $active?->status ?? 'empty',
            'step' => $active?->status === 'applied' ? 3 : ($active?->status === 'ready' ? 2 : 1),
            'filename' => $active?->source_filename,
            'comparisons' => $active?->status === 'ready' ? $comparisons : [],
            'warnings' => $active?->extracted_data['warnings'] ?? [],
            'ai_enabled' => (bool) config('pm-ai.resume_extract_enabled'),
            'history' => $history->map(fn ($record) => [
                'id' => $record->id, 'date' => $record->updated_at?->format('d M Y, g:i A'),
                'filename' => $record->source_filename,
                'fields_updated' => $record->extracted_data['applied_count'] ?? 0,
                'status' => $record->status,
            ])->all(),
        ];
    }

    private function countChanges(string $key, mixed $existing, mixed $incoming): int
    {
        if (! is_array($incoming)) return 0;
        if ($key === 'career') {
            return count(array_filter($incoming, fn ($v, $k) => $this->normalise(data_get($existing, $k)) !== $this->normalise($v), ARRAY_FILTER_USE_BOTH));
        }
        if ($key === 'skills') {
            $present = array_fill_keys(array_map($this->normalise(...), is_array($existing) ? $existing : []), true);
            return count(array_filter($incoming, fn ($name) => ! isset($present[$this->normalise($name)])));
        }
        if (! isset(ResumeImportShape::RECORDS[$key])) return 0;
        // Match the identifiers used by the SQL-backed importer, not optional display fields.
        $ids = match ($key) {
            'experiences' => ['job_title', 'organization'], 'projects' => ['title', 'role'],
            'educations' => ['degree', 'institution'], 'certifications' => ['name'],
            default => ResumeImportShape::REQUIRED[$key],
        };
        $present = [];
        foreach (is_array($existing) ? $existing : [] as $entry) {
            if (is_array($entry)) $present[$this->signature($entry, $ids)] = true;
        }
        $new = 0;
        foreach ($incoming as $entry) {
            if (! is_array($entry)) continue;
            $signature = $this->signature($entry, $ids);
            if ($signature !== '' && ! isset($present[$signature])) {
                $new++;
                $present[$signature] = true;
            }
        }
        return min($new, max(0, 40 - (is_array($existing) ? count($existing) : 0)));
    }

    private function signature(array $value, array $fields): string
    {
        $parts = [];
        foreach ($fields as $field) {
            $part = $this->normalise($value[$field] ?? null);
            if ($part === '') return '';
            $parts[] = $part;
        }
        return implode('|', $parts);
    }

    private function normalise(mixed $value): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', is_scalar($value) ? (string) $value : '') ?? ''));
    }

    private function summarize(mixed $value): string
    {
        if (is_array($value)) {
            if (array_is_list($value)) {
                $value = implode(', ', array_map(function ($row): string {
                    if (! is_array($row)) return is_scalar($row) ? (string) $row : '';
                    $named = array_filter([$row['title'] ?? null, $row['name'] ?? null, $row['job_title'] ?? null,
                        $row['degree'] ?? null, $row['role'] ?? null, $row['organization'] ?? null,
                        $row['institution'] ?? null, $row['url'] ?? null], 'is_string');
                    return implode(' · ', array_slice($named, 0, 2));
                }, array_slice($value, 0, 8)));
            } else {
                $value = implode(', ', array_map(fn ($k, $v) => str_replace('_', ' ', $k).': '.(string) $v,
                    array_keys($value), array_values($value)));
            }
        }
        $value = trim((string) $value);
        return mb_strlen($value) > 350 ? mb_substr($value, 0, 347).'…' : ($value ?: 'Not provided');
    }
}
