<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

final class SetPmCircleAdmin extends Command
{
    protected $signature = 'pm:admin {email : Exact email of an existing user} {--revoke : Remove administrator access}';

    protected $description = 'Grant or revoke PM Circle administrator access for an existing account.';

    public function handle(): int
    {
        $email = trim((string) $this->argument('email'));
        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $this->error('No existing PM Circle account has that email. Create and verify an account first.');

            return self::FAILURE;
        }

        $revoke = (bool) $this->option('revoke');
        if (! $revoke && ($user->email_verified_at === null || $user->status !== 'active')) {
            $this->error('Administrator access may only be granted to an active, verified account.');

            return self::FAILURE;
        }
        if (! $this->confirm(($revoke ? 'Revoke' : 'Grant').' administrator access for '.$user->email.'?', false)) {
            $this->info('No changes made.');

            return self::SUCCESS;
        }

        $user->forceFill(['is_admin' => ! $revoke])->save();
        $this->info($revoke ? 'Administrator access revoked.' : 'Administrator access granted.');

        return self::SUCCESS;
    }
}
