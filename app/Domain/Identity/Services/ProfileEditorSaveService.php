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

            $details = $data['editor_details'];
            foreach (['profile_photo_url' => 'avatar_path', 'cover_photo_url' => 'cover_photo_path'] as $key => $column) {
                // Empty text inputs do not delete previously uploaded, private media.
                if (! empty($details[$key])) {
                    $profile->{$column} = $details[$key];
                }
            }

            $records = $details['records'];
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
                    foreach ($mapping as $input => $column) {
                        if (array_key_exists($input, $entry)) {
                            $row->{$column} = $entry[$input];
                        }
                    }
                    if ($section === 'educations' && ! empty($entry['end_month'])) {
                        $row->year = substr($entry['end_month'], 0, 4);
                    }
                    if ($section === 'experiences') {
                        $row->end_date = $entry['is_current'] ? null : ($entry['end_month'] ?? null);
                    }
                    if ($section === 'projects' && ! $row->exists) {
                        $row->is_featured = false;
                        $row->is_anonymized = true;
                    }
                    if ($section === 'certifications' && ! $row->exists) {
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
}
