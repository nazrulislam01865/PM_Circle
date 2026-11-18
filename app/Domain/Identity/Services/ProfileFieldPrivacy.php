<?php

namespace App\Domain\Identity\Services;

use App\Models\Profile;
use App\Models\User;

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

    /** @return array<string, string> */
    public static function defaults(Profile $profile): array
    {
        $default = match ($profile->visibility) {
            'public' => 'public',
            'private' => 'private',
            default => 'community',
        };

        return array_fill_keys(self::keys(), $default);
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
