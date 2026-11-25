<?php

use App\Domain\AI\Services\AiFeatureCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('ai_workspace_feature_routes', function (Blueprint $table): void {
            $table->string('primary_model', 80)->nullable();
            $table->boolean('enabled_override')->nullable();
            $table->unsignedInteger('request_daily_limit')->nullable();
            $table->unsignedInteger('output_token_limit')->nullable();
        });
        Schema::table('ai_resume_consents', function (Blueprint $table): void {
            $table->unsignedBigInteger('resume_id')->nullable()->change();
        });
        $catalog = new AiFeatureCatalog();
        foreach (['resume_analyze', 'resume_rewrite'] as $code) {
            if (DB::table('ai_features')->where('code', $code)->exists()) continue;
            $version = (int) DB::table('ai_prompt_versions')->where('feature_code', $code)->max('version') + 1;
            DB::table('ai_prompt_versions')->insert([
                'feature_code' => $code, 'version' => $version,
                'template' => $code === 'resume_analyze'
                    ? 'Review the supplied résumé for clarity, structure and relevance. Provide educational suggestions based only on the supplied facts. Do not infer personal attributes, invent qualifications, or promise hiring outcomes.'
                    : 'Rewrite only the requested résumé section. Preserve every factual claim, date, qualification and employer; never invent metrics or accomplishments. If information is missing, explain what the member should add rather than inventing it.',
                'evaluation_reference' => 'resume-assistant-v1', 'output_schema' => json_encode($catalog->schema($code), JSON_THROW_ON_ERROR),
                'schema_version' => '1', 'published_at' => now(), 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('ai_features')->insert(['code' => $code, 'enabled' => false, 'min_plan' => 'pro', 'model' => 'gpt-4.1-mini', 'max_input_chars' => 18000, 'max_output_tokens' => 1500, 'credit_tariff' => 1, 'tariff_version' => 1, 'prompt_version' => $version, 'daily_limit' => 3, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        // Do not delete consent or feature history on rollback. Refuse if draft consents exist.
        if (DB::table('ai_resume_consents')->whereNull('resume_id')->exists()) {
            throw new RuntimeException('Rollback would invalidate existing draft résumé consents. Preserve these records and use a forward fix.');
        }
        Schema::table('ai_resume_consents', fn (Blueprint $table) => $table->unsignedBigInteger('resume_id')->nullable(false)->change());
        Schema::table('ai_workspace_feature_routes', fn (Blueprint $table) => $table->dropColumn(['primary_model', 'enabled_override', 'request_daily_limit', 'output_token_limit']));
    }
};
