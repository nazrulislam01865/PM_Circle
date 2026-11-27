<?php

namespace App\Domain\Identity\Services;

use App\Models\Certification;
use App\Models\Education;
use App\Models\Experience;
use App\Models\Profile;
use App\Models\ProfileProject;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/** Stores the approved profile editor in one transaction without altering other profile endpoints. */
final class ProfileEditorSaveService
{
    public function save(User $user, array $data): void
    {
        DB::transaction(function () use ($user, $data): void {
            foreach (['name', 'email'] as $key) {
                if (! array_key_exists($key, $data)) {
                    continue;
                }
                if ($key === 'email' && $data[$key] !== $user->email) {
                    $user->email_verified_at = null;
                }
                $user->{$key} = $data[$key];
            }
            if ($user->isDirty()) {
                $user->save();
            }

            $profile = $user->profile ?? new Profile(['user_id' => $user->id]);
            $profile->user_id = $user->id;
            foreach (['headline', 'phone', 'role', 'industry', 'country', 'city', 'about', 'skills', 'languages',
                'linkedin_url', 'open_to_opportunities'] as $key) {
                if (array_key_exists($key, $data)) {
                    $profile->{$key} = $data[$key];
                }
            }

            $compact = array_key_exists('compact_details', $data);
            $aligned = ! $compact && ! empty($data['editor_details']['resume_aligned']);
            $previous = $profile->editor_details ?? [];
            if ($compact) {
                $input = $data['compact_details'];
                $details = $previous;
                foreach (['current_organization', 'profile_photo_url', 'cover_photo_url'] as $key) {
                    if (array_key_exists($key, $input)) {
                        $details[$key] = $input[$key];
                        unset($input[$key]);
                    }
                }
                $details['compact'] = array_replace($previous['compact'] ?? [], $input);
                // The dedicated LinkedIn field and the detailed link editor share one value.
                if (array_key_exists('linkedin_url', $data) && isset($details['records']['links'])) {
                    $links = $details['records']['links'];
                    foreach ($links as $index => $link) {
                        if (stripos((string) ($link['label'] ?? ''), 'linkedin') !== false) {
                            if (filled($data['linkedin_url'])) {
                                $links[$index]['url'] = $data['linkedin_url'];
                            } else {
                                unset($links[$index]);
                            }
                        }
                    }
                    $details['records']['links'] = array_values($links);
                }
            } elseif ($aligned) {
                $input = $data['editor_details'];
                $details = $previous;
                foreach (['portfolio', 'github'] as $key) {
                    if (array_key_exists($key, $input)) $details[$key] = $input[$key];
                }
                if (array_key_exists('display_location', $input)) {
                    $details['compact']['display_location'] = $input['display_location'] ?? '';
                }
                $details['records'] = array_replace($previous['records'] ?? [], $input['records']);
                // Keep the existing searchable profile columns derived from the visible categories.
                $skills = [];
                foreach ($input['records']['skill_groups'] as $group) {
                    foreach (preg_split('/[,\r\n]+/', (string) ($group['skills'] ?? '')) as $skill) {
                        $skill = trim($skill);
                        if ($skill !== '' && mb_strlen($skill) <= 50) $skills[] = $skill;
                    }
                }
                $profile->skills = array_slice(array_values(array_unique($skills)), 0, 100);
                $profile->languages = array_values(array_unique(array_map(fn ($entry) => $entry['name'], $input['records']['languages'])));
                if (array_key_exists('linkedin_url', $data)) {
                    $links = $details['records']['links'] ?? [];
                    $found = false;
                    foreach ($links as $index => $link) {
                        if (! $found && stripos((string) ($link['label'] ?? ''), 'linkedin') !== false) {
                            $found = true;
                            if (filled($data['linkedin_url'])) $links[$index]['url'] = $data['linkedin_url'];
                            else unset($links[$index]);
                        }
                    }
                    if (! $found && filled($data['linkedin_url'])) $links[] = ['label' => 'LinkedIn', 'url' => $data['linkedin_url']];
                    $details['records']['links'] = array_values($links);
                }
                // Awards are JSON records; preserve legacy details using the original row index.
                $details['records']['awards'] = array_map(function (array $entry) use ($previous): array {
                    $index = $entry['source_index'] ?? null;
                    unset($entry['source_index']);
                    $old = $index === null ? [] : ($previous['records']['awards'][$index] ?? []);
                    $period = (string) ($entry['period'] ?? '');
                    $entry['period'] = $period;
                    if ($period !== (string) ($old['period'] ?? $old['award_month'] ?? '')) {
                        $entry['award_month'] = preg_match('/^\d{4}-(?:0[1-9]|1[0-2])$/D', $period) ? $period : null;
                    }
                    return array_replace($old, $entry);
                }, $input['records']['awards']);
            } else {
                // Detailed saves must not erase compact summary fields.
                $details = array_replace($previous, $data['editor_details']);
            }
            foreach (['profile_photo_url' => 'avatar_path', 'cover_photo_url' => 'cover_photo_path'] as $key => $column) {
                // Empty text inputs do not delete previously uploaded, private media.
                if (! $aligned && (! $compact || array_key_exists($key, $data['compact_details'])) && ! empty($details[$key])) {
                    $profile->{$column} = $details[$key];
                }
            }

            if ($compact) {
                $profile->editor_details = $details;
                if ($profile->isDirty() || ! $profile->exists) {
                    $profile->save();
                }
                return;
            }

            $records = array_replace($previous['records'] ?? [], $details['records']);
            $removed = $data['removed_entries'] ?? [];
            $specs = [
                'experiences' => ['experiences', Experience::class, [
                    'job_title' => 'job_title', 'organization' => 'organization', 'employment_type' => 'employment_type',
                    'start_month' => 'start_date', 'end_month' => 'end_date', 'is_current' => 'is_current',
                    'responsibilities' => 'responsibilities',
                ]],
                'projects' => ['profileProjects', ProfileProject::class, [
                    'title' => 'title', 'role' => 'role', 'scope' => 'summary',
                ]],
                'educations' => ['educations', Education::class, [
                    'degree' => 'degree', 'institution' => 'institution', 'end_month' => 'year',
                ]],
                'certifications' => ['certifications', Certification::class, [
                    'name' => 'name', 'credential_number' => 'credential_number', 'expiry_month' => 'valid_until',
                ]],
            ];

            foreach ($specs as $section => [$relationName, $modelClass, $mapping]) {
                $relation = $user->{$relationName}();
                // Only one lookup per record type; no query per rendered field.
                $existing = $relation->get()->keyBy('id');
                $deletedIds = $removed[$section] ?? [];
                if ($deletedIds) {
                    foreach ($deletedIds as $id) {
                        abort_unless($existing->has($id), 404);
                    }
                    $relation->whereIn('id', $deletedIds)->delete();
                }

                foreach ($records[$section] as &$entry) {
                    $id = $entry['id'] ?? null;
                    if ($id !== null) {
                        abort_unless($existing->has($id) && ! in_array($id, $deletedIds, true), 404);
                        $row = $existing->get($id);
                    } else {
                        /** @var Model $row */
                        $row = new $modelClass();
                        $row->user_id = $user->id;
                    }
                    if ($aligned) {
                        $old = $id === null ? [] : collect($previous['records'][$section] ?? [])->firstWhere('id', $id) ?? [];
                        $entry = $this->mergeAlignedRecord($section, $entry, $old, $row);
                    }
                    foreach ($mapping as $input => $column) {
                        if ($aligned && in_array($input, ['role', 'employment_type', 'credential_number'], true)) continue;
                        if (array_key_exists($input, $entry)) {
                            $row->{$column} = $entry[$input];
                        }
                    }
                    if ($section === 'educations' && ! empty($entry['end_month'])) {
                        $row->year = substr($entry['end_month'], 0, 4);
                    } elseif ($aligned && $section === 'educations' && array_key_exists('end_month', $entry)) {
                        $row->year = null;
                    }
                    if ($section === 'experiences') {
                        $row->end_date = $entry['is_current'] ? null : ($entry['end_month'] ?? null);
                    }
                    if ($section === 'projects' && ! $row->exists) {
                        $row->is_featured = false;
                        $row->is_anonymized = true;
                    }
                    if ($section === 'certifications' && (! $row->exists || ($aligned && $row->isDirty('name')))) {
                        $row->verified = false;
                    }
                    $row->save();
                    $entry['id'] = $row->id;
                }
                unset($entry);
            }

            $details['records'] = $records;
            $profile->editor_details = $details;
            $profile->save();
        });
    }
    /** Merge CV-shaped inputs with legacy fields that are no longer editable on this page. */
    public function mergeAlignedRecord(string $section, array $entry, array $old, Model $row): array
    {
        $period = (string) ($entry['period'] ?? '');
        $entry['period'] = $period;
        $format = static fn ($start, $end, $current = false) => implode(' – ', array_filter([$start, $current ? 'Present' : $end]));
        $combine = static fn (...$parts) => implode("\n", array_filter(array_map(fn ($value) => trim((string) $value), $parts), fn ($value) => $value !== ''));
        $educationEnd = null;
        if ($section === 'educations') {
            $educationEnd = ($old['end_month'] ?? null) && $row->year && str_starts_with((string) $old['end_month'], (string) $row->year) ? $old['end_month'] : $row->year;
        }
        $storedPeriod = match ($section) {
            'experiences' => $format($row->start_date, $row->end_date, $row->is_current),
            'educations' => $format($old['start_month'] ?? '', $educationEnd, $old['is_current'] ?? false),
            'projects' => $format($old['start_month'] ?? '', $old['end_month'] ?? ''),
            'certifications' => $format($old['issue_month'] ?? '', ($old['does_not_expire'] ?? false) ? 'Does not expire' : $row->valid_until),
        };
        // Preserve the exact displayed free-text period; derive date columns only for unambiguous ISO dates.
        $periodChanged = ! $row->exists || $period !== (string) ($old['period'] ?? $storedPeriod);
        if ($periodChanged) {
            $start = $end = null;
            $current = $noExpiry = false;
            if (preg_match('/^(\d{4}(?:-(?:0[1-9]|1[0-2]))?)(?:\s*(?:–|—|to|\s-\s)\s*(\d{4}(?:-(?:0[1-9]|1[0-2]))?|Present|Does not expire))?$/iuD', trim($period), $match)) {
                $start = $match[1];
                $end = $match[2] ?? null;
                $current = strcasecmp((string) $end, 'Present') === 0;
                $noExpiry = strcasecmp((string) $end, 'Does not expire') === 0;
                if ($current || $noExpiry) $end = null;
            }
            if ($section === 'certifications') {
                $entry += ['issue_month' => $start, 'expiry_month' => $end, 'does_not_expire' => $noExpiry];
            } else {
                $entry += ['start_month' => $start, 'end_month' => $end ?? ($section === 'educations' && ! $current ? $start : null)];
                if ($section !== 'projects') $entry['is_current'] = $current;
            }
        }
        if (! $periodChanged && $section === 'educations') $entry['end_month'] = $educationEnd;
        if (! $periodChanged && $section === 'certifications') $entry['expiry_month'] = $row->valid_until;
        if ($section === 'experiences') {
            // Do not duplicate an unchanged legacy achievements paragraph.
            if ($row->exists && (string) ($entry['responsibilities'] ?? '') === $combine($row->responsibilities, $old['achievements'] ?? '')) {
                $entry['responsibilities'] = $row->responsibilities;
            } else {
                $entry['achievements'] = '';
            }
            $entry['start_month'] = array_key_exists('start_month', $entry) ? ($entry['start_month'] ?? '') : ($row->start_date ?? '');
            $entry['end_month'] = array_key_exists('end_month', $entry) ? $entry['end_month'] : $row->end_date;
            $entry['is_current'] = $entry['is_current'] ?? (bool) $row->is_current;
        }
        if ($section === 'projects') {
            if ($row->exists && (string) ($entry['scope'] ?? '') === $combine($row->summary, $old['outcomes'] ?? '')) {
                $entry['scope'] = $row->summary;
            } else {
                $entry['outcomes'] = '';
            }
        }
        if ($section === 'certifications' && $row->exists && (string) ($entry['issuing_organization'] ?? '') !== (string) ($old['issuing_organization'] ?? '')) {
            $row->verified = false;
        }
        return array_replace($old, $entry);
    }

}
