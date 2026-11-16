<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_features', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 48)->unique();
            $table->boolean('enabled')->default(false);
            $table->string('min_plan', 12)->default('pro');
            $table->string('model', 80)->default('gpt-4.1-mini');
            $table->unsignedInteger('max_input_chars')->default(4000);
            $table->unsignedInteger('max_output_tokens')->default(500);
            $table->unsignedInteger('credit_tariff')->default(0);
            $table->unsignedInteger('tariff_version')->default(1);
            $table->unsignedInteger('prompt_version')->default(1);
            $table->unsignedInteger('daily_limit')->nullable();
            $table->timestamps();
        });
        Schema::create('ai_prompt_versions', function (Blueprint $table): void {
            $table->id();
            $table->string('feature_code', 48);
            $table->unsignedInteger('version');
            $table->text('template');
            $table->string('evaluation_reference', 160);
            $table->json('output_schema');
            $table->string('schema_version', 40);
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->unique(['feature_code', 'version']);
        });
        Schema::create('ai_model_prices', function (Blueprint $table): void {
            $table->id();
            $table->string('model', 80);
            $table->timestamp('effective_from');
            $table->decimal('input_usd_per_m', 16, 8);
            $table->decimal('cached_input_usd_per_m', 16, 8);
            $table->decimal('output_usd_per_m', 16, 8);
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['model', 'effective_from']);
        });
        Schema::create('ai_credit_wallets', function (Blueprint $table): void {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('available')->default(0);
            $table->unsignedBigInteger('reserved')->default(0);
            $table->unsignedBigInteger('spent_lifetime')->default(0);
            $table->unsignedBigInteger('version')->default(0);
            $table->timestamps();
        });
        Schema::create('ai_credit_grants', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('source', 35);
            $table->string('source_ref', 150);
            $table->unsignedBigInteger('total');
            $table->unsignedBigInteger('available');
            $table->unsignedBigInteger('reserved')->default(0);
            $table->unsignedBigInteger('consumed')->default(0);
            $table->unsignedBigInteger('expired')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'source', 'source_ref']);
            $table->index(['user_id', 'expires_at']);
        });
        Schema::create('ai_conversations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('feature_scope', 50);
            $table->string('subject_type', 50)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('status', 24)->default('active');
            $table->timestamp('retention_until')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'feature_scope', 'created_at']);
        });
        Schema::create('ai_exam_contexts', function (Blueprint $table): void {
            $table->foreignId('conversation_id')->primary()->constrained('ai_conversations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('attempt_id')->constrained('pmp_exam_attempts')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('pmp_exam_questions')->restrictOnDelete();
            $table->unique(['user_id', 'attempt_id', 'question_id'], 'ai_exam_context_one_per_question');
        });
        Schema::create('ai_plan_allowances', function (Blueprint $table): void {
            $table->id();
            $table->string('plan_code', 12);
            $table->unsignedInteger('version');
            $table->unsignedInteger('monthly_credits');
            $table->timestamp('active_from_utc');
            $table->foreignId('approved_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['plan_code', 'version']);
        });
        Schema::create('ai_chat_limit_policies', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('version');
            $table->string('plan_code', 12);
            $table->string('feature_scope', 50);
            $table->unsignedInteger('max_daily');
            $table->unsignedInteger('max_cycle');
            $table->unsignedInteger('max_per_conversation');
            $table->unsignedInteger('max_concurrent');
            $table->timestamp('active_from_utc');
            $table->boolean('enabled')->default(true);
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['plan_code', 'feature_scope', 'version'], 'ai_chat_policy_version_unique');
            $table->index(['plan_code', 'feature_scope', 'active_from_utc'], 'ai_chat_policy_active_index');
        });
        Schema::create('ai_chat_user_overrides', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('feature_scope', 50);
            $table->unsignedInteger('max_daily')->nullable();
            $table->unsignedInteger('max_cycle')->nullable();
            $table->unsignedInteger('max_per_conversation')->nullable();
            $table->unsignedInteger('max_concurrent')->nullable();
            $table->timestamp('starts_at_utc');
            $table->timestamp('ends_at_utc')->nullable();
            $table->string('reason', 500);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->string('status', 24)->default('active');
            $table->timestamps();
            $table->index(['user_id', 'feature_scope', 'starts_at_utc'], 'ai_chat_override_lookup');
        });
        Schema::create('ai_chat_usage_buckets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('scope_key', 130);
            $table->string('window_kind', 25);
            $table->timestamp('window_start_utc');
            $table->timestamp('window_end_utc');
            $table->unsignedInteger('completed_count')->default(0);
            $table->unsignedInteger('reserved_count')->default(0);
            $table->unsignedBigInteger('version')->default(0);
            $table->unique(['user_id', 'scope_key', 'window_kind', 'window_start_utc'], 'ai_chat_bucket_unique');
        });
        Schema::create('ai_requests', function (Blueprint $table): void {
            $table->id();
            $table->uuid('request_uuid')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('feature_code', 48);
            $table->string('client_key', 120)->nullable();
            $table->string('subject_type', 50)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->foreignId('conversation_id')->nullable()->constrained('ai_conversations')->nullOnDelete();
            $table->string('status', 35)->default('queued');
            $table->unsignedInteger('prompt_version')->default(1);
            $table->unsignedInteger('max_output_tokens')->default(500);
            $table->unsignedInteger('schema_version')->default(1);
            $table->unsignedInteger('tariff_version')->default(1);
            $table->string('model', 80);
            $table->string('provider', 35)->default('openai');
            $table->string('provider_request_id', 120)->nullable();
            $table->text('payload_encrypted');
            $table->longText('result_encrypted')->nullable();
            $table->unsignedInteger('estimated_hold')->default(0);
            $table->unsignedInteger('final_charge')->default(0);
            $table->unsignedInteger('input_tokens')->default(0);
            $table->unsignedInteger('cached_tokens')->default(0);
            $table->unsignedInteger('output_tokens')->default(0);
            $table->decimal('cost_usd', 18, 9)->nullable();
            $table->json('model_price_snapshot')->nullable();
            $table->unsignedInteger('chat_policy_version')->nullable();
            $table->json('resolved_limits_json')->nullable();
            $table->unsignedTinyInteger('chat_unit_count')->default(0);
            $table->string('error_code', 80)->nullable();
            $table->unsignedTinyInteger('dispatch_count')->default(1);
            $table->timestamp('lease_until')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'client_key'], 'ai_member_request_dedupe');
            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'status']);
            $table->index(['status', 'lease_until']);
        });
        Schema::create('ai_request_allocations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('request_id')->constrained('ai_requests')->cascadeOnDelete();
            $table->foreignId('grant_id')->constrained('ai_credit_grants')->restrictOnDelete();
            $table->unsignedInteger('reserved_amount');
            $table->unsignedInteger('charged_amount')->default(0);
            $table->unsignedInteger('released_amount')->default(0);
            $table->unique(['request_id', 'grant_id']);
        });
        Schema::create('ai_credit_ledger', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('grant_id')->nullable()->constrained('ai_credit_grants')->restrictOnDelete();
            $table->foreignId('request_id')->nullable()->constrained('ai_requests')->restrictOnDelete();
            $table->string('kind', 35);
            $table->bigInteger('available_delta');
            $table->bigInteger('reserved_delta');
            $table->bigInteger('consumed_delta');
            $table->string('event_ref', 180)->unique();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'created_at']);
        });
        Schema::create('ai_chat_request_allocations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('request_id')->constrained('ai_requests')->cascadeOnDelete();
            $table->foreignId('bucket_id')->constrained('ai_chat_usage_buckets')->restrictOnDelete();
            $table->string('state', 20)->default('reserved');
            $table->unique(['request_id', 'bucket_id']);
        });
        Schema::create('ai_chat_usage_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('request_id')->constrained('ai_requests')->restrictOnDelete();
            $table->foreignId('bucket_id')->constrained('ai_chat_usage_buckets')->restrictOnDelete();
            $table->string('kind', 20);
            $table->integer('completed_delta');
            $table->integer('reserved_delta');
            $table->string('event_ref', 160)->unique();
            $table->timestamp('created_at')->useCurrent();
        });
        Schema::create('ai_resume_consents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resume_id')->constrained('profile_resumes')->cascadeOnDelete();
            $table->foreignId('request_id')->constrained('ai_requests')->restrictOnDelete();
            $table->string('consent_version', 24)->default('ai-resume-v1');
            $table->timestamp('granted_at');
            $table->timestamp('revoked_at')->nullable();
            $table->unique('request_id');
        });
        Schema::create('ai_resume_drafts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resume_id')->constrained('profile_resumes')->cascadeOnDelete();
            $table->foreignId('request_id')->constrained('ai_requests')->restrictOnDelete();
            $table->string('section', 60);
            $table->unsignedInteger('version');
            $table->longText('suggested_text_encrypted');
            $table->string('status', 20)->default('pending');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique('request_id');
            $table->unique(['resume_id', 'section', 'version']);
        });
        Schema::create('ai_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->constrained('ai_conversations')->cascadeOnDelete();
            $table->foreignId('request_id')->nullable()->constrained('ai_requests')->nullOnDelete();
            $table->string('role', 15);
            $table->longText('content_encrypted');
            $table->string('client_key', 120)->nullable();
            $table->unsignedInteger('token_count')->default(0);
            $table->timestamps();
            $table->unique(['conversation_id', 'client_key']);
            $table->index(['conversation_id', 'created_at']);
        });
        Schema::create('scenario_rubric_versions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('scenario_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->json('criteria_json');
            $table->unsignedInteger('max_score');
            $table->foreignId('approved_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['scenario_id', 'version']);
        });
        Schema::create('scenario_ai_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('response_id')->constrained('scenario_responses')->cascadeOnDelete();
            $table->foreignId('ai_request_id')->constrained('ai_requests')->restrictOnDelete();
            $table->foreignId('rubric_version_id')->constrained('scenario_rubric_versions')->restrictOnDelete();
            $table->json('scores_json');
            $table->unsignedInteger('total_score');
            $table->json('feedback_json');
            $table->string('review_status', 22)->default('validated');
            $table->unsignedInteger('revision')->default(1);
            $table->timestamps();
            $table->unique(['response_id', 'revision']);
            $table->unique('ai_request_id');
        });
        Schema::create('ai_editorial_drafts', function (Blueprint $table): void {
            $table->id();
            $table->string('feature', 48);
            $table->string('slot_key', 100);
            $table->json('source_refs_json')->nullable();
            $table->timestamp('publication_at')->nullable();
            $table->longText('payload_encrypted')->nullable();
            $table->string('status', 26)->default('queued');
            $table->boolean('created_by_ai')->default(true);
            $table->foreignId('request_id')->nullable()->constrained('ai_requests')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->unique(['feature', 'slot_key']);
            $table->index(['feature', 'status', 'created_at']);
        });
        Schema::create('ai_editorial_draft_versions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('draft_id')->constrained('ai_editorial_drafts')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->longText('payload_encrypted');
            $table->foreignId('editor_id')->constrained('users')->restrictOnDelete();
            $table->string('reason', 500);
            $table->timestamps();
            $table->unique(['draft_id', 'version']);
        });
        Schema::create('trend_sources', function (Blueprint $table): void {
            $table->id();
            $table->string('canonical_url', 500)->unique();
            $table->string('publisher', 160);
            $table->timestamp('published_at')->nullable();
            $table->string('content_hash', 64);
            $table->string('rights_status', 24);
            $table->longText('excerpt_encrypted');
            $table->foreignId('verified_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
        Schema::create('trend_articles', function (Blueprint $table): void {
            $table->id();
            $table->string('slug', 180)->unique();
            $table->string('title', 180);
            $table->text('summary');
            $table->longText('body_markdown');
            $table->string('status', 24)->default('draft');
            $table->boolean('ai_generated')->default(true);
            $table->foreignId('approved_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });
        Schema::create('trend_article_sources', function (Blueprint $table): void {
            $table->foreignId('article_id')->constrained('trend_articles')->cascadeOnDelete();
            $table->foreignId('source_id')->constrained('trend_sources')->restrictOnDelete();
            $table->primary(['article_id', 'source_id']);
        });
        Schema::create('trend_article_versions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('article_id')->constrained('trend_articles')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->foreignId('editor_id')->constrained('users')->restrictOnDelete();
            $table->longText('body_markdown');
            $table->string('change_summary', 200);
            $table->timestamps();
            $table->unique(['article_id', 'version']);
        });
        Schema::create('ai_budget_usage', function (Blueprint $table): void {
            $table->id();
            $table->string('scope', 60);
            $table->date('utc_day');
            $table->decimal('reserved_usd', 18, 9)->default(0);
            $table->decimal('spent_usd', 18, 9)->default(0);
            $table->unsignedBigInteger('version')->default(0);
            $table->unique(['scope', 'utc_day']);
        });
        Schema::create('ai_request_budget_allocations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('request_id')->constrained('ai_requests')->restrictOnDelete();
            $table->foreignId('bucket_id')->constrained('ai_budget_usage')->restrictOnDelete();
            $table->decimal('reserved_usd', 18, 9);
            $table->decimal('actual_usd', 18, 9)->default(0);
            $table->boolean('finalized')->default(false);
            $table->unique(['request_id', 'bucket_id']);
        });
        Schema::create('ai_credit_packages', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 55);
            $table->unsignedInteger('version');
            $table->string('title', 120);
            $table->unsignedInteger('credits');
            $table->unsignedBigInteger('price_minor');
            $table->string('currency', 3)->default('BDT');
            $table->boolean('active')->default(false);
            $table->unsignedInteger('expires_after_days')->nullable();
            $table->timestamps();
            $table->unique(['code', 'version']);
        });
        Schema::create('ai_credit_orders', function (Blueprint $table): void {
            $table->id();
            $table->uuid('order_uuid')->unique();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('package_id')->constrained('ai_credit_packages')->restrictOnDelete();
            $table->json('package_snapshot_json');
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3);
            $table->string('status', 20)->default('pending');
            $table->string('gateway_ref', 140)->nullable();
            $table->string('idempotency_key', 120);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'idempotency_key']);
            $table->unique('gateway_ref');
        });
        Schema::create('ai_gateway_events', function (Blueprint $table): void {
            $table->id();
            $table->string('provider', 45);
            $table->string('provider_event_id', 140);
            $table->boolean('verified')->default(false);
            $table->string('payload_hash', 64);
            $table->string('processing_status', 25)->default('pending');
            $table->timestamps();
            $table->unique(['provider', 'provider_event_id']);
        });
        Schema::create('ai_audit_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 80);
            $table->string('subject_type', 60);
            $table->unsignedBigInteger('subject_id');
            $table->string('before_hash', 64)->nullable();
            $table->string('after_hash', 64)->nullable();
            $table->string('reason', 500);
            $table->timestamp('created_at')->useCurrent();
        });
        Schema::create('ai_admin_permissions', function (Blueprint $table): void {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('permission', 70);
            $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->primary(['user_id', 'permission']);
        });

        // Explicit invariants backed by PostgreSQL, in addition to Laravel validation.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE ai_credit_grants ADD CONSTRAINT ai_grant_partition CHECK (total = available + reserved + consumed + expired AND total > 0 AND available >= 0 AND reserved >= 0 AND consumed >= 0 AND expired >= 0)');
            DB::statement('ALTER TABLE ai_credit_wallets ADD CONSTRAINT ai_wallet_nonnegative CHECK (available >= 0 AND reserved >= 0 AND spent_lifetime >= 0)');
            DB::statement('ALTER TABLE ai_chat_usage_buckets ADD CONSTRAINT ai_chat_bucket_nonnegative CHECK (completed_count >= 0 AND reserved_count >= 0)');
            DB::statement('ALTER TABLE ai_budget_usage ADD CONSTRAINT ai_budget_nonnegative CHECK (reserved_usd >= 0 AND spent_usd >= 0)');
            DB::statement('ALTER TABLE ai_request_allocations ADD CONSTRAINT ai_allocation_partition CHECK (reserved_amount > 0 AND charged_amount >= 0 AND released_amount >= 0 AND (reserved_amount = charged_amount + released_amount OR (charged_amount = 0 AND released_amount = 0)))');
        }
    }

    public function down(): void
    {
        foreach (['ai_admin_permissions', 'ai_audit_events', 'ai_gateway_events', 'ai_credit_orders',
            'ai_credit_packages', 'ai_request_budget_allocations', 'ai_budget_usage', 'trend_article_versions', 'trend_article_sources', 'trend_articles', 'trend_sources', 'ai_editorial_draft_versions', 'ai_editorial_drafts', 'scenario_ai_reviews', 'scenario_rubric_versions',
            'ai_messages', 'ai_resume_drafts', 'ai_resume_consents', 'ai_chat_usage_events', 'ai_chat_request_allocations', 'ai_credit_ledger',
            'ai_request_allocations', 'ai_requests', 'ai_chat_usage_buckets', 'ai_chat_user_overrides',
            'ai_chat_limit_policies', 'ai_plan_allowances', 'ai_exam_contexts', 'ai_conversations', 'ai_credit_grants',
            'ai_credit_wallets', 'ai_model_prices', 'ai_prompt_versions', 'ai_features'] as $name) {
            Schema::dropIfExists($name);
        }
    }
};
