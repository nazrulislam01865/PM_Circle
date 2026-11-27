<?php

namespace App\Console\Commands;

use App\Domain\Achievements\Queries\MemberAchievements;
use App\Models\User;
use Illuminate\Console\Command;

final class RecordExistingAchievementAwards extends Command
{
    protected $signature = 'achievements:record-existing {--force : Confirm the one-time member scan}';
    protected $description = 'Record currently qualifying member badges before administrators change the imported rules';

    public function handle(MemberAchievements $achievements): int
    {
        if (! $this->option('force') && ! $this->confirm('Scan existing active members and record verified awards?')) return self::FAILURE;
        $processed = 0;
        User::query()->where('is_admin', false)->where('status', 'active')->where('onboarding_step', '>=', 3)
            ->when(config('pm-circle.email_verification_required'), fn ($query) => $query->whereNotNull('email_verified_at'))
            ->chunkById(100, function ($members) use ($achievements, &$processed): void {
                foreach ($members as $member) {
                    $achievements->snapshot($member, includeRecord: false);
                    $processed++;
                }
            });
        $this->info("Processed {$processed} members. Existing records were not duplicated.");
        return self::SUCCESS;
    }
}
