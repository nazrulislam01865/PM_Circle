<?php

namespace App\Services\Resume;

use App\Models\Profile;
use App\Models\ProfileImportSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Apply only explicitly approved, server-validated suggestions; never replace existing collections. */
final class ApplyProfileImport
{
    public function __construct(private readonly ResumeImportShape $shape) {}

    public function apply(User $user, int $importId, array $decisions): int
    {
        return DB::transaction(function () use ($user, $importId, $decisions): int {
            $import = ProfileImportSession::where('user_id', $user->id)->lockForUpdate()->findOrFail($importId);
            if ($import->status !== 'ready') {
                throw ValidationException::withMessages(['import' => 'This import is no longer available for review.']);
            }
            $original = $import->extracted_data ?? [];
            // Validating again protects against previously saved (or malformed) import results.
            $fields = $this->shape->normalize(['fields' => $original['fields'] ?? []])['fields'];
            $allowed = ResumeImportShape::LABELS;
            $profile = null;
            $details = null;
            $applied = 0;

            foreach ($decisions as $key => $action) {
                if (! isset($allowed[$key]) || ! array_key_exists($key, $fields) || $action === 'keep') continue;
                $value = $fields[$key];
                $collection = is_array($value);
                if ($collection ? $action !== 'merge' : $action !== 'replace') {
                    throw ValidationException::withMessages(['decisions' => 'The selected action is not supported for '.$key.'.']);
                }
                if ($key !== 'name' && $profile === null) {
                    $profile = $user->profile ?? new Profile(['user_id' => $user->id]);
                    $details = is_array($profile->editor_details) ? $profile->editor_details : [];
                    $details['records'] = is_array($details['records'] ?? null) ? $details['records'] : [];
                }

                if ($key === 'name') {
                    if ($user->name !== $value) { $user->name = $value; $applied++; }
                } elseif (in_array($key, ['headline', 'role', 'phone', 'industry', 'country', 'city', 'about'], true)) {
                    if ($profile->{$key} !== $value) { $profile->{$key} = $value; $applied++; }
                } elseif (in_array($key, ['current_organization', 'tools_software', 'delivery_methods'], true)) {
                    if (($details[$key] ?? null) !== $value) { $details[$key] = $value; $applied++; }
                } elseif ($key === 'skills') {
                    $current = is_array($profile->skills) ? $profile->skills : [];
                    [$merged, $added] = $this->mergeStrings($current, $value, 100);
                    if ($added) { $profile->skills = $merged; $applied += $added; }
                } elseif ($key === 'career') {
                    $current = is_array($details['career'] ?? null) ? $details['career'] : [];
                    foreach ($value as $field => $text) {
                        if (! in_array($field, ResumeImportShape::CAREER, true)) continue;
                        if (($current[$field] ?? null) !== $text) { $current[$field] = $text; $applied++; }
                    }
                    $details['career'] = $current;
                } elseif (isset(ResumeImportShape::RECORDS[$key])) {
                    $current = is_array($details['records'][$key] ?? null) ? $details['records'][$key] : [];
                    if ($key === 'languages' && ! array_key_exists('languages', $details['records'])) {
                        $current = array_map(fn ($name) => ['name' => $name, 'proficiency' => ''], $profile->languages ?? []);
                    }
                    if ($key === 'links' && ! array_key_exists('links', $details['records']) && $profile->linkedin_url) {
                        $current = [['label' => 'LinkedIn', 'url' => $profile->linkedin_url]];
                    }
                    if (in_array($key, ['experiences', 'projects', 'educations', 'certifications'], true)) {
                        [$added, $importedRows] = $this->insertRecords($user, $key, $value);
                        $applied += $added;
                    } else {
                        [$importedRows, $added] = $this->mergeJsonRecords($current, $value, $key);
                        $applied += $added;
                    }
                    if ($importedRows) {
                        $details['records'][$key] = array_slice([...$current, ...$importedRows], 0, 40);
                    }
                    if ($key === 'languages' && $importedRows) {
                        $names = array_map(fn ($row) => $row['name'], $importedRows);
                        [$merged] = $this->mergeStrings($profile->languages ?? [], $names, 20);
                        $profile->languages = $merged;
                    }
                    if ($key === 'links' && $importedRows && ! $profile->linkedin_url) {
                        foreach ($importedRows as $row) {
                            if (stripos($row['label'], 'linkedin') !== false && str_contains(strtolower($row['url']), 'linkedin.com/')) {
                                $profile->linkedin_url = $row['url'];
                                break;
                            }
                        }
                    }
                }
            }
            if ($user->isDirty()) $user->save();
            if ($profile !== null) {
                $profile->user_id = $user->id;
                if ($details !== null) $profile->editor_details = $details;
                if (! $profile->exists || $profile->isDirty()) $profile->save();
            }
            $original['applied_count'] = $applied;
            $original['decisions'] = $decisions;
            $import->update(['extracted_data' => $original, 'status' => 'applied']);
            return $applied;
        }, 3);
    }

    private function mergeStrings(array $existing, array $incoming, int $limit): array
    {
        $result = $existing;
        $known = array_fill_keys(array_map(fn ($x) => mb_strtolower(trim((string) $x)), $existing), true);
        $added = 0;
        foreach ($incoming as $value) {
            $signature = mb_strtolower(trim((string) $value));
            if ($signature === '' || isset($known[$signature]) || count($result) >= $limit) continue;
            $known[$signature] = true;
            $result[] = $value;
            $added++;
        }
        return [$result, $added];
    }

    private function mergeJsonRecords(array $existing, array $incoming, string $section): array
    {
        $identity = ResumeImportShape::REQUIRED[$section];
        $known = [];
        foreach ($existing as $entry) {
            if (is_array($entry)) $known[$this->signature($entry, $identity)] = true;
        }
        $new = [];
        foreach ($incoming as $entry) {
            $signature = $this->signature($entry, $identity);
            if ($signature === '' || isset($known[$signature]) || count($new) + count($existing) >= 40) continue;
            $new[] = $entry;
            $known[$signature] = true;
        }
        return [$new, count($new)];
    }

    /** At most two indexed reads and one bulk insert for each selected SQL-backed collection. */
    private function insertRecords(User $user, string $section, array $items): array
    {
        [$table, $identity, $map, $defaults] = match ($section) {
            'experiences' => ['experiences', ['job_title', 'organization'], [
                'job_title' => 'job_title', 'organization' => 'organization',
                'employment_type' => 'employment_type', 'start_month' => 'start_date',
                'end_month' => 'end_date', 'is_current' => 'is_current', 'responsibilities' => 'responsibilities',
            ], ['employment_type' => 'Full-time', 'is_current' => false]],
            'projects' => ['profile_projects', ['title', 'role'], [
                'title' => 'title', 'role' => 'role', 'scope' => 'summary',
            ], ['is_featured' => false, 'is_anonymized' => true]],
            'educations' => ['educations', ['degree', 'institution'], [
                'degree' => 'degree', 'institution' => 'institution', 'end_month' => 'year',
            ], []],
            'certifications' => ['certifications', ['name'], [
                'name' => 'name', 'credential_number' => 'credential_number', 'expiry_month' => 'valid_until',
            ], ['verified' => false]],
        };
        $present = DB::table($table)->where('user_id', $user->id)->get(['id', ...$identity]);
        $known = [];
        foreach ($present as $row) $known[$this->signature((array) $row, $identity)] = true;

        $rows = [];
        $extraByIdentity = [];
        $room = max(0, 40 - $present->count());
        foreach (array_slice($items, 0, min(8, $room)) as $entry) {
            if (! is_array($entry)) continue;
            $signature = $this->signature($entry, $identity);
            if ($signature === '' || isset($known[$signature])) continue;
            $known[$signature] = true;
            $db = $defaults;
            foreach ($map as $source => $column) {
                if (! array_key_exists($source, $entry)) continue;
                if ($section === 'educations' && $source === 'end_month') {
                    $db[$column] = $entry[$source] ? substr($entry[$source], 0, 4) : null;
                } elseif ($source === 'end_month' && ($entry['is_current'] ?? false)) {
                    $db[$column] = null;
                } else {
                    $db[$column] = $entry[$source] === '' ? null : $entry[$source];
                }
            }
            if ($section === 'experiences' && empty($db['employment_type'])) $db['employment_type'] = 'Full-time';
            $rows[] = ['user_id' => $user->id, ...$db, 'created_at' => now(), 'updated_at' => now()];
            $extraByIdentity[$signature] = $entry;
        }
        if (! $rows) return [0, []];
        DB::table($table)->insert($rows);

        // Eloquent editor merges the extra JSON fields using these newly assigned IDs.
        $saved = DB::table($table)->where('user_id', $user->id)
            ->whereIn($identity[0], array_column($rows, $identity[0]))->get(['id', ...$identity]);
        $extras = [];
        foreach ($saved as $row) {
            $signature = $this->signature((array) $row, $identity);
            if (isset($extraByIdentity[$signature])) $extras[] = ['id' => $row->id, ...$extraByIdentity[$signature]];
        }
        return [count($rows), $extras];
    }

    private function signature(array $row, array $identity): string
    {
        $values = [];
        foreach ($identity as $key) {
            $value = trim((string) ($row[$key] ?? ''));
            if ($value === '') return '';
            $values[] = mb_strtolower($value);
        }
        return implode('|', $values);
    }
}
