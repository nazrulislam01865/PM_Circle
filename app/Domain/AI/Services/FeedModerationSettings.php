<?php

namespace App\Domain\AI\Services;

use Illuminate\Support\Facades\DB;

final class FeedModerationSettings
{
    /** Read only for clean decisions, not on unrelated requests. A missing row fails closed. */
    public function holdCleanContent(): bool
    {
        return (bool) DB::table('feed_moderation_settings')->where('id', 1)->firstOrFail()->hold_clean_content;
    }
}
