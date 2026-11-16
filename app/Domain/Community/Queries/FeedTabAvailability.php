<?php

namespace App\Domain\Community\Queries;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Only load per-member bookmark/hidden counts for the first feed render. */
final class FeedTabAvailability
{
    /** @return array{saved: int, hidden: int} */
    public function forViewer(?User $viewer): array
    {
        $none = ['saved' => 0, 'hidden' => 0];
        if (! $viewer || $viewer->status !== 'active' || $viewer->is_admin
            || $viewer->onboarding_step < 3 || ! $viewer->hasVerifiedEmail()) {
            return $none;
        }

        $visible = static fn ($query) => $query
            ->where('posts.status', 'published')
            ->whereNull('posts.deleted_at')
            ->whereIn('posts.visibility', ['public', 'members']);

        $saved = DB::table('post_saves as saves')
            ->join('posts', 'posts.id', '=', 'saves.post_id')
            ->where('saves.user_id', $viewer->id);
        $visible($saved);
        $saved->whereNotExists(fn ($hidden) => $hidden->selectRaw('1')
            ->from('post_hides')->whereColumn('post_hides.post_id', 'saves.post_id')
            ->where('post_hides.user_id', $viewer->id));

        $hidden = DB::table('post_hides as hides')
            ->join('posts', 'posts.id', '=', 'hides.post_id')
            ->where('hides.user_id', $viewer->id);
        $visible($hidden);

        return ['saved' => (int) $saved->count(), 'hidden' => (int) $hidden->count()];
    }
}
