<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('temporary_memberships', function (Blueprint $table): void {
            // Existing grants did not record a selected term. Do not invent one.
            $table->unsignedSmallInteger('months')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
        });
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE temporary_memberships ADD CONSTRAINT temporary_memberships_valid_term CHECK ((months IS NULL AND starts_at IS NULL AND ends_at IS NULL) OR (plan_code IN ('plus', 'pro') AND months IS NOT NULL AND starts_at IS NOT NULL AND ends_at IS NOT NULL AND months BETWEEN 1 AND 60 AND ends_at > starts_at))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE temporary_memberships DROP CONSTRAINT IF EXISTS temporary_memberships_valid_term');
        }
        Schema::table('temporary_memberships', function (Blueprint $table): void {
            $table->dropColumn(['months', 'starts_at', 'ends_at']);
        });
    }
};
