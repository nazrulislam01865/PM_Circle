<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_workspace_credentials', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 100);
            $table->string('slot', 40);
            $table->text('secret_encrypted');
            $table->string('suffix', 4);
            $table->boolean('enabled')->default(true);
            $table->unsignedInteger('revision')->default(1);
            $table->string('health_code', 80)->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();
            $table->unique(['slot', 'name']);
        });
        Schema::create('ai_workspace_slots', function (Blueprint $table): void {
            $table->string('slot', 40)->primary();
            $table->foreignId('credential_id')->nullable()->constrained('ai_workspace_credentials')->restrictOnDelete();
        });
        DB::table('ai_workspace_slots')->insert(array_map(fn ($slot) => ['slot' => $slot], [
            'api_key', 'daily_challenge_api_key', 'post_check_api_key', 'gemini_api_key', 'resume_extract_api_key',
        ]));
        Schema::create('ai_workspace_models', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 80)->unique();
            $table->string('name', 100);
            $table->boolean('enabled')->default(true);
            $table->timestamps();
        });
        Schema::create('ai_workspace_limits', function (Blueprint $table): void {
            $table->string('scope', 50)->primary();
            $table->decimal('daily_usd', 18, 6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_workspace_limits');
        Schema::dropIfExists('ai_workspace_models');
        Schema::dropIfExists('ai_workspace_slots');
        Schema::dropIfExists('ai_workspace_credentials');
    }
};
