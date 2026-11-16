<?php

namespace App\Domain\Identity\Services;

use App\Models\User;

/** The existing profile-suite's ten equal criteria are authoritative on every member page. */
final class ProfileCompleteness
{
    public function percentage(User $user): int
    {
        $user->loadMissing('profile');
        $profile = $user->profile;

        // Only existence matters on a dashboard; never load the entire experience history.
        if ($user->relationLoaded('experiences')) {
            $hasExperience = $user->experiences->isNotEmpty();
        } else {
            if (! array_key_exists('experiences_exists', $user->getAttributes())) {
                $user->loadExists('experiences');
            }
            $hasExperience = (bool) $user->getAttribute('experiences_exists');
        }

        return count(array_filter([
            filled($user->name),
            filled($profile?->headline),
            filled($profile?->role),
            filled($profile?->industry),
            filled($profile?->country),
            filled($profile?->city),
            filled($profile?->about),
            filled($profile?->avatar_path),
            count($profile?->skills ?? []) > 0,
            $hasExperience,
        ])) * 10;
    }
}
