<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Do not silently promote, discard or reparent legacy invalid replies.
        if (DB::table('comments as c')->leftJoin('comments as p', 'p.id', '=', 'c.parent_id')
            ->whereNotNull('c.parent_id')->where(fn ($q) => $q->whereNull('p.id')
                ->orWhereColumn('c.post_id', '!=', 'p.post_id')->orWhereNotNull('p.parent_id'))->exists()) {
            throw new RuntimeException('Invalid legacy comment parent relationships. Review and repair before migrating.');
        }
        Schema::table('post_engagement_stats', fn (Blueprint $t) => $t->unsignedBigInteger('version')->default(0));
        Schema::create('post_reaction_counts', function (Blueprint $t): void {
            $t->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $t->string('reaction_type', 12);
            $t->unsignedBigInteger('total')->default(0);
            $t->timestamp('updated_at')->nullable();
            $t->primary(['post_id', 'reaction_type']);
        });
        Schema::create('comment_engagement_stats', function (Blueprint $t): void {
            $t->foreignId('comment_id')->primary()->constrained('comments')->cascadeOnDelete();
            $t->unsignedBigInteger('reactions_count')->default(0);
            $t->unsignedBigInteger('replies_count')->default(0);
            $t->unsignedBigInteger('version')->default(0);
            $t->timestamp('updated_at')->nullable();
        });
        Schema::table('comments', function (Blueprint $t): void {
            $t->uuid('submission_key')->nullable();
            $t->string('request_hash', 64)->nullable();
            $t->unsignedBigInteger('check_version')->default(0);
            $t->unique(['post_id', 'id'], 'comments_post_id_id_unique');
        });
        DB::statement('CREATE UNIQUE INDEX comments_author_submission_unique ON comments (author_id, submission_key) WHERE submission_key IS NOT NULL');
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE post_reaction_counts ADD CONSTRAINT post_reaction_counts_nonnegative CHECK (total >= 0)');
            DB::statement('ALTER TABLE comment_engagement_stats ADD CONSTRAINT comment_engagement_nonnegative CHECK (reactions_count >= 0 AND replies_count >= 0 AND version >= 0)');
            DB::statement('ALTER TABLE post_engagement_stats ADD CONSTRAINT post_engagement_version_nonnegative CHECK (version >= 0)');
            DB::statement('ALTER TABLE comments DROP CONSTRAINT comments_parent_id_foreign');
            DB::statement('ALTER TABLE comments ADD CONSTRAINT comments_same_post_parent FOREIGN KEY (post_id, parent_id) REFERENCES comments (post_id, id) ON DELETE NO ACTION');
        }
    }

    public function down(): void
    {
        throw new RuntimeException('Engagement projections and submission keys must be retained. Roll back with read flags.');
    }
};
