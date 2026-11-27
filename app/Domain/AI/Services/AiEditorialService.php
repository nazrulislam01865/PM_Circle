<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Support\AiFailure;
use App\Models\User;
use App\Domain\DailyChallenge\Services\DailyChallengeSettings;
use App\Domain\DailyChallenge\Services\DailyChallengeGenerationBrief;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** AI drafts remain private until staff publication or the explicitly enabled daily auto-publish policy. */
final class AiEditorialService
{
    public function __construct(private readonly AiGateway $gateway,
        private readonly AiAdminAccess $access) {}

    public function createScenarioSlot(string $date): object
    {
        if (! config('pm-ai.editorial_enabled')) {
            throw new AiFailure('FEATURE_DISABLED', 503);
        }
        $localDate = Carbon::createFromFormat('!Y-m-d', $date, 'Asia/Dhaka');
        if (! $localDate || $localDate->format('Y-m-d') !== $date) {
            throw new AiFailure('INVALID_PUBLICATION_DATE', 422);
        }
        $slot = 'daily-scenario:'.$date;
        $time = app(DailyChallengeSettings::class)->get()->publish_time;
        [$hour, $minute] = array_map('intval', explode(':', $time));
        $publishAt = $localDate->setTime($hour, $minute)->utc();
        DB::table('ai_editorial_drafts')->insertOrIgnore([
            'feature' => 'scenario_generate', 'slot_key' => $slot,
            'status' => 'queued', 'publication_at' => $publishAt,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return DB::table('ai_editorial_drafts')->where('feature', 'scenario_generate')
            ->where('slot_key', $slot)->first();
    }

    /** Never replay an ambiguous provider request or remove settled request history. */
    public const SCENARIO_RETRYABLE_ERRORS = [
        'MODERATION_UNAVAILABLE', 'MODERATION_AUTH_FAILED', 'MODERATION_PERMISSION_DENIED',
        'MODERATION_RATE_LIMITED', 'PROVIDER_NOT_CONFIGURED', 'PROVIDER_AUTH_FAILED',
        'PROVIDER_PERMISSION_DENIED', 'PROVIDER_RATE_LIMITED', 'PROVIDER_QUOTA_EXHAUSTED',
        'PROVIDER_UNAVAILABLE', 'PROVIDER_REJECTED', 'QUEUE_DELIVERY_FAILED',
        'INVALID_AI_RESPONSE', 'INCOMPLETE_AI_RESPONSE',
    ];

    public function queueScenarioSlot(string $date, ?string $exactTitle = null, bool $manual = false, ?int $actorId = null, bool $archiveRecovery = false): array
    {
        return DB::transaction(function () use ($date, $exactTitle, $manual, $actorId, $archiveRecovery): array {
            if ($date < now('Asia/Dhaka')->toDateString() && ! ($manual && $archiveRecovery)) {
                throw new AiFailure('PAST_PUBLICATION_DATE', 422);
            }
            if (DB::table('scenarios')->where('daily_slot', $date)->exists()) {
                return ['status' => 'published'];
            }
            if ($archiveRecovery && (! $manual || ! $actorId || ! DB::table('ai_editorial_drafts')
                ->where('feature', 'scenario_generate')->where('slot_key', 'daily-scenario:'.$date)
                ->where('status', 'failed')->exists())) {
                throw new AiFailure('ARCHIVE_RECOVERY_NOT_ELIGIBLE', 422);
            }
            $draft = $this->createScenarioSlot($date);
            $draft = DB::table('ai_editorial_drafts')->where('id', $draft->id)->lockForUpdate()->first();
            $expired = $date < now('Asia/Dhaka')->toDateString() || ($draft->publication_at && Carbon::parse($draft->publication_at)
                ->addHours((int) app(DailyChallengeSettings::class)->get()->expiry_hours)->lessThanOrEqualTo(now()));
            if ($archiveRecovery && ! $expired) throw new AiFailure('ARCHIVE_RECOVERY_NOT_ELIGIBLE', 422);
            if (! $draft->publication_at || ($expired && ! ($manual && $archiveRecovery && $draft->status === 'failed'))) {
                throw new AiFailure('PUBLICATION_WINDOW_CLOSED', 422);
            }
            if (! in_array($draft->status, ['queued', 'failed'], true) || ($draft->request_id !== null && $draft->status !== 'failed')) {
                if ($manual && $draft->status === 'queued' && $draft->request_id !== null
                    && DB::table('ai_requests')->where('id', $draft->request_id)->value('status') === 'provider_status_unknown') {
                    return ['draft_id' => $draft->id, 'status' => 'queued', 'blocked' => 'RECONCILIATION_OR_REVIEW_REQUIRED'];
                }
                return ['draft_id' => $draft->id, 'status' => $draft->status];
            }
            if ($draft->status === 'failed') {
                $requests = DB::table('ai_requests')->where('feature_code', 'scenario_generate')
                    ->where('subject_type', 'editorial_draft')->where('subject_id', $draft->id);
                $last = (clone $requests)->orderByDesc('id')->first(['id', 'status', 'error_code', 'updated_at']);
                if (! $last || (int) $last->id !== (int) $draft->request_id || $last->status !== 'failed'
                    || ! in_array($last->error_code, self::SCENARIO_RETRYABLE_ERRORS, true)
                    || (clone $requests)->whereNotIn('status', ['failed', 'cancelled'])->exists()) {
                    return ['draft_id' => $draft->id, 'status' => 'failed', 'blocked' => 'RECONCILIATION_OR_REVIEW_REQUIRED'];
                }
                $attempts = max((int) $draft->generation_attempts, (clone $requests)->count());
                if ($attempts >= 6) {
                    return ['draft_id' => $draft->id, 'status' => 'failed', 'retry_limit_reached' => true];
                }
                // Three additional recovery attempts, spaced farther apart after the original cap.
                $cooldown = $attempts >= 3 ? 180 : 30;
                if (! $manual && Carbon::parse($last->updated_at)->addMinutes($cooldown)->isFuture()) {
                    return ['draft_id' => $draft->id, 'status' => 'failed', 'retry_waiting' => true];
                }
                DB::table('ai_editorial_drafts')->where('id', $draft->id)->update([
                    'request_id' => null, 'status' => 'queued', 'payload_encrypted' => null,
                    'reviewed_by' => null, 'generation_attempts' => $attempts, 'updated_at' => now(),
                ]);
                $this->access->audit($actorId, 'daily_challenge.draft.retry', 'ai_editorial_drafts',
                    $draft->id, ['last_request_id' => $last->id, 'error_code' => $last->error_code],
                    ['attempt' => $attempts + 1], $manual ? 'Administrator requested retry' : 'Scheduled bounded recovery');
            }
            if ($archiveRecovery && $expired) {
                DB::table('ai_editorial_drafts')->where('id', $draft->id)->update(['archive_recovery' => true]);
            }
            // Missing moderation configuration is an admission error, not a paid retry.
            $localSmokeTest = app()->environment('local') && config('pm-ai.daily_challenge_skip_generation_moderation', false);
            if (! $localSmokeTest && ! filled(app(AiFeatureRouting::class)->moderationSecret())) {
                throw new AiFailure('MODERATION_NOT_CONFIGURED', 503);
            }
            DB::table('ai_editorial_drafts')->where('id', $draft->id)->increment('generation_attempts');
            $recent = DB::table('scenarios')->where('published_at', '>=', now()->subDays(30))
                ->orderByDesc('published_at')->limit(25)->pluck('title')->all();
            $brief = app(DailyChallengeGenerationBrief::class)->forDate($date, $exactTitle);
            $response = $this->gateway->submitEditorial('scenario_generate', $draft->id, [
                'local_publication_date' => $date, 'recent_titles_to_avoid' => $recent,
                'topic' => 'Project management challenges; realistic and educational',
                'editorial_brief' => $brief,
            ]);
            return ['draft_id' => $draft->id, 'request' => $response];
        });
    }

    public function createTrendDraft(array $sourceIds, string $slot): array
    {
        if (! config('pm-ai.editorial_enabled')) {
            throw new AiFailure('FEATURE_DISABLED', 503);
        }
        $sources = DB::table('trend_sources')->whereIn('id', $sourceIds)
            ->where('rights_status', 'verified')->get();
        if ($sources->count() !== count(array_unique($sourceIds)) || $sources->isEmpty()) {
            throw new AiFailure('UNVERIFIED_SOURCES', 422);
        }
        return DB::transaction(function () use ($slot, $sources): array {
            DB::table('ai_editorial_drafts')->insertOrIgnore([
                'feature' => 'trend_draft', 'slot_key' => $slot,
                'source_refs_json' => json_encode($sources->pluck('id')->all()),
                'status' => 'queued', 'created_at' => now(), 'updated_at' => now(),
            ]);
            $draft = DB::table('ai_editorial_drafts')->where('feature', 'trend_draft')
                ->where('slot_key', $slot)->lockForUpdate()->first();
            if ($draft->request_id !== null) {
                return ['draft_id' => $draft->id, 'status' => $draft->status];
            }
            $context = $sources->map(fn ($s) => [
                'url' => $s->canonical_url, 'publisher' => $s->publisher,
                'excerpt' => mb_substr(Crypt::decryptString($s->excerpt_encrypted), 0, 2200),
            ])->all();
            return ['draft_id' => $draft->id,
                'request' => $this->gateway->submitEditorial('trend_draft', $draft->id,
                    ['verified_sources' => $context, 'instruction' => 'Use ONLY the verified excerpts.'])];
        });
    }

    /** Approval does not publish; two separate privileged actions are audited. */
    public function edit(User $actor, int $id, array $content, string $reason): void
    {
        $this->access->authorize($actor, 'ai.manage_editorial');
        DB::transaction(function () use ($actor, $id, $content, $reason): void {
            $draft = DB::table('ai_editorial_drafts')->where('id', $id)->lockForUpdate()->first();
            if (! $draft || ! in_array($draft->status, ['pending_review', 'scheduled', 'approved'], true)) {
                throw new AiFailure('DRAFT_NOT_REVIEWABLE', 409);
            }
            $validated = app(AiFeatureCatalog::class)->validate($draft->feature, $content);
            if ($draft->feature === 'trend_draft') {
                $sources = DB::table('trend_sources')->whereIn('id',
                    json_decode($draft->source_refs_json, true) ?: [])->pluck('canonical_url')->all();
                if (empty($validated['source_urls']) || array_diff($validated['source_urls'], $sources)) {
                    throw new AiFailure('UNVERIFIED_SOURCES', 422);
                }
            }
            $version = (int) DB::table('ai_editorial_draft_versions')->where('draft_id', $id)
                ->max('version') + 1;
            $encrypted = Crypt::encryptString(json_encode($validated, JSON_THROW_ON_ERROR));
            DB::table('ai_editorial_draft_versions')->insert([
                'draft_id' => $id, 'version' => $version,
                'payload_encrypted' => $encrypted, 'editor_id' => $actor->id,
                'reason' => $reason, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('ai_editorial_drafts')->where('id', $id)->update([
                'payload_encrypted' => $encrypted, 'reviewed_by' => null,
                'status' => 'pending_review', 'updated_at' => now(),
            ]);
            $this->access->audit($actor->id, 'editorial.edit', 'ai_editorial_drafts',
                $id, ['version' => $version - 1], ['version' => $version], $reason);
        }, 3);
    }

    public function approve(User $actor, int $id, string $reason): void
    {
        $this->access->authorize($actor, 'ai.manage_editorial');
        DB::transaction(function () use ($actor, $id, $reason): void {
            $draft = DB::table('ai_editorial_drafts')->where('id', $id)->lockForUpdate()->first();
            if (! $draft || ! in_array($draft->status, ['pending_review', 'scheduled', 'approved'], true) || ! $draft->payload_encrypted) {
                throw new AiFailure('DRAFT_NOT_REVIEWABLE', 409);
            }
            $data = json_decode(Crypt::decryptString($draft->payload_encrypted), true);
            if (! is_array($data)) {
                throw new AiFailure('INVALID_EDITORIAL_DRAFT', 422);
            }
            if ($draft->feature === 'trend_draft') {
                $sources = DB::table('trend_sources')->whereIn('id',
                    json_decode($draft->source_refs_json, true) ?: [])->pluck('canonical_url')->all();
                if (empty($data['source_urls']) || array_diff($data['source_urls'], $sources)) {
                    throw new AiFailure('UNVERIFIED_SOURCES', 422);
                }
            }
            DB::table('ai_editorial_drafts')->where('id', $id)->update([
                'status' => 'approved', 'reviewed_by' => $actor->id, 'updated_at' => now(),
            ]);
            $this->access->audit($actor->id, 'editorial.approve', 'ai_editorial_drafts',
                $id, ['status' => $draft->status], ['status' => 'approved'], $reason);
        });
    }

    public function publish(User $actor, int $id, string $reason): int
    {
        $this->access->authorize($actor, 'ai.manage_editorial');
        return DB::transaction(function () use ($actor, $id, $reason): int {
            $draft = DB::table('ai_editorial_drafts')->where('id', $id)->lockForUpdate()->first();
            if (! $draft || $draft->status !== 'approved' || $draft->reviewed_by === null) {
                throw new AiFailure('DRAFT_NOT_APPROVED', 409);
            }
            $data = json_decode(Crypt::decryptString($draft->payload_encrypted), true);
            if ($draft->feature === 'scenario_generate') {
                $publishedId = $this->persistScenario($draft, $data, $actor->id);
                $subject = 'scenarios';
            } elseif ($draft->feature === 'trend_draft') {
                $sources = DB::table('trend_sources')->whereIn('id', json_decode($draft->source_refs_json, true) ?: [])
                    ->where('rights_status', 'verified')->get();
                if ($sources->isEmpty() || empty($data['source_urls']) || array_diff($data['source_urls'], $sources->pluck('canonical_url')->all())) {
                    throw new AiFailure('UNVERIFIED_SOURCES', 422);
                }
                $articleId = DB::table('trend_articles')->insertGetId([
                    'slug' => Str::slug($data['title']).'-'.$draft->id,
                    'title' => mb_substr($data['title'], 0, 180),
                    'summary' => $data['summary'], 'body_markdown' => $data['body_markdown'],
                    'status' => 'published', 'ai_generated' => true, 'approved_by' => $actor->id,
                    'published_at' => now(), 'created_at' => now(), 'updated_at' => now(),
                ]);
                foreach ($sources as $source) {
                    DB::table('trend_article_sources')->insert([
                        'article_id' => $articleId, 'source_id' => $source->id,
                    ]);
                }
                DB::table('trend_article_versions')->insert([
                    'article_id' => $articleId, 'version' => 1, 'editor_id' => $actor->id,
                    'body_markdown' => $data['body_markdown'], 'change_summary' => 'Initial approved AI draft',
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $subject = 'trend_articles';
                $publishedId = $articleId;
            } else {
                throw new AiFailure('INVALID_EDITORIAL_DRAFT', 422);
            }
            DB::table('ai_editorial_drafts')->where('id', $id)->update([
                'status' => 'published', 'published_at' => now(), 'updated_at' => now(),
            ]);
            $this->access->audit($actor->id, 'editorial.publish', $subject,
                $publishedId, null, ['draft_id' => $id], $reason);
            return $publishedId;
        }, 3);
    }

    /** Intentionally distinct from human approve/publish: only an explicitly enabled
     * daily slot may go live without staff sign-off. The draft lock and unique slot
     * make scheduler retries idempotent. */
    public function publishAutomatedScenario(int $id, ?int $archiveActorId = null): ?int
    {
        $policy = app(DailyChallengeSettings::class);
        $settings = $policy->get();
        // Publishing validated, persisted content does not require another provider request.
        if (! $settings->enabled || ! $settings->auto_publish || ! config('pm-ai.enabled') || ! config('pm-ai.editorial_enabled')) {
            return null;
        }
        return DB::transaction(function () use ($id, $policy, $archiveActorId): ?int {
            $draft = DB::table('ai_editorial_drafts')->where('id', $id)->lockForUpdate()->first();
            if (! $draft || $draft->feature !== 'scenario_generate'
                || ! in_array($draft->status, ['pending_review', 'scheduled', 'approved'], true) || ! $draft->payload_encrypted
                || ! str_starts_with($draft->slot_key, 'daily-scenario:')
                || ! $draft->publication_at || Carbon::parse($draft->publication_at)->isFuture()) {
                return null;
            }
            $day = substr($draft->slot_key, strlen('daily-scenario:'));
            if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $day)) {
                throw new AiFailure('INVALID_PUBLICATION_DATE', 422);
            }
            // Historical slots only enter the archive via an explicit admin recovery.
            $expired = $day < now('Asia/Dhaka')->toDateString() || Carbon::parse($draft->publication_at)
                ->addHours((int) $policy->get()->expiry_hours)->lessThanOrEqualTo(now());
            $archive = $expired && ((bool) $draft->archive_recovery || $archiveActorId !== null);
            if ($expired && ! $archive) return null;
            $existing = DB::table('scenarios')->where('daily_slot', $day)->value('id');
            if ($existing) {
                DB::table('ai_editorial_drafts')->where('id', $id)->update([
                    'status' => 'published', 'published_at' => now(), 'updated_at' => now(),
                ]);
                return (int) $existing;
            }
            if ($draft->request_id && DB::table('ai_requests')->where('id', $draft->request_id)->value('status') !== 'completed') {
                throw new AiFailure('GENERATION_NOT_COMPLETED', 409);
            }
            $data = json_decode(Crypt::decryptString($draft->payload_encrypted), true);
            if (! is_array($data)) {
                throw new AiFailure('INVALID_EDITORIAL_DRAFT', 422);
            }
            $scenarioId = $this->persistScenario($draft, $data, null, $archive);
            DB::table('ai_editorial_drafts')->where('id', $id)->update([
                'status' => 'published', 'published_at' => now(), 'updated_at' => now(),
            ]);
            $this->access->audit($archiveActorId, 'editorial.auto_publish', 'scenarios', $scenarioId,
                null, ['draft_id' => $id, 'slot' => $day, 'archive' => $archive, 'requested_by' => $archiveActorId],
                'Automated daily publication explicitly enabled by administrator');
            return $scenarioId;
        }, 3);
    }

    private function persistScenario(object $draft, array $data, ?int $actorId, bool $archive = false): int
    {
        $data = app(AiFeatureCatalog::class)->validate('scenario_generate', $data);
        $rubric = $data['rubric_criteria'];
        $max = array_sum(array_map(fn ($item) => (int) $item['max_points'], $rubric));
        $keys = array_column($rubric, 'key');
        if ($max !== 10 || count($rubric) < 2 || count($rubric) > 6
            || count($keys) !== count(array_unique($keys))
            || count($data['known_facts']) < 2 || count($data['topics']) < 1
            || mb_strlen($data['title']) > 180 || mb_strlen($data['summary']) > 1500
            || mb_strlen($data['situation']) > 6000 || mb_strlen($data['learner_prompt']) > 1500) {
            throw new AiFailure('INVALID_EDITORIAL_DRAFT', 422);
        }
        foreach ($rubric as $criterion) {
            if (! preg_match('/^[a-z][a-z0-9_]{0,59}$/', $criterion['key'])
                || (int) $criterion['max_points'] < 1 || (int) $criterion['max_points'] > 10) {
                throw new AiFailure('INVALID_RUBRIC', 422);
            }
        }
        $slot = str_starts_with($draft->slot_key, 'daily-scenario:')
            ? substr($draft->slot_key, strlen('daily-scenario:')) : null;
        $settings = app(DailyChallengeSettings::class)->get();
        $expires = $slot && $draft->publication_at
            ? Carbon::parse($draft->publication_at)->addHours((int) $settings->expiry_hours)
            : now()->addHours((int) $settings->expiry_hours);
        $publishedAt = now();
        if ($archive) $expires = $publishedAt->copy();
        $slug = Str::slug($data['title']).'-'.$draft->id;
        $id = DB::table('scenarios')->insertGetId([
            'slug' => $slug, 'title' => $data['title'],
            'summary' => $data['summary'],
            'situation' => $data['situation']."\n\n".$data['learner_prompt'],
            'known_facts' => json_encode($data['known_facts'], JSON_THROW_ON_ERROR),
            'topics' => json_encode($data['topics'], JSON_THROW_ON_ERROR),
            'difficulty' => mb_substr($data['difficulty'], 0, 32),
            'focus' => mb_substr($data['focus'], 0, 80), 'minutes' => 10,
            'status' => $archive || $expires->isPast() ? 'closed' : 'published',
            'rubric_version' => 1, 'ai_generated' => true,
            'daily_slot' => $slot, 'expires_at' => $expires,
            'published_at' => $publishedAt, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('scenario_rubric_versions')->insert([
            'scenario_id' => $id, 'version' => 1,
            'criteria_json' => json_encode($rubric, JSON_THROW_ON_ERROR), 'max_score' => 10,
            'approved_by' => $actorId, 'created_at' => now(), 'updated_at' => now(),
        ]);
        return $id;
    }

}
