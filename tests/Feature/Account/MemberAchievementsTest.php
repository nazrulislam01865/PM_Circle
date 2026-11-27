<?php

namespace Tests\Feature\Account;

use App\Domain\Achievements\Queries\MemberAchievements;
use App\Models\LearningCourse;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class MemberAchievementsTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_sources_and_member_isolation(): void
    {
        $this->withoutVite();
        $member = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $now = now()->startOfSecond();
        $post = DB::table('posts')->insertGetId(['author_id' => $member->id, 'body' => 'Approved post', 'status' => 'published', 'published_at' => $now, 'created_at' => $now, 'updated_at' => $now]);
        DB::table('posts')->insert(['author_id' => $member->id, 'body' => 'Restricted post', 'status' => 'restricted', 'created_at' => $now, 'updated_at' => $now]);
        foreach (['approved', 'restricted', 'pending'] as $status) {
            DB::table('comments')->insert(['post_id' => $post, 'author_id' => $member->id, 'body' => 'Comment', 'check_status' => $status, 'created_at' => $now, 'updated_at' => $now]);
        }
        $scenario = Scenario::create(['slug' => 'achievement-scenario', 'title' => 'Challenge', 'summary' => 'Summary', 'situation' => 'Situation', 'known_facts' => [], 'topics' => [], 'focus' => 'Scope', 'status' => 'closed', 'published_at' => $now]);
        $response = DB::table('scenario_responses')->insertGetId(['scenario_id' => $scenario->id, 'user_id' => $member->id, 'body' => 'Answer', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('scenario_responses')->insert(['scenario_id' => $scenario->id, 'user_id' => $member->id, 'parent_id' => $response, 'body' => 'Reply', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('scenario_responses')->insert(['scenario_id' => $scenario->id, 'user_id' => $member->id, 'body' => 'Another answer', 'created_at' => $now, 'updated_at' => $now]);
        foreach ([[$member, 'full'], [$member, 'focused'], [$other, 'full']] as [$owner, $mode]) {
            DB::table('pmp_exam_attempts')->insert(['user_id' => $owner->id, 'status' => 'completed', 'mode' => $mode, 'question_ids' => '[]', 'total_questions' => 15, 'correct_count' => 12, 'started_at' => $now->copy()->subMinutes(30), 'expires_at' => $now, 'finished_at' => $now, 'created_at' => $now, 'updated_at' => $now]);
        }
        $course = LearningCourse::query()->create(['slug' => 'achievement-course', 'title' => 'Verified course', 'summary' => 'Summary', 'overview' => 'Overview', 'category' => 'Project Management', 'level' => 'Beginner', 'minutes' => 20, 'thumbnail' => 1, 'access_tier' => 'free', 'is_published' => true, 'objectives' => [], 'outline' => [], 'lessons' => []]);
        DB::table('learning_course_certificates')->insert(['user_id' => $member->id, 'course_id' => $course->id, 'reference' => (string) Str::uuid(), 'member_name' => $member->name, 'course_title' => $course->title, 'issued_at' => $now]);
        DB::table('learning_course_completions')->insert(['user_id' => $member->id, 'course_id' => $course->id, 'course_title' => $course->title, 'completed_at' => $now]);
        $service = app(MemberAchievements::class);
        $snapshot = $service->snapshot($member);
        $badges = collect($snapshot['badges'])->keyBy('id');
        $this->assertCount(42, $badges);
        foreach (['posts', 'replies', 'challenges', 'courses', 'certificates', 'exams', 'pmpExams'] as $metric) {
            $this->assertSame(1, $snapshot['metrics'][$metric], $metric);
        }
        $this->assertSame(60, $snapshot['metrics']['minutes']);
        $this->assertSame('earned', $badges['hours-60']['status']);
        $this->assertNotNull($badges['hours-60']['earnedAt']);
        $this->assertSame('locked', $badges['scrum-1']['status']);
        $this->assertFalse($badges['scrum-1']['available']);
        $this->assertSame(0, $service->snapshot($other)['metrics']['courses']);
        $this->assertSame($snapshot['latest'], $service->snapshot($member, includeRecord: false)['latest']);
        $this->assertSame([], $service->snapshot($member, includeRecord: false)['records']);
        $this->get('/dashboard/features/achievements')->assertRedirect(route('login'));
        $this->actingAs($member)->get('/dashboard/features/achievements')->assertOk()->assertInertia(fn ($page) => $page->component('account/Achievements')->where('snapshot.metrics.posts', 1)->where('snapshot.metrics.courses', 1)->where('member.name', $member->name));
    }
    public function test_latest_three_use_real_award_dates_and_stable_ties(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $definitions = collect(app(\App\Domain\Achievements\Services\BadgeCatalog::class)->definitions())->where('publishStatus', 'active')->take(4)->values();
        $now = now()->startOfSecond();
        foreach ($definitions as $index => $badge) {
            $earnedAt = match ($index) { 0 => $now->copy()->subDays(10), 1, 2 => $now->copy()->subDay(), default => null };
            DB::table('achievement_awards')->insert(['user_id' => $member->id, 'badge_id' => $badge['id'], 'snapshot' => json_encode([...$badge, 'status' => 'earned', 'earnedAt' => $earnedAt?->toIso8601String(), 'value' => $badge['target'], 'available' => true]), 'earned_at' => $earnedAt, 'created_at' => $now]);
        }
        $latest = app(MemberAchievements::class)->snapshot($member, includeRecord: false, issueAwards: false)['latest'];
        $this->assertSame([$definitions[3]['id'], $definitions[2]['id'], $definitions[1]['id']], array_column($latest, 'id'));
        $this->assertNull($latest[0]['earnedAt']);
        $this->assertArrayNotHasKey('awardOrderAt', $latest[0]);
    }
}
