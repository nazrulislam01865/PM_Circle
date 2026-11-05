<?php

namespace App\Services\Resume;

use App\Models\Profile;
use App\Models\ProfileImportSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApplyProfileImport
{
    public function apply(User $user, int $importId, array $decisions): int
    {
        return DB::transaction(function () use ($user, $importId, $decisions): int {
            $import = ProfileImportSession::where('user_id', $user->id)->lockForUpdate()->findOrFail($importId);
            if ($import->status !== 'ready') {
                throw ValidationException::withMessages(['import' => 'This import is no longer available for review.']);
            }

            $fields = $import->extracted_data['fields'] ?? [];
            $allowed = ['name', 'headline', 'role', 'phone', 'skills', 'experiences', 'educations', 'certifications'];
            $profile = null;
            $applied = 0;

            foreach ($decisions as $key => $action) {
                if (! in_array($key, $allowed, true) || ! array_key_exists($key, $fields) || $action === 'keep') {
                    continue;
                }
                $value = $fields[$key];
                $collection = in_array($key, ['skills', 'experiences', 'educations', 'certifications'], true);
                if ($collection ? $action !== 'merge' || ! is_array($value) : $action !== 'replace' || ! is_string($value)) {
                    throw ValidationException::withMessages(['decisions' => "Invalid action for $key."]);
                }

                // Only load a profile when the approved field actually needs it.
                if (in_array($key, ['headline', 'role', 'phone', 'skills'], true) && $profile === null) {
                    $profile = $user->profile ?? new Profile();
                }

                switch ($key) {
                    case 'name':
                        $user->name = mb_substr(trim($value), 0, 255);
                        $applied++;
                        break;
                    case 'headline':
                        $profile->headline = mb_substr(trim($value), 0, 180);
                        $applied++;
                        break;
                    case 'role':
                        $profile->role = mb_substr(trim($value), 0, 80);
                        $applied++;
                        break;
                    case 'phone':
                        if (preg_match('/^[+()\d\s.-]{8,32}$/', $value)) {
                            $profile->phone = trim($value);
                            $applied++;
                        }
                        break;
                    case 'skills':
                        $clean = array_filter($value, fn ($item) => is_string($item) && mb_strlen(trim($item)) <= 50);
                        $profile->skills = array_slice(array_values(array_unique(array_merge($profile->skills ?? [], array_map('trim', $clean)))), 0, 100);
                        $applied++;
                        break;
                    case 'experiences':
                        $applied += $this->insertUnique($user, 'experiences', $value, ['job_title', 'organization'],
                            ['job_title' => 150, 'organization' => 150, 'employment_type' => 50, 'start_date' => 50],
                            ['employment_type' => 'Full-time', 'start_date' => 'Not provided', 'is_current' => false]);
                        break;
                    case 'educations':
                        $applied += $this->insertUnique($user, 'educations', $value, ['degree', 'institution'],
                            ['degree' => 180, 'institution' => 180], []);
                        break;
                    case 'certifications':
                        $applied += $this->insertUnique($user, 'certifications', $value, ['name'], ['name' => 100], ['verified' => false]);
                        break;
                }
            }

            if ($user->isDirty()) {
                $user->save();
            }
            if ($profile !== null && $profile->isDirty()) {
                if (! $profile->exists) {
                    $profile->user_id = $user->id;
                }
                $profile->save();
            }

            $stored = $import->extracted_data;
            $stored['applied_count'] = $applied;
            $stored['decisions'] = $decisions;
            $import->update(['extracted_data' => $stored, 'status' => 'applied']);

            return $applied;
        });
    }

    /** Insert new entries in one query per table; never erase existing member records. */
    private function insertUnique(User $user, string $table, array $items, array $identity, array $limits, array $defaults): int
    {
        $existing = DB::table($table)->where('user_id', $user->id)->get($identity)
            ->map(fn ($row) => mb_strtolower(implode('|', array_map(fn ($key) => (string) $row->{$key}, $identity))))->all();
        $known = array_fill_keys($existing, true);
        $insert = [];
        foreach (array_slice($items, 0, 8) as $item) {
            if (! is_array($item)) {
                continue;
            }
            $data = $defaults;
            foreach ($limits as $key => $max) {
                if (isset($item[$key]) && is_string($item[$key])) {
                    $data[$key] = mb_substr(trim($item[$key]), 0, $max);
                }
            }
            if (count(array_filter($identity, fn ($key) => empty($data[$key]))) > 0) {
                continue;
            }
            $signature = mb_strtolower(implode('|', array_map(fn ($key) => $data[$key], $identity)));
            if (isset($known[$signature])) {
                continue;
            }
            $known[$signature] = true;
            $insert[] = ['user_id' => $user->id, ...$data, 'created_at' => now(), 'updated_at' => now()];
        }
        if ($insert) {
            DB::table($table)->insert($insert);
        }
        return count($insert);
    }
}
