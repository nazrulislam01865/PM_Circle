<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pmp_exam_settings', function (Blueprint $table): void {
            $table->jsonb('sample_question_ids')->nullable();
        });

        // Preserve existing public sample selections during upgrades.
        DB::table('pmp_exam_settings')->whereNotNull('sample_question_id')
            ->get(['id', 'sample_question_id'])->each(function ($row): void {
                DB::table('pmp_exam_settings')->where('id', $row->id)->update([
                    'sample_question_ids' => json_encode([(int) $row->sample_question_id], JSON_THROW_ON_ERROR),
                ]);
            });
    }

    public function down(): void
    {
        Schema::table('pmp_exam_settings', function (Blueprint $table): void {
            $table->dropColumn('sample_question_ids');
        });
    }
};
