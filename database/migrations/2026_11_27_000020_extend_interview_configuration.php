<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('interview_configuration', function (Blueprint $table) {
            $table->json('practice_settings')->nullable();
        });
        Schema::table('interview_questions', function (Blueprint $table) {
            $table->string('topic', 150)->nullable();
            $table->string('difficulty', 12)->nullable();
            $table->text('answer_guidance')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('interview_questions', fn (Blueprint $table) => $table->dropColumn(['topic', 'difficulty', 'answer_guidance']));
        Schema::table('interview_configuration', fn (Blueprint $table) => $table->dropColumn('practice_settings'));
    }
};
