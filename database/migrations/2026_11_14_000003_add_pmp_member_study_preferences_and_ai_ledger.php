<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            $table->date('pmp_target_exam_date')->nullable();
        });

        Schema::table('pmp_exam_attempts', function (Blueprint $table): void {
            $table->index(['user_id', 'id'], 'pmp_attempt_member_recent_idx');
        });

        // Read-only ledger until credit grants and AI assistance are enabled.
        // No payment, automatic credit issuance or refill operation is introduced.
        Schema::create('pmp_ai_credit_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('attempt_id')->nullable()->constrained('pmp_exam_attempts')->nullOnDelete();
            $table->string('kind', 32); // allocation, question_explanation, follow_up, study_insight
            $table->integer('tokens'); // positive = granted; negative = consumed
            $table->string('reference', 100)->nullable(); // optional idempotency reference
            $table->text('response')->nullable(); // validated, cached educational reply
            $table->timestamps();
            $table->index(['user_id', 'kind', 'created_at']);
            $table->unique(['user_id', 'reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pmp_ai_credit_events');
        Schema::table('pmp_exam_attempts', function (Blueprint $table): void {
            $table->dropIndex('pmp_attempt_member_recent_idx');
        });
        Schema::table('profiles', function (Blueprint $table): void {
            $table->dropColumn('pmp_target_exam_date');
        });
    }
};
