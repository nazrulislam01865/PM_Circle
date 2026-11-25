<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Legacy moderation costs were outside the gateway ledger. Add known costs for
        // the current month once, but do not fabricate historic credential attribution.
        $month = now('UTC')->startOfMonth()->toDateString();
        foreach (['post_check_runs', 'comment_check_runs'] as $table) {
            Schema::table($table, fn (Blueprint $table) => $table->boolean('workspace_accounted')->default(false));
            $rows = DB::table($table)->where('created_at', '>=', $month)->where('cost_usd', '>', 0)
                ->selectRaw('DATE(created_at) as day, credential_ref, credential_day, SUM(cost_usd) as spent')->groupByRaw('DATE(created_at), credential_ref, credential_day')->get();
            foreach ($rows as $row) {
                $scopes = [['global', $row->day], ['global-month', $month], ['moderation', $row->day], ['feature:feed_moderation', $row->day]];
                if ($row->credential_ref && $row->credential_day) $scopes[] = [$row->credential_ref, $row->credential_day];
                foreach ($scopes as [$scope, $day]) {
                    DB::table('ai_budget_usage')->insertOrIgnore(['scope' => $scope, 'utc_day' => $day, 'reserved_usd' => 0, 'spent_usd' => 0]);
                    DB::table('ai_budget_usage')->where('scope', $scope)->where('utc_day', $day)->increment('spent_usd', (float) $row->spent);
                }
            }
        }
    }

    public function down(): void
    {
        throw new RuntimeException('Financial ledger migration is forward-only. Restore from a verified pre-migration backup if required.');
    }
};
