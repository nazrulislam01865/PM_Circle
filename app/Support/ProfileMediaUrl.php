<?php

namespace App\Support;

/** Present existing public-disk profile photos without depending on public/storage. */
final class ProfileMediaUrl
{
    public static function for(?string $path, string $kind): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        $directory = $kind === 'cover' ? 'profile-covers' : 'profile-avatars';
        $prefix = '/storage/'.$directory.'/';
        if (! str_starts_with($path, $prefix)) {
            return $path; // Preserve bundled demo photos and external image URLs.
        }

        $filename = substr($path, strlen($prefix));
        if (! preg_match('/\A[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)\z/iD', $filename)) {
            return null; // Do not expose malformed legacy storage paths.
        }

        return '/profile-media/'.($kind === 'cover' ? 'cover' : 'avatar').'/'.$filename;
    }
}
