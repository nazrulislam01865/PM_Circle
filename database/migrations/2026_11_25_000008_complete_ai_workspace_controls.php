<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_workspace_feature_routes', function (Blueprint $table): void {
            $table->string('feature_code', 48)->primary();
            $table->foreignId('primary_credential_id')->nullable()->constrained('ai_workspace_credentials')->restrictOnDelete();
            $table->foreignId('backup_credential_id')->nullable()->constrained('ai_workspace_credentials')->restrictOnDelete();
            $table->string('backup_model', 80)->nullable();
            $table->string('strategy', 24)->default('primary_only');
            $table->decimal('daily_usd', 18, 6)->nullable();
            $table->timestamps();
        });
        Schema::table('ai_workspace_models', function (Blueprint $table): void {
            $table->string('availability', 12)->default('Active');
            $table->string('capability', 24)->default('Text generation');
        });
        DB::table('ai_workspace_models')->where('enabled', false)->update(['availability' => 'Disabled']);
        DB::table('ai_workspace_models')->where('code', 'omni-moderation-latest')->update(['capability' => 'Moderation']);
        Schema::table('ai_requests', function (Blueprint $table): void {
            $table->json('routing_snapshot')->nullable();
            $table->string('credential_ref', 60)->nullable();
            $table->index(['created_at', 'credential_ref'], 'ai_requests_credential_reporting_idx');
        });
        DB::table('ai_workspace_slots')->insertOrIgnore(['slot' => 'anthropic_api_key']);
        DB::table('ai_workspace_providers')->where('adapter', 'anthropic')->where('name', 'Anthropic')->update(['is_default' => true]);
        // Backfill the current month's existing global gateway ledger. Include pending
        // allocations so their eventual settlement updates both new scopes exactly once.
        $month = now('UTC')->startOfMonth()->toDateString();
        $global = DB::table('ai_budget_usage')->where('scope', 'global')->where('utc_day', '>=', $month);
        if (! (clone $global)->exists()) return;
        $sums = (clone $global)->selectRaw('COALESCE(SUM(spent_usd),0) as spent, COALESCE(SUM(reserved_usd),0) as reserved')->first();
        if (DB::table('ai_budget_usage')->where('scope', 'global-month')->where('utc_day', $month)->exists()) return;
        $monthlyId = DB::table('ai_budget_usage')->insertGetId(['scope' => 'global-month', 'utc_day' => $month, 'spent_usd' => $sums->spent, 'reserved_usd' => $sums->reserved]);
        $allocations = DB::table('ai_request_budget_allocations as a')->join('ai_budget_usage as b', 'a.bucket_id', '=', 'b.id')->join('ai_requests as r', 'a.request_id', '=', 'r.id')
            ->where('b.scope', 'global')->where('b.utc_day', '>=', $month);
        $features = (clone $allocations)->selectRaw('r.feature_code, b.utc_day, SUM(CASE WHEN a.finalized THEN a.actual_usd ELSE 0 END) as spent, SUM(CASE WHEN a.finalized THEN 0 ELSE a.reserved_usd END) as reserved')->groupBy('r.feature_code', 'b.utc_day')->get();
        $featureBuckets = [];
        foreach ($features as $feature) {
            $featureBuckets[$feature->feature_code.'|'.$feature->utc_day] = DB::table('ai_budget_usage')->insertGetId(['scope' => 'feature:'.$feature->feature_code, 'utc_day' => $feature->utc_day, 'spent_usd' => $feature->spent, 'reserved_usd' => $feature->reserved]);
        }
        (clone $allocations)->where('a.finalized', false)->select('a.id', 'a.request_id', 'a.reserved_usd', 'r.feature_code', 'b.utc_day')->orderBy('a.id')->chunkById(500, function ($pending) use ($monthlyId, $featureBuckets): void {
            $rows = [];
            foreach ($pending as $allocation) {
                foreach ([$monthlyId, $featureBuckets[$allocation->feature_code.'|'.$allocation->utc_day]] as $bucket) {
                    $rows[] = ['request_id' => $allocation->request_id, 'bucket_id' => $bucket, 'reserved_usd' => $allocation->reserved_usd];
                }
            }
            DB::table('ai_request_budget_allocations')->insert($rows);
        }, 'a.id', 'id');
    }

    public function down(): void
    {
        throw new \RuntimeException('Forward-only financial ledger migration. Restore a verified pre-migration backup instead.');
    }
};
