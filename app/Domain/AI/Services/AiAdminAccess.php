<?php

namespace App\Domain\AI\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

final class AiAdminAccess
{
    public function authorize(User $actor, string $permission): void
    {
        abort_unless($actor->is_admin === true && $actor->status === 'active' && $actor->email_verified_at !== null,
            403, 'An active, verified administrator account is required.');

        // Feature settings and editorial workflows belong to the administrator role.
        // Keep explicit authorization for unrelated financial and operational privileges.
        if (in_array($permission, ['ai.manage_features', 'ai.manage_editorial'], true)) {
            return;
        }

        if ($permission === 'ai.view_workspace') {
            return;
        }

        abort_unless(DB::table('ai_admin_permissions')
            ->where('user_id', $actor->id)->where('permission', $permission)->exists(),
            403, 'This AI administrative action requires a separately assigned permission.');
    }

    public function audit(?int $actorId, string $action, string $subject, int $id,
        ?array $before, ?array $after, string $reason): void
    {
        DB::table('ai_audit_events')->insert([
            'actor_id' => $actorId, 'action' => $action, 'subject_type' => $subject,
            'subject_id' => $id,
            'before_hash' => $before ? hash('sha256', json_encode($before, JSON_THROW_ON_ERROR)) : null,
            'after_hash' => $after ? hash('sha256', json_encode($after, JSON_THROW_ON_ERROR)) : null,
            'reason' => $reason, 'created_at' => now(),
        ]);
    }
}
