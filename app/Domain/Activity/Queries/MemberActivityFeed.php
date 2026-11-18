<?php

namespace App\Domain\Activity\Queries;

use App\Services\Exam\PmpExamSettings;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/** Existing domain records are the source of truth. No duplicate activity writes or N+1 reads. */
final class MemberActivityFeed
{
    private const PAGE_SIZE = 12;

    public const TYPES = ['all', 'exam', 'post', 'reply', 'scenario', 'save', 'reaction', 'lesson', 'quiz'];

    public const RANGES = ['all', 'today', '7days', '30days', '90days'];

    public function __construct(private readonly PmpExamSettings $examSettings) {}

    /** @return array{items: array<int, array<string, mixed>>, nextCursor: ?string} */
    public function page(int $userId, string $type = 'all', string $range = 'all', string $sort = 'newest', ?string $cursor = null): array
    {
        if (! in_array($type, self::TYPES, true) || ! in_array($range, self::RANGES, true)
            || ! in_array($sort, ['newest', 'oldest'], true)) {
            throw new InvalidArgumentException('Invalid activity filters.');
        }

        $hiddenBefore = DB::table('member_activity_visibility')->where('user_id', $userId)->value('hidden_before');
        $start = match ($range) {
            'today' => CarbonImmutable::today('UTC'),
            '7days' => CarbonImmutable::now('UTC')->subDays(7),
            '30days' => CarbonImmutable::now('UTC')->subDays(30),
            '90days' => CarbonImmutable::now('UTC')->subDays(90),
            default => null,
        };
        $cutoff = $start;
        if ($hiddenBefore !== null && ($cutoff === null || CarbonImmutable::parse($hiddenBefore)->greaterThan($cutoff))) {
            $cutoff = CarbonImmutable::parse($hiddenBefore);
        }
        $sources = $this->sources($userId, $type, $cutoff);
        $union = array_shift($sources);
        foreach ($sources as $source) {
            $union->unionAll($source);
        }
        $query = DB::query()->fromSub($union, 'activity');
        $descending = $sort === 'newest';
        if ($cursor !== null) {
            $position = $this->decodeCursor($cursor);
            $operator = $descending ? '<' : '>';
            $query->where(function (Builder $query) use ($position, $operator): void {
                $query->where('occurred_at', $operator, $position['time'])
                    ->orWhere(function (Builder $query) use ($position, $operator): void {
                        $query->where('occurred_at', '=', $position['time'])
                            ->where('kind', $operator, $position['kind']);
                    })->orWhere(function (Builder $query) use ($position, $operator): void {
                        $query->where('occurred_at', '=', $position['time'])
                            ->where('kind', '=', $position['kind'])
                            ->where('id', $operator, $position['id']);
                    });
            });
        }
        $direction = $descending ? 'desc' : 'asc';
        $rows = $query->orderBy('occurred_at', $direction)->orderBy('kind', $direction)
            ->orderBy('id', $direction)->limit(self::PAGE_SIZE + 1)->get();
        $hasMore = $rows->count() > self::PAGE_SIZE;
        $visible = $rows->take(self::PAGE_SIZE);
        $rules = $visible->contains(fn ($entry) => $entry->kind === 'exam') ? $this->examSettings->get() : [];

        return [
            'items' => $visible->map(fn ($entry) => $this->formatRow($entry, $rules))->values()->all(),
            'nextCursor' => $hasMore ? $this->encodeCursor($visible->last()) : null,
        ];
    }

    /** @return array<int, Builder> */
    private function sources(int $userId, string $type, ?CarbonImmutable $cutoff): array
    {
        $sources = [];
        $add = static function (string $kind, Builder $builder, string $timeColumn) use (&$sources, $cutoff, $type): void {
            if ($type !== 'all' && $type !== $kind) {
                return;
            }
            if ($cutoff !== null) {
                $builder->whereRaw($timeColumn.' > ?', [$cutoff->toDateTimeString()]);
            }
            $sources[] = $builder;
        };
        // PostgreSQL resolves UNION columns positionally; untyped NULLs can
        // otherwise become TEXT before smallint exam scores are combined.
        $postLabel = "COALESCE(NULLIF(posts.title, ''), SUBSTRING(posts.body, 1, 120))";

        $add('post', DB::table('posts')->where('posts.author_id', $userId)
            ->where('posts.status', 'published')->whereNull('posts.deleted_at')
            ->selectRaw("posts.id AS id, 'post' AS kind, {$postLabel} AS detail, COALESCE(posts.published_at, posts.created_at) AS occurred_at, CAST(NULL AS INTEGER) AS correct_count, CAST(NULL AS INTEGER) AS total_questions, posts.id AS ref_id, NULL AS ref_slug"), 'COALESCE(posts.published_at, posts.created_at)');

        $add('reply', DB::table('comments')->join('posts', 'posts.id', '=', 'comments.post_id')
            ->where('comments.author_id', $userId)->whereNull('comments.deleted_at')
            ->whereNull('posts.deleted_at')->where('posts.status', 'published')->where('posts.visibility', 'public')
            ->selectRaw("comments.id AS id, 'reply' AS kind, {$postLabel} AS detail, comments.created_at AS occurred_at, CAST(NULL AS INTEGER) AS correct_count, CAST(NULL AS INTEGER) AS total_questions, posts.id AS ref_id, NULL AS ref_slug"), 'comments.created_at');

        $add('scenario', DB::table('scenario_responses')->join('scenarios', 'scenarios.id', '=', 'scenario_responses.scenario_id')
            ->where('scenario_responses.user_id', $userId)->where('scenarios.status', 'published')
            ->selectRaw("scenario_responses.id AS id, 'scenario' AS kind, scenarios.title AS detail, scenario_responses.created_at AS occurred_at, CAST(NULL AS INTEGER) AS correct_count, CAST(NULL AS INTEGER) AS total_questions, scenarios.id AS ref_id, scenarios.slug AS ref_slug"), 'scenario_responses.created_at');

        $add('save', DB::table('post_saves')->join('posts', 'posts.id', '=', 'post_saves.post_id')
            ->where('post_saves.user_id', $userId)->whereNull('posts.deleted_at')
            ->where('posts.status', 'published')->where('posts.visibility', 'public')
            ->selectRaw("post_saves.id AS id, 'save' AS kind, {$postLabel} AS detail, post_saves.created_at AS occurred_at, CAST(NULL AS INTEGER) AS correct_count, CAST(NULL AS INTEGER) AS total_questions, posts.id AS ref_id, NULL AS ref_slug"), 'post_saves.created_at');

        $add('reaction', DB::table('post_reactions')->join('posts', 'posts.id', '=', 'post_reactions.post_id')
            ->where('post_reactions.user_id', $userId)->whereNull('posts.deleted_at')
            ->where('posts.status', 'published')->where('posts.visibility', 'public')
            ->selectRaw("post_reactions.id AS id, 'reaction' AS kind, {$postLabel} AS detail, post_reactions.created_at AS occurred_at, CAST(NULL AS INTEGER) AS correct_count, CAST(NULL AS INTEGER) AS total_questions, posts.id AS ref_id, NULL AS ref_slug"), 'post_reactions.created_at');

        $completions = DB::table('learning_activity_completions as completions')
            ->join('learning_activities as activities', 'activities.id', '=', 'completions.learning_activity_id')
            ->join('learning_modules as modules', 'modules.id', '=', 'activities.learning_module_id')
            ->join('learning_paths as paths', 'paths.id', '=', 'modules.learning_path_id')
            ->where('completions.user_id', $userId)->where('paths.is_published', true);
        $quizTypes = ['mcq', 'quiz', 'practice'];
        if ($type === 'quiz') {
            $completions->whereIn('activities.type', $quizTypes);
        } elseif ($type === 'lesson') {
            $completions->whereNotIn('activities.type', $quizTypes);
        }
        $learningKind = $type === 'quiz' ? 'quiz' : 'lesson';
        $add($learningKind, $completions->selectRaw("completions.id AS id, CASE WHEN activities.type IN ('mcq', 'quiz', 'practice') THEN 'quiz' ELSE 'lesson' END AS kind, activities.title AS detail, completions.completed_at AS occurred_at, CAST(NULL AS INTEGER) AS correct_count, CAST(NULL AS INTEGER) AS total_questions, paths.id AS ref_id, paths.slug AS ref_slug"), 'completions.completed_at');

        $add('exam', DB::table('pmp_exam_attempts')->where('user_id', $userId)
            ->where('status', 'completed')->whereNotNull('finished_at')
            ->selectRaw("id AS id, 'exam' AS kind, CAST(mode AS TEXT) AS detail, finished_at AS occurred_at, CAST(correct_count AS INTEGER) AS correct_count, CAST(total_questions AS INTEGER) AS total_questions, id AS ref_id, NULL AS ref_slug"), 'finished_at');

        return $sources;
    }

    private function formatRow(object $entry, array $rules): array
    {
        $kind = (string) $entry->kind;
        $score = $kind === 'exam' && $entry->total_questions > 0 && $entry->correct_count !== null
            ? (int) round(100 * $entry->correct_count / $entry->total_questions) : null;
        $target = $score === null ? null : ($score >= ($rules['above_target_from'] ?? 85)
            ? 'above' : ($score >= ($rules['target_below'] ?? 70) ? 'target' : 'below'));
        $description = $kind === 'exam'
            ? match ((string) ($entry->detail ?? '')) {
                'focused' => 'Focused PMP practice',
                'full', '' => 'Full Mock Exam',
                default => 'PMP exam attempt',
            }
            : Str::limit(strip_tags((string) ($entry->detail ?? '')), 130);
        $href = match ($kind) {
            'post', 'reply', 'save', 'reaction' => route('posts.show', ['post' => $entry->ref_id], false),
            'scenario' => route('scenarios.show', ['scenario' => $entry->ref_slug], false),
            'lesson', 'quiz' => route('learning.path', ['path' => $entry->ref_slug], false),
            'exam' => route('exams.pmp.result', ['attempt' => $entry->ref_id], false),
        };

        return [
            'id' => $kind.':'.$entry->id,
            'type' => $kind,
            'detail' => $description,
            'occurredAt' => CarbonImmutable::parse($entry->occurred_at, 'UTC')->toIso8601String(),
            'href' => $href,
            'score' => $score,
            'target' => $target,
        ];
    }

    private function encodeCursor(object $row): string
    {
        return rtrim(strtr(base64_encode(json_encode([
            'time' => (string) $row->occurred_at, 'kind' => (string) $row->kind, 'id' => (int) $row->id,
        ], JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    }

    private function decodeCursor(string $cursor): array
    {
        $payload = json_decode(base64_decode(strtr($cursor, '-_', '+/'), true) ?: '', true);
        if (! is_array($payload) || ! isset($payload['time'], $payload['kind'], $payload['id'])
            || ! is_string($payload['time']) || strlen($payload['time']) > 40
            || ! in_array($payload['kind'], self::TYPES, true)
            || ! is_int($payload['id']) || $payload['id'] < 1) {
            throw new InvalidArgumentException('Invalid activity cursor.');
        }
        try {
            CarbonImmutable::parse($payload['time']);
        } catch (\Throwable) {
            throw new InvalidArgumentException('Invalid activity cursor.');
        }
        return $payload;
    }
}
