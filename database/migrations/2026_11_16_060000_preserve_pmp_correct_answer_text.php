<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pmp_exam_questions', function (Blueprint $table): void {
            // Exact source value for column M, kept independently from the answer-key letter.
            $table->text('correct_answer_text')->nullable();
        });

        // Existing records have no separate source cell. Initialize from their original
        // selected option; future workbook imports retain the exact source-cell text.
        DB::table('pmp_exam_questions')->select(['id', 'correct_option', 'options'])
            ->orderBy('id')->chunkById(200, function ($rows): void {
                foreach ($rows as $row) {
                    $options = json_decode((string) $row->options, true);
                    $text = is_array($options) ? ($options[$row->correct_option] ?? null) : null;
                    if (is_string($text)) {
                        DB::table('pmp_exam_questions')->where('id', $row->id)
                            ->update(['correct_answer_text' => $text]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('pmp_exam_questions', function (Blueprint $table): void {
            $table->dropColumn('correct_answer_text');
        });
    }
};
