<?php

namespace App\Domain\Identity\Services;

use App\Models\User;

/** One access contract for profile pages and author links. Never loads relations. */
final class MemberProfileAccess
{
    public static function allows(?User $member, ?User $viewer): bool
    {
        if (! $member || ! $member->relationLoaded('profile')) {
            return false;
        }

        return self::allowsIdentity((int) $member->id, $member->status, (bool) $member->is_admin,
            $member->hasVerifiedEmail(), $member->profile?->visibility, $viewer);
    }

    /** Also used by the existing joined reaction roster projection. */
    public static function allowsIdentity(int $id, ?string $status, bool $administrator, bool $verified, ?string $visibility, ?User $viewer): bool
    {
        if ($id <= 0 || $status !== 'active' || $administrator || ! $verified || $visibility === null) {
            return false;
        }

        if ($viewer?->is_admin) {
            $viewer = null;
        }

        return $viewer?->id === $id || in_array($visibility, ProfileFieldPrivacy::profileAudiences($viewer), true);
    }

    public static function url(?User $member, ?User $viewer): ?string
    {
        return self::allows($member, $viewer) ? route('members.show', ['member' => $member->id], false) : null;
    }

    /** Serialize only the existing author preview and its authorized navigation URL. */
    public static function decorateAuthor(?User $author, ?User $viewer): void
    {
        if (! $author) {
            return;
        }

        $url = self::url($author, $viewer);
        $author->setAttribute('profile_url', $url);
        $author->makeHidden(['status', 'is_admin', 'email_verified_at']);
        if ($url === null) {
            $author->setRelation('profile', null);
        } else {
            ProfileFieldPrivacy::protectPostAuthor($author, $viewer);
        }
    }
}
