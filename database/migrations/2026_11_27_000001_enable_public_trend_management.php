<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Carbon;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trend_articles', function (Blueprint $table): void {
            // Imported public prototype content has no historical approving user.
            $table->unsignedBigInteger('approved_by')->nullable()->change();
            $table->string('category', 80)->default('AI at Work');
            $table->boolean('listed')->default(true);
            $table->jsonb('presentation')->nullable();
            $table->jsonb('sections')->nullable();
            $table->unsignedBigInteger('revision')->default(1);
            $table->index(['status', 'listed', 'published_at', 'id'], 'trend_public_listing_idx');
            $table->index(['status', 'listed', 'category', 'published_at'], 'trend_public_category_idx');
        });

        $reports = json_decode(file_get_contents(database_path('data/legacy-trend-reports.json')), true, flags: JSON_THROW_ON_ERROR);
        foreach (array_reverse($reports) as $report) {
            $presentation = array_intersect_key($report, array_flip(['articleTitle', 'articleLead', 'articleCategoryLabel', 'listingDate', 'readMinutes', 'thumbnail', 'hero', 'attribution', 'sources', 'sample', 'intro']));
            DB::table('trend_articles')->insertOrIgnore([
                'slug' => $report['slug'], 'title' => $report['title'], 'summary' => $report['summary'],
                'body_markdown' => '', 'status' => 'published', 'ai_generated' => $report['classification'] === 'AI Analysis',
                'approved_by' => null, 'published_at' => Carbon::createFromFormat('!j M Y', $report['date']),
                'category' => $report['category'], 'listed' => $report['listed'],
                'presentation' => json_encode($presentation, JSON_THROW_ON_ERROR),
                'sections' => json_encode($report['sections'], JSON_THROW_ON_ERROR),
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Do not silently discard administrator-authored report content on rollback.
        throw new RuntimeException('This content migration is forward-only. Restore a reviewed database backup if rollback is required.');
    }
};
