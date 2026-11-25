<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_workspace_providers', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('adapter', 24);
            $table->string('status', 16)->default('Standby');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
        $ids = [];
        foreach (['openai' => 'OpenAI', 'gemini' => 'Google Gemini'] as $adapter => $name) {
            $ids[$adapter] = DB::table('ai_workspace_providers')->insertGetId([
                'name' => $name, 'adapter' => $adapter, 'status' => 'Active', 'is_default' => true,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        DB::table('ai_workspace_providers')->insert(['name' => 'Anthropic', 'adapter' => 'anthropic', 'status' => 'Standby', 'is_default' => false, 'created_at' => now(), 'updated_at' => now()]);
        Schema::table('ai_workspace_credentials', function (Blueprint $table): void {
            $table->foreignId('provider_id')->nullable()->constrained('ai_workspace_providers')->restrictOnDelete();
        });
        DB::table('ai_workspace_credentials')->where('slot', 'gemini_api_key')->update(['provider_id' => $ids['gemini']]);
        DB::table('ai_workspace_credentials')->whereNull('provider_id')->update(['provider_id' => $ids['openai']]);
    }

    public function down(): void
    {
        Schema::table('ai_workspace_credentials', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('provider_id');
        });
        Schema::dropIfExists('ai_workspace_providers');
    }
};
