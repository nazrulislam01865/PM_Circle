<?php

namespace App\Domain\Identity\Services;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Only the fields represented in the résumé editor are updated; no collection is replaced. */
final class ResumeAssistantProfile
{
    public function snapshot(User $user): array
    {
        $user->loadMissing(['profile', 'experiences', 'educations', 'certifications']);
        $profile = $user->profile;
        $document = $profile?->private_resume_document;
        if ($document === null) {
            $user->loadMissing('profileProjects');
            $document = ResumeDocument::fromProfile($user);
        }
        $experience = $user->experiences->first();
        $education = $user->educations->sortBy('id')->first();
        $certification = $user->certifications->sortBy('id')->first();
        $period = static fn ($row) => $row ? implode(' – ', array_filter([$row->start_date, $row->is_current ? 'Present' : $row->end_date])) : '';
        $fields = [
            'name' => $user->name, 'email' => $user->email,
            'role' => $profile?->role ?: ($experience?->job_title ?? ''),
            'company' => $profile?->editor_details['current_organization'] ?? $experience?->organization ?? '',
            'location' => implode(', ', array_filter([$profile?->city, $profile?->country])),
            'summary' => $profile?->about ?? '', 'period' => $period($experience),
            'responsibilities' => $experience?->responsibilities ?? '',
            'skills' => implode("\n", $profile?->skills ?? []),
            'degree' => $education?->degree ?? '', 'institution' => $education?->institution ?? '',
            'certification' => $certification?->name ?? '',
        ];
        $extra = [
            'primaryExperience' => $experience ? ['role' => $experience->job_title, 'company' => $experience->organization] : null,
            'primaryEducationYear' => $education?->year,
            'experiences' => $user->experiences->skip(1)->map(fn ($row) => ['role' => $row->job_title, 'company' => $row->organization, 'period' => $period($row), 'responsibilities' => $row->responsibilities])->values()->all(),
            'educations' => $user->educations->sortBy('id')->skip(1)->map->only(['degree', 'institution', 'year'])->values()->all(),
            'certifications' => $user->certifications->sortBy('id')->skip(1)->pluck('name')->values()->all(),
        ];
        return ['fields' => $fields, 'extra' => $extra, 'document' => $document, 'version' => hash('sha256', json_encode([$fields, $extra, $profile?->private_resume_document, $experience?->id, $experience?->job_title, $experience?->organization, $education?->id, $certification?->id], JSON_THROW_ON_ERROR))];
    }

    public function submit(User $user, array $input): void
    {
        DB::transaction(function () use ($user, $input): void {
            $user = User::query()->lockForUpdate()->findOrFail($user->id);
            $snapshot = $this->snapshot($user);
            if (! hash_equals($snapshot['version'], $input['version'])) {
                throw ValidationException::withMessages(['version' => 'Your profile changed since this draft was opened. Reload the page before submitting.']);
            }
            $old = $snapshot['fields'];
            $data = array_map(fn ($value) => trim((string) $value), array_intersect_key($input, $old));
            if (array_key_exists('document', $input)) {
                // The new document owns repeatable CV entries; do not silently replace public records.
                $data = array_intersect_key($data, array_flip(['name', 'email', 'role', 'location', 'summary']));
            }
            $changed = fn ($key) => array_key_exists($key, $data) && $data[$key] !== $old[$key];
            // The résumé cannot silently change login credentials. The existing profile settings own email changes.
            if ($changed('email')) {
                throw ValidationException::withMessages(['email' => 'Change your account email from Edit profile before submitting.']);
            }
            $profile = $user->profile ?? new Profile();
            $profile->user_id = $user->id;
            if ($changed('name')) { $user->name = $data['name']; $user->save(); }
            foreach (['role' => 'role', 'summary' => 'about'] as $field => $column) {
                if ($changed($field)) $profile->{$column} = $data[$field];
            }
            if ($changed('location')) {
                $parts = array_map('trim', explode(',', $data['location'], 2));
                if (mb_strlen($parts[0]) > 120 || mb_strlen($parts[1] ?? '') > 120) {
                    throw ValidationException::withMessages(['location' => 'Use a city and country of at most 120 characters each.']);
                }
                $profile->city = $parts[0]; $profile->country = $parts[1] ?? '';
            }
            if ($changed('skills')) {
                $skills = array_values(array_unique(array_filter(array_map('trim', preg_split('/[,\r\n]+/', $data['skills'])))));
                if (count($skills) > 100 || collect($skills)->contains(fn ($skill) => mb_strlen($skill) > 50)) {
                    throw ValidationException::withMessages(['skills' => 'Use at most 100 skills, each no longer than 50 characters.']);
                }
                $profile->skills = $skills;
            }
            if ($changed('company')) {
                $details = $profile->editor_details ?? [];
                $details['current_organization'] = $data['company'];
                $profile->editor_details = $details;
            }
            // The prototype edits the leading entry only. Additional records remain untouched.
            $experience = $user->experiences->first();
            if ($changed('period') || $changed('responsibilities')) {
                $role = $experience?->job_title ?: ($data['role'] ?? '');
                $company = $experience?->organization ?: ($data['company'] ?? '');
                if (! $role || ! $company) throw ValidationException::withMessages(['period' => 'Enter a role and company before adding experience.']);
                $attributes = ['responsibilities' => $data['responsibilities'] ?? ''];
                if ($changed('period') || ! $experience) {
                    if (! preg_match('/^(\d{4}-(?:0[1-9]|1[0-2]))(?:\s*(?:–|—|to)\s*(\d{4}-(?:0[1-9]|1[0-2])|Present))?$/iu', $data['period'] ?? '', $match)) {
                        throw ValidationException::withMessages(['period' => 'Use YYYY-MM – YYYY-MM or YYYY-MM – Present.']);
                    }
                    $end = $match[2] ?? '';
                    $current = strcasecmp($end, 'Present') === 0;
                    if ($end && ! $current && $end < $match[1]) throw ValidationException::withMessages(['period' => 'The end month must not precede the start month.']);
                    $attributes += ['start_date' => $match[1], 'end_date' => $current || ! $end ? null : $end, 'is_current' => $current];
                }
                if ($experience) $experience->update($attributes);
                else $user->experiences()->create($attributes + ['job_title' => $role, 'organization' => $company]);
            }
            if ($changed('degree') || $changed('institution')) {
                if (empty($data['degree']) || empty($data['institution'])) throw ValidationException::withMessages(['degree' => 'Enter both degree and institution. Remove records from Edit profile.']);
                $education = $user->educations->sortBy('id')->first();
                $attributes = ['degree' => $data['degree'], 'institution' => $data['institution']];
                if ($education) $education->update($attributes); else $user->educations()->create($attributes);
            }
            if ($changed('certification')) {
                if (empty($data['certification'])) throw ValidationException::withMessages(['certification' => 'Remove existing certifications from Edit profile.']);
                // Never rename a verified credential or retain its verification for a new name.
                $cert = $user->certifications->sortBy('id')->first();
                if ($cert) throw ValidationException::withMessages(['certification' => 'Edit existing credentials in Edit profile.']);
                $user->certifications()->create(['name' => $data['certification']]);
            }
            if (array_key_exists('document', $input)) $profile->private_resume_document = $input['document'];
            if ($profile->isDirty()) $profile->save();
        });
    }
}
