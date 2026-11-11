<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('career_jobs', function (Blueprint $table): void {
            $table->id();
            $table->string('slug', 48)->unique();
            $table->char('fingerprint', 64)->unique();
            $table->string('source', 32);
            $table->string('external_id', 191)->nullable();
            $table->string('title');
            $table->string('company', 200);
            $table->string('location', 200)->nullable();
            $table->string('job_type', 32)->nullable();
            $table->text('description')->nullable();
            $table->date('posted_at')->nullable();
            $table->decimal('salary_min', 14, 2)->nullable();
            $table->decimal('salary_max', 14, 2)->nullable();
            $table->string('salary_currency', 8)->nullable();
            $table->string('salary_interval', 16)->nullable();
            $table->unsignedInteger('vacancies')->nullable();
            $table->string('experience', 160)->nullable();
            $table->string('source_url', 2048);
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at');
            $table->timestamps();
            $table->index(['last_seen_at', 'posted_at', 'id']);
            $table->index(['job_type', 'last_seen_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('career_jobs');
    }
};
