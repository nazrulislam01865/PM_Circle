<?php

namespace Tests\Feature\Exam;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class PmpPersonalDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        config()->set('pm-pmp.ai_help_enabled', false);
    }

    private function member(): User
    {
        $user = User::factory()->create(['onboarding_step' => 3]);
        DB::table('temporary_memberships')->insert([
            'user_id' => $user->id, 'plan_code' => 'plus',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return $user;
    }

    private function seedQuestions(int $count = 1): void
    {
        for ($i = 1; $i <= $count; $i++) {
            DB::table('pmp_exam_questions')->insert([
                'code' => "pmp-test-{$i}", 'domain' => $i === $count ? 'People' : 'Process',
                'difficulty' => 'Moderate', 'prompt' => "Question number {$i}?",
                'options' => json_encode(['A' => 'Option A', 'B' => 'Option B', 'C' => 'Option C', 'D' => 'Option D']),
                'correct_option' => 'B', 'explanation' => 'Option B is correct.',
                'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function test_signed_in_eligible_member_enters_the_dashboard_not_the_public_page(): void
    {
        $this->actingAs($this->member())
            ->get('/exam-simulator/pmp')->assertRedirect('/exams/pmp');
        $this->get('/exam-simulator/pmp?preview=1')->assertRedirect('/exams/pmp/enter');
        $this->get('/exams/pmp/enter')->assertRedirect('/exams/pmp');
        $free = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($free)->get('/exam-simulator/pmp')->assertRedirect('/exams/pmp/enter');
        $this->get('/exams/pmp/enter')->assertRedirect('/pricing');
    }

    public function test_only_guests_can_view_the_public_pmp_page(): void
    {
        $this->get('/exam-simulator/pmp')->assertOk();
    }

    public function test_every_new_mock_preserves_the_existing_attempt_and_saved_answer(): void
    {
        $member = $this->member();
        $this->seedQuestions();
        $first = $this->actingAs($member)->postJson('/exams/pmp/start')->assertOk()->json('takeUrl');
        $this->assertNotEmpty($first);
        $firstId = (int) basename($first);
        $questionId = (int) DB::table('pmp_exam_questions')->value('id');
        $this->putJson("/exams/pmp/attempts/{$firstId}/answer", [
            'questionId' => $questionId, 'choice' => 'B', 'marked' => true,
        ])->assertOk();

        $second = $this->postJson('/exams/pmp/start')->assertOk()->json('takeUrl');
        $secondId = (int) basename($second);
        $this->assertNotSame($firstId, $secondId);
        $this->assertDatabaseCount('pmp_exam_attempts', 2);
        $this->assertDatabaseHas('pmp_exam_attempt_answers', [
            'attempt_id' => $firstId, 'choice' => 'B', 'marked_for_review' => true,
        ]);
        $this->get("/exams/pmp/attempts/{$firstId}")->assertOk();
    }

    public function test_focused_practice_uses_at_most_fifteen_questions_from_the_selected_domain(): void
    {
        $member = $this->member();
        $this->seedQuestions(20);
        $url = $this->actingAs($member)->postJson('/exams/pmp/start', [
            'mode' => 'focused', 'domain' => 'Process',
        ])->assertOk()->json('takeUrl');
        $attempt = DB::table('pmp_exam_attempts')->where('id', (int) basename($url))->first();
        $this->assertSame(15, (int) $attempt->total_questions);
        $this->assertCount(15, json_decode($attempt->question_ids, true));
    }

    public function test_target_date_is_persisted_and_invalid_dates_are_rejected(): void
    {
        $user = $this->member();
        $date = now('Asia/Dhaka')->addMonth()->toDateString();
        $this->actingAs($user)->putJson('/exams/pmp/target-date', [
            'targetDate' => $date,
        ])->assertOk()->assertJsonPath('targetDate', $date);
        $this->assertDatabaseHas('profiles', ['user_id' => $user->id, 'pmp_target_exam_date' => $date]);
        $this->putJson('/exams/pmp/target-date', ['targetDate' => '2000-01-01'])
            ->assertUnprocessable()->assertJsonValidationErrors('targetDate');
    }

    public function test_review_is_owned_and_ai_help_is_disabled_without_configuration(): void
    {
        $owner = $this->member();
        $other = $this->member();
        $this->seedQuestions();
        $attemptUrl = $this->actingAs($owner)->postJson('/exams/pmp/start')->assertOk()->json('takeUrl');
        $attemptId = (int) basename($attemptUrl);
        $questionId = (int) DB::table('pmp_exam_questions')->value('id');
        $this->postJson("/exams/pmp/attempts/{$attemptId}/submit")->assertOk();
        $this->get("/exams/pmp/attempts/{$attemptId}/review")->assertOk();
        $this->postJson("/exams/pmp/attempts/{$attemptId}/questions/{$questionId}/ai-help")
            ->assertStatus(503);
        $this->actingAs($other)->get("/exams/pmp/attempts/{$attemptId}/review")->assertNotFound();
        $this->postJson("/exams/pmp/attempts/{$attemptId}/questions/{$questionId}/ai-help")
            ->assertNotFound();
    }
    public function test_history_uses_a_member_scoped_cursor_and_bounded_pages(): void
    {
        $owner = $this->member();
        $other = $this->member();
        $this->seedQuestions();
        $questionId = DB::table('pmp_exam_questions')->value('id');
        for ($i = 0; $i < 43; $i++) {
            DB::table('pmp_exam_attempts')->insert([
                'user_id' => $owner->id, 'status' => 'completed',
                'question_ids' => json_encode([$questionId]), 'total_questions' => 1,
                'correct_count' => 0, 'started_at' => now()->subHours(2),
                'expires_at' => now()->subHour(), 'finished_at' => now()->subHour(),
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        DB::table('pmp_exam_attempts')->insert([
            'user_id' => $other->id, 'status' => 'completed',
            'question_ids' => json_encode([$questionId]), 'total_questions' => 1,
            'correct_count' => 0, 'started_at' => now()->subHours(2),
            'expires_at' => now()->subHour(), 'finished_at' => now()->subHour(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($owner)->get('/exams/pmp')->assertOk();
        $lastId = (int) DB::table('pmp_exam_attempts')->where('user_id', $owner->id)
            ->orderByDesc('id')->skip(39)->value('id');
        $page = $this->getJson('/exams/pmp/history?before='.$lastId)->assertOk();
        $this->assertCount(3, $page->json('attempts'));
        $this->assertNull($page->json('nextCursor'));
        foreach ($page->json('attempts') as $attempt) {
            $this->assertDatabaseHas('pmp_exam_attempts', ['id' => $attempt['id'], 'user_id' => $owner->id]);
        }
    }

    public function test_ai_help_is_metered_and_repeated_requests_reuse_the_saved_reply(): void
    {
        $owner = $this->member();
        $this->seedQuestions();
        config()->set('pm-pmp.ai_help_enabled', true);
        config()->set('pm-pmp.ai_api_key', 'test-only-key');
        config()->set('pm-pmp.initial_tokens.plus', 5000);
        Http::fake([
            'https://api.openai.com/v1/moderations' => Http::response([
                'results' => [['flagged' => false]],
            ], 200),
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [['message' => ['content' => json_encode([
                    'explanation' => 'Review the agreed change control process.',
                    'nextStep' => 'Practice impact assessment.',
                ])]]],
                'usage' => ['total_tokens' => 150],
            ], 200),
        ]);
        $this->actingAs($owner)->get('/exams/pmp')->assertOk();
        $url = $this->postJson('/exams/pmp/start')->assertOk()->json('takeUrl');
        $attemptId = (int) basename($url);
        $questionId = (int) DB::table('pmp_exam_questions')->value('id');
        $this->postJson("/exams/pmp/attempts/{$attemptId}/submit")->assertOk();
        for ($i = 0; $i < 2; $i++) {
            $this->postJson("/exams/pmp/attempts/{$attemptId}/questions/{$questionId}/ai-help")
                ->assertOk()->assertJsonPath('nextStep', 'Practice impact assessment.');
        }
        Http::assertSentCount(2); // One moderation + one explanation, second request is cached.
        $this->assertDatabaseHas('pmp_ai_credit_events', [
            'user_id' => $owner->id, 'kind' => 'question_explanation', 'tokens' => -150,
        ]);
    }

}
