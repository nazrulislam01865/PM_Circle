<?php

use App\Support\Admin\InterviewMasterData;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Non-destructive move: keep legacy records for rollback/reference, use Master Data going forward. */
return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('interview_catalog_options')->orderBy('id')->get() as $option) {
            DB::table('master_data_options')->insertOrIgnore([
                'category' => InterviewMasterData::category($option->group),
                'value' => $option->key, 'label' => $option->label,
                'is_active' => $option->is_active, 'sort_order' => $option->sort_order,
                'created_at' => $option->created_at, 'updated_at' => $option->updated_at,
            ]);
        }
    }

    public function down(): void
    {
        // Do not delete administrator-edited master data on rollback.
    }
};
