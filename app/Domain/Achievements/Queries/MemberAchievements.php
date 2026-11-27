<?php

namespace App\Domain\Achievements\Queries;

use App\Domain\Achievements\Services\BadgeCatalog;
use App\Domain\Achievements\Services\AwardLedger;
use App\Domain\Achievements\Services\SpecificWorkProgress;
use App\Domain\Identity\Services\ProfileCompleteness;
use App\Domain\Learning\Queries\CourseCertificateData;
use App\Models\User;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Batched projection of verified member activity; award persistence is delegated to the ledger. */
final class MemberAchievements
{
    public const RECORD_LIMIT = 30;

    public function snapshot(User $user, bool $includeRecord = true, bool $issueAwards = true): array
    {
        $definitions = app(BadgeCatalog::class)->definitions();
        $id = $user->getKey();
        $driver = DB::connection()->getDriverName();
        $seconds = $driver === 'pgsql'
            ? 'GREATEST(0, LEAST(EXTRACT(EPOCH FROM (finished_at - started_at)), 14400))'
            : 'MAX(0, MIN(ROUND((julianday(finished_at) - julianday(started_at)) * 86400), 14400))';

        // Course completion and certificate issuance are independent achievements.
        $sources = [
            DB::table('learning_course_completions')->where('user_id', $id)
                ->selectRaw("id, 'courses' AS metric, completed_at AS occurred_at, course_title AS title, 'Course' AS kind, 'Completed' AS detail, 0 AS seconds"),
            DB::table('learning_course_certificates')->where('user_id', $id)
                ->selectRaw("id, 'certificates' AS metric, issued_at AS occurred_at, course_title AS title, 'Course certificate' AS kind, 'Issued · PM Circle course completion' AS detail, 0 AS seconds"),
            DB::table('pmp_exam_attempts')->where('user_id', $id)->where('status', 'completed')->whereNotNull('finished_at')
                ->selectRaw("id, CASE WHEN mode = 'focused' THEN 'focused' ELSE 'exams' END AS metric, finished_at AS occurred_at, CASE WHEN mode = 'focused' THEN 'PMP focused practice' ELSE 'PMP mock exam' END AS title, 'Simulator' AS kind, 'Completed · ' || CAST(COALESCE(correct_count, 0) AS TEXT) || ' of ' || CAST(total_questions AS TEXT) || ' correct' AS detail, {$seconds} AS seconds"),
            DB::table('posts')->where('author_id', $id)->where('status', 'published')->whereNull('deleted_at')
                ->selectRaw("id, 'posts' AS metric, COALESCE(published_at, created_at) AS occurred_at, '' AS title, '' AS kind, '' AS detail, 0 AS seconds"),
            DB::table('comments as c')->join('posts as p', 'p.id', '=', 'c.post_id')->where('c.author_id', $id)
                ->whereNull('c.deleted_at')->whereNull('p.deleted_at')->where('p.status', 'published')
                ->where(fn (Builder $q) => $q->whereNull('c.check_status')->orWhere('c.check_status', 'approved'))
                ->selectRaw("c.id, 'replies' AS metric, COALESCE(c.checked_at, c.created_at) AS occurred_at, '' AS title, '' AS kind, '' AS detail, 0 AS seconds"),
            // Count one qualifying top-level response per challenge, not comments or questions.
            DB::table('scenario_responses as r')->join('scenarios as s', 's.id', '=', 'r.scenario_id')
                ->where('r.user_id', $id)->whereNull('r.parent_id')->where('r.is_question', false)
                ->whereIn('s.status', ['published', 'closed'])->groupBy('s.id', 's.title')
                ->selectRaw("s.id, 'challenges' AS metric, MIN(r.created_at) AS occurred_at, s.title AS title, 'Daily challenge' AS kind, 'Completed' AS detail, 0 AS seconds"),
            DB::table('interview_sessions')->where('user_id', $id)->where('status', 'completed')->whereNotNull('completed_at')
                ->selectRaw("id, 'interviews' AS metric, completed_at AS occurred_at, 'Mock interview' AS title, 'Interview practice' AS kind, 'Completed' AS detail, 0 AS seconds"),
        ];
        if ($includeRecord) {
            $sources[] = DB::table('learning_activity_completions as c')
                ->join('learning_activities as a', 'a.id', '=', 'c.learning_activity_id')
                ->join('learning_modules as m', 'm.id', '=', 'a.learning_module_id')
                ->join('learning_paths as p', 'p.id', '=', 'm.learning_path_id')
                ->where('c.user_id', $id)->where('p.is_published', true)
                ->selectRaw("c.id, 'path' AS metric, c.completed_at AS occurred_at, a.title AS title, 'Learning activity' AS kind, 'Completed · ' || p.title AS detail, 0 AS seconds");
        }
        $union = array_shift($sources);
        foreach ($sources as $source) {
            $union->unionAll($source);
        }
        // One windowed result supplies exact counts, threshold dates and bounded recent records.
        // The running time is across PMP practice modes, as in the existing dashboard.
        $ranked = DB::query()->fromSub($union, 'events')->select('events.*')
            ->selectRaw('COUNT(*) OVER (PARTITION BY metric) AS total, ROW_NUMBER() OVER (PARTITION BY metric ORDER BY occurred_at, id) AS sequence')
            ->selectRaw('SUM(seconds) OVER () AS total_seconds, SUM(seconds) OVER (ORDER BY occurred_at, metric, id ROWS UNBOUNDED PRECEDING) AS running_seconds');
        if ($includeRecord) {
            $ranked->selectRaw('ROW_NUMBER() OVER (PARTITION BY metric ORDER BY occurred_at DESC, id DESC) AS recent_rank');
        }
        // A threshold may be crossed on any exam, not just the first 25. Calculate its
        // original timestamp before limiting the returned rows.
        $dated = DB::query()->fromSub($ranked, 'ranked')->select('ranked.*');
        foreach (array_unique(array_column(array_filter($definitions, fn ($b) => $b['metric'] === 'minutes'), 'target')) as $minutesTarget) {
            $target = (int) $minutesTarget;
            $dated->selectRaw("MIN(CASE WHEN running_seconds >= ? THEN occurred_at END) OVER () AS minutes_{$target}", [$target * 60]);
        }
        $thresholds = array_values(array_unique(array_column(array_filter($definitions, fn ($b) => $b['mode'] === 'milestone' && $b['target'] > 25 && ! in_array($b['metric'], ['minutes', 'profile'], true)), 'target')));
        $rows = DB::query()->fromSub($dated, 'dated')
            ->where(function (Builder $q) use ($includeRecord, $thresholds): void {
                $q->where('sequence', '<=', 25);
                if ($thresholds !== []) $q->orWhereIn('sequence', $thresholds);
                if ($includeRecord) {
                    $q->orWhere(fn (Builder $recent) => $recent->whereNotIn('metric', ['posts', 'replies'])->where('recent_rank', '<=', self::RECORD_LIMIT));
                }
            })->orderBy('occurred_at')->orderBy('metric')->orderBy('id')->get();
        $metrics = array_fill_keys(array_unique([...array_column(config('achievements.badges'), 'metric'), ...array_column($definitions, 'metric')]), 0);
        $supported = BadgeCatalog::SUPPORTED;
        $metrics['profile'] = app(ProfileCompleteness::class)->percentage($user);
        $metrics['minutes'] = (int) floor(max(0, (float) ($rows->first()?->total_seconds ?? 0)) / 60);
        $dates = [];
        foreach ($definitions as $definition) {
            if ($definition['metric'] === 'minutes') {
                $target = $definition['target'];
                $date = $rows->first()?->{'minutes_'.$target};
                if ($date !== null) {
                    $dates['minutes'][$target] = $this->date($date);
                }
            }
        }
        $records = [];
        foreach ($rows as $row) {
            if (array_key_exists($row->metric, $metrics)) {
                $metrics[$row->metric] = (int) $row->total;
                $dates[$row->metric][(int) $row->sequence] = $row->occurred_at === null ? null : $this->date($row->occurred_at);
            }
            if ($includeRecord && $row->occurred_at !== null && $row->kind !== '' && $row->recent_rank <= self::RECORD_LIMIT) {
                $record = ['id' => $row->metric.'-'.$row->id, 'type' => $row->kind, 'name' => $row->title, 'detail' => $row->detail, 'date' => $this->date($row->occurred_at)];
                $records[] = $record;
            }
        }
        $metrics['pmpExams'] = $metrics['exams'];
        $dates['pmpExams'] = $dates['exams'] ?? [];
        $workProgress = app(SpecificWorkProgress::class)->completed($user, $definitions, $metrics, $dates);
        $badges = array_map(function (array $badge) use ($metrics, $supported, $dates, $workProgress): array {
            if ($badge['mode'] === 'completion') {
                $matches = array_intersect_key($workProgress, array_flip($badge['targets']));
                $value = count($matches);
                $earned = $value >= $badge['target'];
                $times = array_values($matches);
                sort($times);
                return [...$badge, 'value' => $value, 'available' => $badge['publishStatus'] === 'active', 'status' => $earned ? 'earned' : ($value > 0 ? 'progress' : 'locked'), 'earnedAt' => $earned ? ($times[$badge['target'] - 1] ?? null) : null];
            }
            $metric = $badge['metric'];
            $value = $metrics[$metric];
            $earned = in_array($metric, $supported, true) && $value >= $badge['target'];
            return [...$badge, 'value' => $value, 'available' => in_array($metric, $supported, true),
                'status' => $earned ? 'earned' : ($value > 0 ? 'progress' : 'locked'),
                'earnedAt' => $earned ? ($dates[$metric][$badge['target']] ?? null) : null];
        }, $definitions);
        $badges = app(AwardLedger::class)->reconcile($user, $badges, $issueAwards);
        // Use actual completion time, or recorded award time when the historical threshold is unknown.
        // A stable ledger ID breaks ties; never fabricate the displayed earnedAt date.
        $latest = array_values(array_filter($badges, fn ($badge) => $badge['status'] === 'earned'));
        usort($latest, fn ($a, $b) => ($b['awardOrderAt'] ?? ($b['earnedAt'] ? Carbon::parse($b['earnedAt'])->getTimestamp() : 0))
            <=> ($a['awardOrderAt'] ?? ($a['earnedAt'] ? Carbon::parse($a['earnedAt'])->getTimestamp() : 0))
            ?: ($b['awardOrderId'] ?? 0) <=> ($a['awardOrderId'] ?? 0) ?: strcmp($a['id'], $b['id']));
        $stripOrder = fn ($badge) => array_diff_key($badge, array_flip(['awardOrderAt', 'awardOrderId']));
        $latest = array_map($stripOrder, $latest);
        $badges = array_map($stripOrder, $badges);
        usort($records, fn ($a, $b) => strcmp($b['date'], $a['date']) ?: strcmp($a['id'], $b['id']));

        $paths = $includeRecord ? DB::table('learning_paths as p')
            ->leftJoin('learning_modules as m', 'm.learning_path_id', '=', 'p.id')
            ->leftJoin('learning_activities as a', 'a.learning_module_id', '=', 'm.id')
            ->leftJoin('learning_activity_completions as c', function ($join) use ($id): void {
                $join->on('c.learning_activity_id', '=', 'a.id')->where('c.user_id', $id);
            })->where('p.is_published', true)->groupBy('p.id', 'p.title', 'p.slug', 'p.position')
            ->orderBy('p.position')->orderBy('p.id')->select('p.id', 'p.title', 'p.slug')
            ->selectRaw('COUNT(a.id) AS total, COUNT(c.id) AS completed')->get()
            ->map(fn ($path) => ['id' => (int) $path->id, 'title' => $path->title, 'slug' => $path->slug,
                'completedActivities' => (int) $path->completed, 'totalActivities' => (int) $path->total])->all() : [];

        // Only the full achievements page needs certificate cards; profile/dashboard badge previews do not.
        $certificates = $includeRecord ? DB::table('learning_course_certificates')->where('user_id', $id)
            ->orderByDesc('issued_at')->orderByDesc('id')->limit(self::RECORD_LIMIT)
            ->get(['reference', 'member_name', 'course_title', 'issued_at'])
            ->map(fn ($row) => CourseCertificateData::fromRecord($row))->all() : [];

        return ['certificates' => $certificates, 'badges' => $badges, 'metrics' => $metrics, 'latest' => array_slice($latest, 0, 3),
            'paths' => $paths, 'records' => $records, 'recordLimit' => self::RECORD_LIMIT];
    }

    private function date(string $value): string
    {
        return Carbon::parse($value)->toIso8601String();
    }
}
