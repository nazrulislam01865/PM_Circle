<?php

namespace App\Domain\Dashboard\Queries;

use App\Support\Admin\InterviewMasterData;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Query\Builder;

/** A bounded, read-only projection for the admin overview. No member-level data is exposed. */
final class AdminDashboardOverview
{
    public function forDays(int $days): array
    {
        // Keep dashboard counters reasonably fresh without repeating aggregate scans on each visit.
        return Cache::remember('pm:admin:overview:v1:'.$days, now()->addSeconds(60), fn (): array => $this->build($days));
    }

    private function build(int $days): array
    {
        $today = CarbonImmutable::now('UTC')->startOfDay();
        $start = $today->subDays($days - 1);
        $end = $today->addDay();
        $previousStart = $start->subDays($days);

        $members = DB::table('users')->where('status', 'active')->where('is_admin', false);
        $posts = DB::table('posts')->where('status', 'published')->where('visibility', 'public')->whereNull('deleted_at');
        $enrollments = DB::table('learning_demo_course_enrollments');

        $activeLearners = DB::query()->fromSub(
            DB::table('learning_demo_course_enrollments')->where('created_at', '>=', $start)
                ->where('created_at', '<', $end)->select('user_id')
                ->union(DB::table('learning_activity_completions')->where('completed_at', '>=', $start)
                    ->where('completed_at', '<', $end)->select('user_id'))
                ->union(DB::table('learning_course_practice_attempts')->where('created_at', '>=', $start)
                    ->where('created_at', '<', $end)->select('user_id')),
            'learners'
        )->count();

        // Aggregate each KPI's all-time/current/previous counts in one query per table.
        $memberCounts = $this->periodCounts($members, $previousStart, $start, $end);
        $setCounts = $this->periodCounts(DB::table('interview_question_sets')->where('is_active', true), $previousStart, $start, $end);
        $postCounts = $this->periodCounts($posts, $previousStart, $start, $end);
        $enrollmentCounts = $this->periodCounts($enrollments, $previousStart, $start, $end);
        $aiDaily = DB::table('ai_requests')->where('created_at', '>=', $today->subDay())
            ->where('created_at', '<', $end)
            ->selectRaw('COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) as today_count', [$today])
            ->selectRaw('COALESCE(SUM(CASE WHEN created_at < ? THEN 1 ELSE 0 END), 0) as yesterday_count', [$today])
            ->first();
        $todayRequests = (int) $aiDaily->today_count;
        $yesterdayRequests = (int) $aiDaily->yesterday_count;

        $stats = [
            'members' => $this->stat($memberCounts[0], $memberCounts[1], $memberCounts[2], 'New members'),
            'learners' => ['value' => $activeLearners, 'note' => 'Learners this period', 'change' => null],
            'questionSets' => $this->stat($setCounts[0], $setCounts[1], $setCounts[2], 'New active sets'),
            'aiRequestsToday' => $this->stat($todayRequests, $todayRequests, $yesterdayRequests, 'Compared with yesterday'),
            'posts' => $this->stat($postCounts[0], $postCounts[1], $postCounts[2], 'New public posts'),
            'enrollments' => $this->stat($enrollmentCounts[0], $enrollmentCounts[1], $enrollmentCounts[2], 'New enrollments'),
        ];

        // Each source is aggregated within PostgreSQL rather than loading individual rows.
        $community = $this->byDay('posts', $start, $end, ['status' => 'published', 'visibility' => 'public'], true);
        $challenge = $this->byDay('scenario_responses', $start, $end);
        $learn = $this->byDay('learning_demo_course_enrollments', $start, $end);
        $this->mergeDays($learn, $this->byDay('learning_activity_completions', $start, $end, [], false, 'completed_at'));
        $exams = $this->byDay('pmp_exam_attempts', $start, $end);
        $interviews = $this->byDay('interview_sessions', $start, $end);
        $newMembers = $this->byDay('users', $start, $end, ['status' => 'active', 'is_admin' => false]);

        $series = [];
        for ($day = $start; $day->lessThan($end); $day = $day->addDay()) {
            $key = $day->format('Y-m-d');
            $series[] = ['date' => $key,
                'activity' => ($community[$key] ?? 0) + ($challenge[$key] ?? 0) + ($learn[$key] ?? 0)
                    + ($exams[$key] ?? 0) + ($interviews[$key] ?? 0),
                'members' => $newMembers[$key] ?? 0,
            ];
        }
        $mix = [];
        foreach (['Community' => $community, 'Challenge' => $challenge, 'Learn' => $learn,
            'Exams' => $exams, 'Interview Prep' => $interviews] as $label => $values) {
            $mix[] = ['label' => $label, 'value' => array_sum($values)];
        }

        $pendingReports = DB::table('post_reports')->where('status', 'pending')->count();
        $pendingPosts = DB::table('posts')->where('status', 'pending_review')->whereNull('deleted_at')->count();
        $pendingComments = DB::table('comments')->where('check_status', 'pending_review')->whereNull('deleted_at')->count();
        $pending = [];
        foreach ([['title' => 'Review reported posts', 'count' => $pendingReports, 'severity' => 'high'],
            ['title' => 'Review pending posts', 'count' => $pendingPosts, 'severity' => 'medium'],
            ['title' => 'Review pending comments', 'count' => $pendingComments, 'severity' => 'medium']] as $item) {
            if ($item['count'] > 0) {
                $pending[] = $item + ['href' => '/admin/post-reports'];
            }
        }
        $reviewTotal = $pendingReports + $pendingPosts + $pendingComments;

        $questionTypeCount = DB::table('master_data_options')->where('category', InterviewMasterData::category('type'))
            ->where('is_active', true)->count();
        $answerModeCount = DB::table('master_data_options')->where('category', InterviewMasterData::category('mode'))
            ->where('is_active', true)->count();
        $interviewSummary = [
            'sets' => DB::table('interview_question_sets')->count(),
            'questions' => DB::table('interview_questions')->count(),
            'types' => $questionTypeCount,
            'modes' => $answerModeCount,
            // No import-history table exists: avoid presenting made-up import counts.
            'recentImports' => null,
        ];

        $plans = DB::table('subscriptions as s')
            ->join('plan_prices as pp', 's.plan_price_id', '=', 'pp.id')
            ->join('plans as p', 'pp.plan_id', '=', 'p.id')
            ->where('s.status', 'active')
            ->where(fn ($query) => $query->whereNull('s.starts_at')->orWhere('s.starts_at', '<=', now()))
            ->where(fn ($query) => $query->whereNull('s.ends_at')->orWhere('s.ends_at', '>', now()))
            ->groupBy('p.name')->orderBy('p.name')
            ->select('p.name')->selectRaw('COUNT(DISTINCT s.user_id) as members')->get();
        $enabledFeatures = DB::table('ai_features')->where('enabled', true)->count();

        return [
            'days' => $days,
            'timezone' => 'UTC',
            'stats' => $stats,
            'series' => $series,
            'mix' => $mix,
            'recent' => $this->recent(),
            'pending' => $pending,
            'pendingReviewCount' => $reviewTotal,
            'health' => [
                'queue' => ['driver' => (string) config('queue.default'), 'status' => 'Not monitored'],
                'ai' => ['enabledFeatures' => $enabledFeatures, 'configured' => (bool) config('pm-ai.enabled')],
                'plans' => $plans->map(fn ($p) => ['name' => $p->name, 'members' => (int) $p->members])->all(),
                'backup' => ['status' => 'Not monitored'],
            ],
            'interview' => $interviewSummary,
        ];
    }

    /** @return array{int, int, int} */
    private function periodCounts(Builder $query, CarbonImmutable $previousStart,
        CarbonImmutable $start, CarbonImmutable $end): array
    {
        $counts = $query->selectRaw('COUNT(*) as total')
            ->selectRaw('COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END), 0) as current_count', [$start, $end])
            ->selectRaw('COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END), 0) as previous_count', [$previousStart, $start])
            ->first();

        return [(int) $counts->total, (int) $counts->current_count, (int) $counts->previous_count];
    }

    private function stat(int $value, int $current, int $previous, string $label): array
    {
        return [
            'value' => $value,
            'current' => $current,
            'note' => $label,
            'change' => $previous === 0 ? null : round((($current - $previous) / $previous) * 100, 1),
        ];
    }

    /** @return array<string, int> */
    private function byDay(string $table, CarbonImmutable $start, CarbonImmutable $end,
        array $conditions = [], bool $excludeDeleted = false, string $column = 'created_at'): array
    {
        $query = DB::table($table)->where($column, '>=', $start)->where($column, '<', $end);
        foreach ($conditions as $key => $value) {
            $query->where($key, $value);
        }
        if ($excludeDeleted) {
            $query->whereNull('deleted_at');
        }
        return $query->selectRaw("DATE({$column}) as day, COUNT(*) as total")
            ->groupByRaw("DATE({$column})")->get()
            ->mapWithKeys(fn ($item) => [(string) $item->day => (int) $item->total])->all();
    }

    private function mergeDays(array &$target, array $more): void
    {
        foreach ($more as $day => $count) {
            $target[$day] = ($target[$day] ?? 0) + $count;
        }
    }

    private function recent(): array
    {
        $events = [];
        $questions = DB::table('interview_questions as q')->join('interview_question_sets as s', 'q.set_id', '=', 's.id')
            ->orderByDesc('q.created_at')->limit(3)->get(['q.created_at', 's.title']);
        foreach ($questions as $item) {
            $events[] = ['title' => 'Interview question added', 'detail' => $item->title,
                'at' => $item->created_at, 'href' => '/admin/interview-preparation?tab=questions', 'kind' => 'interview'];
        }
        $reports = DB::table('post_reports')->whereNotNull('reviewed_at')->orderByDesc('reviewed_at')->limit(3)
            ->get(['reviewed_at', 'status']);
        foreach ($reports as $item) {
            $events[] = ['title' => 'Post report '.($item->status === 'dismissed' ? 'dismissed' : 'reviewed'),
                'detail' => 'Community moderation', 'at' => $item->reviewed_at,
                'href' => '/admin/post-reports', 'kind' => 'moderation'];
        }
        $courses = DB::table('learning_courses')->orderByDesc('updated_at')->limit(3)->get(['title', 'updated_at', 'is_published']);
        foreach ($courses as $item) {
            $events[] = ['title' => $item->is_published ? 'Course updated' : 'Draft course updated',
                'detail' => $item->title, 'at' => $item->updated_at,
                'href' => '/admin/learning/courses', 'kind' => 'learning'];
        }
        $homepage = DB::table('home_page_contents')->where('key', 'home')->first(['updated_at']);
        if ($homepage) {
            $events[] = ['title' => 'Homepage content updated', 'detail' => 'Public homepage',
                'at' => $homepage->updated_at, 'href' => '/admin/homepage', 'kind' => 'homepage'];
        }
        usort($events, static fn (array $a, array $b): int => strcmp((string) $b['at'], (string) $a['at']));
        return array_slice($events, 0, 5);
    }
}
