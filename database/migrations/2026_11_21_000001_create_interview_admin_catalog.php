<?php

use App\Domain\Interview\QuestionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interview_catalog_options', function (Blueprint $table) {
            $table->id();
            $table->string('group', 24);
            $table->string('key', 100);
            $table->string('label', 150);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['group', 'key']);
            $table->index(['group', 'is_active', 'sort_order']);
        });
        Schema::create('interview_question_sets', function (Blueprint $table) {
            $table->id();
            $table->string('title', 180);
            $table->string('description', 500)->nullable();
            $table->string('industry', 100)->nullable();
            $table->string('role', 100)->nullable();
            $table->string('experience', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['is_active', 'industry', 'role', 'experience']);
        });
        Schema::create('interview_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('set_id')->constrained('interview_question_sets')->restrictOnDelete();
            $table->string('type', 100);
            $table->text('text');
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['set_id', 'is_active', 'type', 'sort_order']);
        });
        Schema::create('interview_configuration', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->unsignedSmallInteger('minutes_per_question')->default(2);
            $table->timestamps();
        });
        Schema::table('interview_sessions', function (Blueprint $table) {
            $table->unsignedSmallInteger('minutes_per_question')->nullable();
        });

        // Carry the existing curated questions and member options into editable admin records.
        $now = now();
        $groups = [
            'industry' => QuestionCatalog::INDUSTRIES,
            'role' => array_combine(QuestionCatalog::ROLES, QuestionCatalog::ROLES),
            'experience' => QuestionCatalog::EXPERIENCE,
            'type' => array_combine(['General', 'Behavioral', 'Technical', 'Situational'], ['General', 'Behavioral', 'Technical', 'Situational']),
            'count' => ['5' => '5 Questions', '10' => '10 Questions'],
            'mode' => ['type' => 'Type Answer', 'speak' => 'Speak Answer', 'both' => 'Both'],
        ];
        $options = [];
        foreach ($groups as $group => $values) {
            foreach ($values as $key => $label) {
                $options[] = ['group' => $group, 'key' => (string) $key, 'label' => $label,
                    'is_active' => true, 'sort_order' => count($options) % 100, 'created_at' => $now, 'updated_at' => $now];
            }
        }
        DB::table('interview_catalog_options')->insert($options);
        $setId = DB::table('interview_question_sets')->insertGetId([
            'title' => 'Core PM interview questions', 'description' => 'Original curated interview practice questions.',
            'is_active' => true, 'sort_order' => 1, 'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('interview_questions')->insert(array_map(
            fn (array $question) => $question + ['set_id' => $setId, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            QuestionCatalog::starterQuestions()
        ));
        DB::table('interview_configuration')->insert(['id' => 1, 'minutes_per_question' => 2, 'created_at' => $now, 'updated_at' => $now]);
    }

    public function down(): void
    {
        Schema::table('interview_sessions', fn (Blueprint $table) => $table->dropColumn('minutes_per_question'));
        Schema::dropIfExists('interview_configuration');
        Schema::dropIfExists('interview_questions');
        Schema::dropIfExists('interview_question_sets');
        Schema::dropIfExists('interview_catalog_options');
    }
};
