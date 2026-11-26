<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('legal_pages', function (Blueprint $table) {
            $table->string('document', 16)->primary();
            $table->json('draft');
            $table->unsignedBigInteger('revision')->default(1);
            $table->unsignedBigInteger('published_version_id')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        Schema::create('legal_page_versions', function (Blueprint $table) {
            $table->id();
            $table->string('document', 16);
            $table->foreign('document')->references('document')->on('legal_pages')->restrictOnDelete();
            $table->json('content');
            $table->foreignId('published_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at');
            $table->index(['document', 'id']);
        });
        $defaults = json_decode(file_get_contents(resource_path('legal/defaults.json')), true, 512, JSON_THROW_ON_ERROR);
        foreach (['terms', 'privacy'] as $document) {
            DB::table('legal_pages')->insert([
                'document' => $document, 'draft' => json_encode($defaults[$document], JSON_THROW_ON_ERROR),
                'revision' => 1, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('legal_page_versions');
        Schema::dropIfExists('legal_pages');
    }
};
