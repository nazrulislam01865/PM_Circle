<?php

namespace App\Console\Commands;

use App\Domain\AI\Services\AiAdminAccess;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/** Privileged server-console provisioning; never exposed through a member or admin HTTP route. */
final class AuthorizeAiUsageAdmin extends Command
{
    protected $signature = 'pm-ai:authorize-usage-admin
        {email : Existing verified administrator email}
        {--permissions=reports,quotas : Comma-separated reports,quotas,credits,features,editorial,prices}
        {--revoke : Revoke rather than grant the selected permissions}
        {--confirm : Required confirmation for permission changes}';

    protected $description = 'Provision separately scoped AI usage admin permissions for an existing administrator';

    public function handle(AiAdminAccess $access): int
    {
        if (! $this->option('confirm')) {
            $this->error('Add --confirm to explicitly authorize these permission changes.');
            return self::FAILURE;
        }
        $maps = ['reports' => 'ai.view_reports', 'quotas' => 'ai.manage_quotas',
            'credits' => 'ai.manage_credits', 'features' => 'ai.manage_features', 'editorial' => 'ai.manage_editorial', 'prices' => 'ai.manage_prices'];
        $codes = array_values(array_unique(array_map('trim', explode(',', (string) $this->option('permissions')))));
        if (! $codes || array_diff($codes, array_keys($maps))) {
            $this->error('Use only reports, quotas, credits, features, editorial, prices in --permissions.');
            return self::FAILURE;
        }
        $email = trim((string) $this->argument('email'));
        $admin = DB::table('users')->where('email', $email)->where('is_admin', true)
            ->where('status', 'active')->whereNotNull('email_verified_at')->first(['id', 'email']);
        if (! $admin) {
            $this->error('No active, verified administrator matches that email.');
            return self::FAILURE;
        }
        $revoke = (bool) $this->option('revoke');
        DB::transaction(function () use ($admin, $codes, $maps, $revoke, $access): void {
            DB::table('users')->where('id', $admin->id)->lockForUpdate()->first(['id']);
            foreach ($codes as $code) {
                $permission = $maps[$code];
                $query = DB::table('ai_admin_permissions')->where('user_id', $admin->id)
                    ->where('permission', $permission);
                $changed = $revoke ? $query->delete() : DB::table('ai_admin_permissions')->insertOrIgnore([
                    'user_id' => $admin->id, 'permission' => $permission,
                    'granted_by' => null, 'created_at' => now(),
                ]);
                if ($changed) {
                    $access->audit(null, $revoke ? 'permission.revoke' : 'permission.grant',
                        'ai_admin_permissions', $admin->id, null, ['permission' => $permission],
                        'Explicit server-console AI usage permission provision');
                }
            }
        }, 3);
        $this->info(($revoke ? 'Revoked' : 'Granted').' selected AI usage permissions for '.$admin->email);
        return self::SUCCESS;
    }
}
