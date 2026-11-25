<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('ai_workspace_credentials', function (Blueprint $table): void {
            $table->unsignedSmallInteger('priority')->default(1);
            $table->decimal('daily_budget_usd', 18, 6)->nullable();
        });
        foreach (['post_check_runs', 'comment_check_runs'] as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->string('credential_ref', 60)->nullable();
                $table->date('credential_day')->nullable();
                $table->index(['credential_day', 'credential_ref'], 'credential_day_ref_idx_'.$table->getTable());
            });
        }
    }

    public function down(): void
    {
        foreach (['post_check_runs', 'comment_check_runs'] as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->dropIndex('credential_day_ref_idx_'.$table->getTable());
                $table->dropColumn(['credential_day', 'credential_ref']);
            });
        }
        Schema::table('ai_workspace_credentials', fn (Blueprint $table) => $table->dropColumn(['priority', 'daily_budget_usd']));
    }
};
