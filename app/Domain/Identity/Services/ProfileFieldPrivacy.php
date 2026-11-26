<?php

namespace App\Domain\Identity\Services;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Validation\Rule;

/**
 * Per-field restrictions can narrow existing profile visibility, never expand it.
 * An unset choice follows the current global profile setting for backwards compatibility.
 */
final class ProfileFieldPrivacy
{
    public static function groups(): array
    {
        return config('profile_privacy.groups', []);
    }

    public static function keys(): array
    {
        $keys = [];

        foreach (self::groups() as $group) {
            foreach ($group['fields'] as $field) {
                $keys[] = $field['key'];
            }
        }

        return $keys;
    }

    /** Both account and profile editors accept the same complete, allowlisted map. */
    public static function validationRules(): array
    {
        $keys = self::keys();
        $rules = ['field_visibility' => ['sometimes', 'required', 'array:'.implode(',', $keys), 'size:'.count($keys)]];
        foreach ($keys as $key) {
            $rules['field_visibility.'.$key] = ['required_with:field_visibility', Rule::in(['public', 'community', 'private'])];
        }

        return $rules;
    }

    /** @return array<string, string> */
    public static function defaults(Profile $profile): array
    {
        $default = match ($profile->visibility) {
            'public' => 'public',
            'private' => 'private',
            default => 'community',
        };

        return array_replace(array_fill_keys(self::keys(), $default), ['research_work' => 'private', 'interests' => 'private']);
    }

    /** @return array<string, string> */
    public static function choices(Profile $profile): array
    {
        $choices = self::defaults($profile);

        foreach (($profile->field_visibility ?? []) as $key => $value) {
            if (array_key_exists($key, $choices) && in_array($value, ['public', 'community', 'private'], true)) {
                $choices[$key] = $value;
            }
        }

        return $choices;
    }

    /** The same eligibility as the member community feed. */
    public static function profileAudiences(?User $viewer): array
    {
        return $viewer && ! $viewer->is_admin && $viewer->status === 'active'
            && $viewer->onboarding_step >= 3 && $viewer->hasVerifiedEmail()
            ? ['public', 'members_only'] : ['public'];
    }

    /** Preserve the post's published identity, but apply privacy to its profile preview. */
    public static function protectPostAuthor(?User $author, ?User $viewer): void
    {
        if (! $author?->profile) {
            return;
        }
        $profile = $author->profile;
        $profile->role = self::visible($profile, 'current_job_title', $viewer, $author->id) ? $profile->role : null;
        if (! self::visible($profile, 'profile_photo_url', $viewer, $author->id)) {
            $profile->avatar_path = null;
        }
        $profile->makeHidden(['visibility', 'field_visibility']);
    }

    public static function visible(Profile $profile, string $key, ?User $viewer, int $ownerId): bool
    {
        if ($viewer?->id === $ownerId) {
            return true;
        }

        if ($profile->visibility === 'private') {
            return false;
        }

        if ($profile->visibility === 'members_only' && (! $viewer || $viewer->is_admin)) {
            return false;
        }

        return match (self::choices($profile)[$key] ?? 'private') {
            'public' => true,
            'community' => $viewer !== null && ! $viewer->is_admin && $viewer->status === 'active',
            default => false,
        };
    }
}
