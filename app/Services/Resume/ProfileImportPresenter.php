<?php

namespace App\Services\Resume;

use App\Models\ProfileImportSession;
use App\Models\User;
use Illuminate\Support\Collection;

class ProfileImportPresenter
{
    public function present(User $user, ?ProfileImportSession $active, Collection $history): array
    {
        $profile = $user->profile;
        $current = [
            'name' => $user->name,
            'headline' => $profile?->headline,
            'role' => $profile?->role,
            'phone' => $profile?->phone ?: 'Private',
            'skills' => $profile?->skills ?: [],
            'experiences' => $user->experiences->map(fn ($e) => "$e->job_title at $e->organization")->all(),
            'educations' => $user->educations->map(fn ($e) => "$e->degree · $e->institution")->all(),
            'certifications' => $user->certifications->pluck('name')->all(),
        ];
        $labels = ['name' => 'Full name', 'headline' => 'Professional headline', 'role' => 'Current role', 'phone' => 'Contact (phone)',
            'skills' => 'Skills', 'experiences' => 'Experience', 'educations' => 'Education', 'certifications' => 'Certifications'];
        $comparisons = [];
        foreach (($active?->extracted_data['fields'] ?? []) as $key => $value) {
            if (! array_key_exists($key, $labels) || empty($value)) {
                continue;
            }
            $isCollection = in_array($key, ['skills', 'experiences', 'educations', 'certifications'], true);
            $newCount = $isCollection ? $this->countNewEntries($user, $key, $value) : null;
            $unchanged = $isCollection
                ? $newCount === 0
                : $this->normalise($current[$key] ?? '') === $this->normalise($value);
            $suggestedLabel = match ($key) {
                'phone' => 'Import privately',
                'skills' => $newCount > 0 ? 'Add '.$newCount.' new' : 'Keep existing',
                'experiences', 'educations' => 'Merge & review',
                'certifications' => 'Review manually',
                default => 'Replace',
            };
            $comparisons[] = [
                'field_key' => $key,
                'field' => $labels[$key],
                'current_value' => $this->summarize($current[$key] ?? ''),
                'imported_value' => $this->summarize($value),
                'default_action' => $key === 'certifications' ? 'keep' : ($isCollection ? 'merge' : 'replace'),
                'actions' => $isCollection ? ['merge', 'keep'] : ['replace', 'keep'],
                'selected' => ! $unchanged && $key !== 'certifications',
                'unchanged' => $unchanged,
                'suggested_label' => $unchanged ? 'Keep existing' : $suggestedLabel,
                'notice' => $key === 'certifications'
                    ? (collect($value)->contains(fn ($item) => is_array($item) && empty($item['credential_number']))
                        ? 'Credential ID not found' : 'Certification details require manual verification.')
                    : null,
            ];
        }

        return [
            'id' => $active?->id,
            'status' => $active?->status ?? 'empty',
            'step' => $active?->status === 'applied' ? 3 : ($active?->status === 'ready' ? 2 : 1),
            'filename' => $active?->source_filename,
            'comparisons' => $active?->status === 'ready' ? $comparisons : [],
            'warnings' => $active?->extracted_data['warnings'] ?? [],
            'history' => $history->map(fn ($record) => [
                'id' => $record->id,
                'date' => $record->updated_at?->format('d M Y, g:i A'),
                'filename' => $record->source_filename,
                'fields_updated' => $record->extracted_data['applied_count'] ?? 0,
                'status' => $record->status,
            ])->all(),
        ];
    }

    /** Comparing eager-loaded relations requires no additional database queries. */
    private function countNewEntries(User $user, string $field, mixed $value): int
    {
        if (! is_array($value)) {
            return 0;
        }

        $identities = match ($field) {
            'skills' => array_map(fn ($name) => $this->normalise($name), $user->profile?->skills ?? []),
            'experiences' => $user->experiences->map(fn ($row) => $this->normalise($row->job_title.'|'.$row->organization))->all(),
            'educations' => $user->educations->map(fn ($row) => $this->normalise($row->degree.'|'.$row->institution))->all(),
            'certifications' => $user->certifications->map(fn ($row) => $this->normalise($row->name))->all(),
            default => [],
        };
        $known = array_fill_keys($identities, true);
        $count = 0;

        foreach (in_array($field, ['experiences', 'educations', 'certifications'], true) ? array_slice($value, 0, 8) : $value as $item) {
            $identity = match ($field) {
                'skills' => is_string($item) ? $this->normalise($item) : '',
                'experiences' => is_array($item) && ! empty($item['job_title']) && ! empty($item['organization'])
                    ? $this->normalise($item['job_title'].'|'.$item['organization']) : '',
                'educations' => is_array($item) && ! empty($item['degree']) && ! empty($item['institution'])
                    ? $this->normalise($item['degree'].'|'.$item['institution']) : '',
                'certifications' => is_array($item) && ! empty($item['name'])
                    ? $this->normalise($item['name']) : '',
                default => '',
            };
            if ($identity !== '' && ! isset($known[$identity])) {
                $known[$identity] = true;
                $count++;
            }
        }

        return $count;
    }

    private function normalise(mixed $value): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', is_scalar($value) ? (string) $value : '') ?? ''));
    }

    private function summarize(mixed $value): string
    {
        if (is_array($value)) {
            $value = implode(', ', array_map(fn ($entry) => is_array($entry)
                ? implode(' · ', array_filter(array_map('strval', array_values($entry)))) : (string) $entry, array_slice($value, 0, 6)));
        }

        $value = trim((string) $value);
        return mb_strlen($value) > 350 ? mb_substr($value, 0, 347).'…' : ($value ?: 'Not provided');
    }
}
