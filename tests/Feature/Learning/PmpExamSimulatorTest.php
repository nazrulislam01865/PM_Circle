<?php

namespace Tests\Feature\Learning;

use App\Models\User;
use Database\Seeders\PmpExamQuestionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class PmpExamSimulatorTest extends TestCase
{
    use RefreshDatabase;

    private function plusMember(string $tier = 'plus'): User
    {
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        $user = User::factory()->create(['onboarding_step' => 3]);
        DB::table('temporary_memberships')->insert([
            'user_id' => $user->id, 'plan_code' => $tier,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return $user;
    }

    public function test_guest_and_free_member_cannot_take_plus_practice_exam(): void
    {
        $this->get('/exams/pmp')->assertRedirect('/login');
        $free = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($free)->get('/exams/pmp')->assertForbidden();
        $this->actingAs($free)->post('/exams/pmp/start')->assertForbidden();
    }

    public function test_plus_member_can_start_and_resume_and_active_exam_does_not_leak_answer_keys(): void
    {
        $this->seed(PmpExamQuestionSeeder::class);
        $user = $this->plusMember();
        $this->actingAs($user)->get('/exams/pmp')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('exam/Index')->where('availableQuestions', 8)->where('fullLength', false));
        $first = $this->actingAs($user)->post('/exams/pmp/start');
        $first->assertRedirect();
        $attempt = DB::table('pmp_exam_attempts')->first();
        $this->assertNotNull($attempt);
        $this->assertSame(8, $attempt->total_questions);
        $this->actingAs($user)->post('/exams/pmp/start')->assertRedirect(route('exams.pmp.take', $attempt->id));
        $this->assertDatabaseCount('pmp_exam_attempts', 1);
        $this->actingAs($user)->get(route('exams.pmp.take', $attempt->id))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('exam/Take')->has('questions', 8)
                ->missing('questions.0.correct')->missing('questions.0.explanation')->where('responses', []));
    }

    public function test_answer_is_persisted_and_submit_scores_once_with_idempotent_results(): void
    {
        $this->seed(PmpExamQuestionSeeder::class);
        $user = $this->plusMember();
        $this->actingAs($user)->post('/exams/pmp/start')->assertRedirect();
        $attempt = DB::table('pmp_exam_attempts')->first();
        $firstQuestion = (int) json_decode($attempt->question_ids, true)[0];
        $choice = DB::table('pmp_exam_questions')->where('id', $firstQuestion)->value('correct_option');
        $this->actingAs($user)->putJson(route('exams.pmp.answer', $attempt->id), [
            'questionId' => $firstQuestion, 'choice' => $choice, 'marked' => true,
        ])->assertOk()->assertJson(['saved' => true]);
        $this->assertDatabaseHas('pmp_exam_attempt_answers', [
            'attempt_id' => $attempt->id, 'question_id' => $firstQuestion,
            'choice' => $choice, 'marked_for_review' => true,
        ]);
        $this->actingAs($user)->post(route('exams.pmp.submit', $attempt->id))
            ->assertRedirect(route('exams.pmp.result', $attempt->id));
        $this->actingAs($user)->post(route('exams.pmp.submit', $attempt->id))
            ->assertRedirect(route('exams.pmp.result', $attempt->id));
        $this->assertDatabaseHas('pmp_exam_attempts', [
            'id' => $attempt->id, 'status' => 'completed', 'correct_count' => 1,
        ]);
        $this->actingAs($user)->get(route('exams.pmp.review', $attempt->id))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('exam/Review')
                ->has('questions', 8)->where('questions.0.correct', $choice));
        $this->actingAs($user)->putJson(route('exams.pmp.answer', $attempt->id), [
            'questionId' => $firstQuestion, 'choice' => 'D', 'marked' => false,
        ])->assertStatus(409);
    }

    public function test_member_cannot_read_or_modify_another_members_attempt(): void
    {
        $this->seed(PmpExamQuestionSeeder::class);
        $owner = $this->plusMember();
        $other = $this->plusMember();
        $this->actingAs($owner)->post('/exams/pmp/start')->assertRedirect();
        $attempt = DB::table('pmp_exam_attempts')->first();
        $this->actingAs($other)->get(route('exams.pmp.take', $attempt->id))->assertNotFound();
        $this->actingAs($other)->post(route('exams.pmp.submit', $attempt->id))->assertNotFound();
        $this->actingAs($other)->putJson(route('exams.pmp.answer', $attempt->id), [
            'questionId' => 1, 'choice' => 'A', 'marked' => true,
        ])->assertNotFound();
    }

    public function test_pro_members_can_take_practice_and_downgraded_members_lose_access(): void
    {
        $this->seed(PmpExamQuestionSeeder::class);
        $member = $this->plusMember('pro');
        $this->actingAs($member)->get('/exams/pmp')->assertOk();
        $this->actingAs($member)->post('/exams/pmp/start')->assertRedirect();
        $attempt = DB::table('pmp_exam_attempts')->first();
        $this->actingAs($member)->get(route('exams.pmp.take', $attempt->id))->assertOk();
        DB::table('temporary_memberships')->where('user_id', $member->id)->update(['plan_code' => 'free']);
        $this->actingAs($member)->get(route('exams.pmp.take', $attempt->id))->assertForbidden();
        $this->actingAs($member)->get(route('exams.pmp.result', $attempt->id))->assertForbidden();
        $this->actingAs($member)->putJson(route('exams.pmp.answer', $attempt->id), [
            'questionId' => 1, 'choice' => 'B', 'marked' => false,
        ])->assertForbidden();
    }

    public function test_question_outside_attempt_cannot_be_saved_and_expired_attempt_is_finished_server_side(): void
    {
        $this->seed(PmpExamQuestionSeeder::class);
        $user = $this->plusMember();
        $this->actingAs($user)->post('/exams/pmp/start')->assertRedirect();
        $attempt = DB::table('pmp_exam_attempts')->first();
        $this->actingAs($user)->putJson(route('exams.pmp.answer', $attempt->id), [
            'questionId' => 999999, 'choice' => 'A', 'marked' => false,
        ])->assertStatus(422);
        DB::table('pmp_exam_attempts')->where('id', $attempt->id)->update(['expires_at' => now()->subSecond()]);
        $this->actingAs($user)->get(route('exams.pmp.take', $attempt->id))->assertRedirect(route('exams.pmp.result', $attempt->id));
        $this->assertDatabaseHas('pmp_exam_attempts', [
            'id' => $attempt->id, 'status' => 'completed', 'correct_count' => 0,
        ]);
    }
}
