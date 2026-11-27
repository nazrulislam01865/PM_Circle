<?php

namespace App\Domain\Community\Services;

use App\Models\Comment;
use Illuminate\Support\Facades\DB;

/** Batched source oracle. Call under the affected post locks or a drained write gate. */
final class EngagementReconciliation
{
    public static function process(array $ids, bool $verify): int
    {
        if (! $ids) return 0;
        $types = DB::table('post_reactions')->whereIn('post_id', $ids)->groupBy('post_id', 'type')
            ->selectRaw('post_id, type, COUNT(*) AS total')->get()->groupBy('post_id');
        $visible = Comment::query()->visible()->whereIn('post_id', $ids);
        $comments = (clone $visible)->groupBy('post_id')->selectRaw('post_id, COUNT(*) AS total')->pluck('total', 'post_id');
        $replies = (clone $visible)->whereNotNull('parent_id')->groupBy('parent_id')->selectRaw('parent_id, COUNT(*) AS total')->pluck('total', 'parent_id');
        $postRows = []; $typeRows = []; $mismatches = 0;
        $actualPosts = $verify ? DB::table('post_engagement_stats')->whereIn('post_id', $ids)->get()->keyBy('post_id') : collect();
        $actualTypes = DB::table('post_reaction_counts')->whereIn('post_id', $ids)->get()->groupBy('post_id');
        foreach ($ids as $id) {
            $expected = ['post_id' => $id, 'reactions_count' => 0, 'comments_count' => (int) ($comments[$id] ?? 0), 'other_reactions_count' => 0];
            foreach (EngagementStats::TYPES as $type) $expected[$type.'_count'] = 0;
            $counts = [];
            foreach ($types[$id] ?? [] as $row) {
                $count = (int) $row->total;
                $counts[$row->type] = $count;
                $expected['reactions_count'] += $count;
                $expected[in_array($row->type, EngagementStats::TYPES, true) ? $row->type.'_count' : 'other_reactions_count'] += $count;
            }
            // Zero historical type rows are valid; nonzero source rows must exist and agree.
            foreach ($actualTypes[$id] ?? [] as $row) {
                $count = $counts[$row->reaction_type] ?? 0;
                if ($verify && (int) $row->total !== $count) $mismatches++;
                if (! $verify) $typeRows[] = ['post_id' => $id, 'reaction_type' => $row->reaction_type, 'total' => $count, 'updated_at' => now()];
                unset($counts[$row->reaction_type]);
            }
            foreach ($counts as $type => $count) {
                if ($verify) $mismatches++;
                else $typeRows[] = ['post_id' => $id, 'reaction_type' => $type, 'total' => $count, 'updated_at' => now()];
            }
            if ($verify) $mismatches += self::matches($actualPosts[$id] ?? null, $expected) ? 0 : 1;
            else $postRows[] = [...$expected, 'updated_at' => now()];
        }
        if (! $verify) {
            self::upsert('post_engagement_stats', $postRows, ['post_id'], true);
            self::upsert('post_reaction_counts', $typeRows, ['post_id', 'reaction_type']);
        }
        DB::table('comments')->whereIn('post_id', $ids)->select('id')->chunkById(500, function ($rows) use ($verify, $replies, &$mismatches): void {
            $commentIds = $rows->pluck('id')->all();
            $likes = DB::table('comment_likes')->whereIn('comment_id', $commentIds)->groupBy('comment_id')
                ->selectRaw('comment_id, COUNT(*) AS total')->pluck('total', 'comment_id');
            $actual = $verify ? DB::table('comment_engagement_stats')->whereIn('comment_id', $commentIds)->get()->keyBy('comment_id') : collect();
            $expectedRows = [];
            foreach ($commentIds as $id) {
                $expected = ['comment_id' => $id, 'reactions_count' => (int) ($likes[$id] ?? 0), 'replies_count' => (int) ($replies[$id] ?? 0)];
                if ($verify) $mismatches += self::matches($actual[$id] ?? null, $expected) ? 0 : 1;
                else $expectedRows[] = [...$expected, 'updated_at' => now()];
            }
            if (! $verify) self::upsert('comment_engagement_stats', $expectedRows, ['comment_id'], true);
        });
        return $mismatches;
    }

    private static function matches(?object $actual, array $expected): bool
    {
        if (! $actual) return false;
        foreach ($expected as $key => $value) if ((int) $actual->{$key} !== (int) $value) return false;
        return true;
    }

    private static function upsert(string $table, array $rows, array $keys, bool $version = false): void
    {
        foreach (array_chunk($rows, 200) as $batch) {
            $updates = array_values(array_diff(array_keys($batch[0]), $keys));
            if ($version) $updates['version'] = DB::raw($table.'.version + 1');
            DB::table($table)->upsert($batch, $keys, $updates);
        }
    }
}
