<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_courses', function (Blueprint $table): void {
            $table->boolean('certificate_enabled')->default(false);
        });
        // Existing courses previously promised a certificate on completion.
        DB::table('learning_courses')->update(['certificate_enabled' => true]);

        Schema::create('learning_course_completions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('learning_courses')->cascadeOnDelete();
            $table->string('course_title');
            $table->timestamp('completed_at');
            $table->unique(['user_id', 'course_id'], 'learning_course_completion_unique');
        });
        // Before this change all completed courses generated a certificate. Preserve historical awards.
        DB::table('learning_course_completions')->insertUsing(
            ['user_id', 'course_id', 'course_title', 'completed_at'],
            DB::table('learning_course_certificates')->select('user_id', 'course_id', 'course_title', 'issued_at'),
        );
    }

    public function down(): void
    {
        // The completion ledger contains new historical data. Roll back application code only.
        throw new \RuntimeException('Non-destructive rollback only: retain course completions and certificate settings.');
    }
};
