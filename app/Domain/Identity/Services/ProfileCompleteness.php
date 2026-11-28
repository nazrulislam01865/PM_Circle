<?php

namespace App\Domain\Identity\Services;

use App\Models\User;

/** Current saved profile coverage, with the original ten reward criteria kept intact. */
final class ProfileCompleteness
{
    /** Original eligibility score for the existing reward and badge contracts. */
    public function percentage(User $user): int
    {
        $user->loadMissing('profile');
        $presence = $this->sectionPresence($user, ['experiences']);

        return count(array_filter($this->coreChecks($user, $presence['experiences']))) * 10;
    }

    /** Displayed progress includes the current detailed editor's fields and sections. */
    public function profilePercentage(User $user): int
    {
        return $this->scores($user)['profile'];
    }

    /** Compute both scores together on Home and My Profile, without duplicate reads. */
    public function scores(User $user): array
    {
        $user->loadMissing('profile');
        $profile = $user->profile;
        $details = $profile?->editor_details ?? [];
        $presence = $this->sectionPresence($user, ['experiences', 'profileProjects', 'educations', 'certifications']);
        $core = $this->coreChecks($user, $presence['experiences']);
        // The progress bar measures the main professional profile, not optional
        // extras (photo, social links, portfolio, research, awards or interests).
        // Use fixed criteria so deleting and restoring a counted section is reversible.
        $checks = [
            'Full name' => $core['name'],
            'Professional headline' => $core['headline'],
            'Current role' => $core['role'],
            'Location' => filled($details['compact']['display_location'] ?? implode(', ', array_filter([$profile?->city, $profile?->country]))),
            'Email' => filled($user->email),
            'Phone' => filled($profile?->phone),
            'Personal profile summary' => $core['about'],
            'Skills' => $core['skills'],
            'Work experience' => $presence['experiences'],
            'Projects' => $presence['profileProjects'],
            'Education' => $presence['educations'],
            'Certifications' => $presence['certifications'],
            'Languages' => $this->hasText($profile?->languages ?? []),
        ];

        return [
            'profile' => intdiv(count(array_filter($checks)) * 100, count($checks)),
            'core' => count(array_filter($core)) * 10,
            'missing' => array_keys(array_filter($checks, fn (bool $complete): bool => ! $complete)),
        ];
    }

    private function coreChecks(User $user, bool $hasExperience): array
    {
        $profile = $user->profile;

        return [
            'name' => filled($user->name),
            'headline' => filled($profile?->headline),
            'role' => filled($profile?->role),
            'industry' => filled($profile?->industry),
            'country' => filled($profile?->country),
            'city' => filled($profile?->city),
            'about' => filled($profile?->about),
            'avatar' => filled($profile?->avatar_path),
            'skills' => (bool) array_filter($profile?->skills ?? [], fn ($skill) => is_string($skill) && filled($skill)),
            'experiences' => $hasExperience,
        ];
    }

    /** Use eager-loaded relations when available; combine missing existence checks in one query. */
    private function sectionPresence(User $user, array $relations): array
    {
        $missing = [];
        foreach ($relations as $relation) {
            $attribute = \Illuminate\Support\Str::snake($relation).'_exists';
            if (! $user->relationLoaded($relation) && ! array_key_exists($attribute, $user->getAttributes())) {
                $missing[] = $relation;
            }
        }
        if ($missing !== []) {
            $user->loadExists($missing);
        }

        $result = [];
        foreach ($relations as $relation) {
            $attribute = \Illuminate\Support\Str::snake($relation).'_exists';
            $result[$relation] = $user->relationLoaded($relation)
                ? $user->getRelation($relation)->isNotEmpty()
                : (bool) $user->getAttribute($attribute);
        }

        return $result;
    }

    private function hasText(array $values): bool
    {
        return (bool) array_filter($values, fn ($value) => is_string($value) && filled($value));
    }
}
