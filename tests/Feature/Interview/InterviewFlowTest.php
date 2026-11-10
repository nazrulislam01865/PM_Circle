<?php

namespace Tests\Feature\Interview;

use App\Jobs\Interview\EvaluateInterviewAnswer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class InterviewFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        Http::preventStrayRequests();
    }

    private function startPayload(): array
    {
        return [
            'industry' => 'software', 'role' => 'Project Manager', 'experience' => 'mid',
            'types' => ['General', 'Behavioral', 'Technical'], 'count' => 5, 'mode' => 'both',
        ];
    }

    private function member(): User
    {
        return User::factory()->create(['onboarding_step' => 3]);
    }

    public function test_routes_require_authentication_and_onboarding(): void
    {
        $this->get(route('interview.index'))->assertRedirect('/login');
        $this->post(route('interview.start'), $this->startPayload())->assertRedirect('/login');
        $this->actingAs(User::factory()->create(['onboarding_step' => 1]))
            ->get(route('interview.index'))->assertRedirect(route('join.profile'));
        $this->actingAs($this->member())->get(route('interview.index'))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('interview/Index')->has('roles', 6)->has('shell'));
    }

    public function test_start_validates_choices_and_selects_unique_curated_questions(): void
    {
        $this->actingAs($this->member());
        $this->post(route('interview.start'), [...$this->startPayload(), 'count' => 25])
            ->assertSessionHasErrors('count');
        $this->post(route('interview.start'), [...$this->startPayload(), 'types' => []])
            ->assertSessionHasErrors('types');
        $this->post(route('interview.start'), $this->startPayload())->assertRedirect();
        $session = DB::table('interview_sessions')->first();
        $questions = json_decode($session->questions, true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(5, $session->question_count);
        $this->assertCount(5, $questions);
        $this->assertCount(5, array_unique(array_column($questions, 'id')));
        $this->get(route('interview.practice', $session->id))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('interview/Practice')->has('questions', 5)->has('answers', 0));
    }

    public function test_countdown_uses_server_time_and_does_not_reset_on_refresh(): void
    {
        $this->actingAs($this->member())->post(route('interview.start'), $this->startPayload());
        $id = DB::table('interview_sessions')->value('id');
        $this->get(route('interview.practice', $id))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('interview/Practice')
                ->where('session.durationSeconds', 600)
                ->where('session.remainingSeconds', fn ($seconds) => $seconds >= 599 && $seconds <= 600)
                ->where('session.createdAt', fn ($timestamp) => is_string($timestamp) && str_contains($timestamp, 'T'))
                ->where('session.deadlineAt', fn ($timestamp) => is_string($timestamp) && str_contains($timestamp, 'T'))
                ->where('session.serverNow', fn ($timestamp) => is_string($timestamp) && str_contains($timestamp, 'T')));

        $this->travel(3)->minutes();
        $this->get(route('interview.practice', $id))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('interview/Practice')
                ->where('session.durationSeconds', 600)
                ->where('session.remainingSeconds', fn ($seconds) => $seconds >= 419 && $seconds <= 420));

        $this->travel(15)->minutes();
        $this->get(route('interview.practice', $id))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('interview/Practice')
                ->where('session.remainingSeconds', 0));
        // The displayed estimate is not a hard cutoff: existing answers must remain usable.
        $this->postJson(route('interview.answer', $id), [
            'position' => 0, 'answer' => 'I would review goals, agree on priorities, and work with the team.', 'mode' => 'type',
        ])->assertOk();
    }

    public function test_countdown_decreases_with_elapsed_time_not_answered_question_count(): void
    {
        $this->actingAs($this->member())->post(route('interview.start'), $this->startPayload());
        $id = DB::table('interview_sessions')->value('id');
        $started = DB::table('interview_sessions')->where('id', $id)->value('created_at');
        $deadline = \Carbon\CarbonImmutable::parse($started, config('app.timezone'))
            ->addMinutes(10)->toIso8601String();

        // Countdown advances even when no questions have been answered.
        $this->travel(45)->seconds();
        $this->get(route('interview.practice', $id))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('interview/Practice')
                ->where('session.deadlineAt', $deadline)
                ->where('session.remainingSeconds', fn ($seconds) => $seconds >= 554 && $seconds <= 555)
                ->has('answers', 0));

        // Saving an answer does not reduce the remaining time by one question.
        $this->postJson(route('interview.answer', $id), [
            'position' => 0, 'answer' => 'I would clarify objectives, constraints and expected project outcomes.', 'mode' => 'type',
        ])->assertOk();
        $this->get(route('interview.practice', $id))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('interview/Practice')
                ->where('session.deadlineAt', $deadline)
                ->where('session.remainingSeconds', fn ($seconds) => $seconds >= 554 && $seconds <= 555)
                ->has('answers', 1));

        $this->travel(15)->seconds();
        $this->get(route('interview.practice', $id))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('interview/Practice')
                ->where('session.deadlineAt', $deadline)
                ->where('session.remainingSeconds', fn ($seconds) => $seconds >= 539 && $seconds <= 540)
                ->has('answers', 1));
    }

    public function test_results_preserve_unscored_sessions_and_real_question_data(): void
    {
        $this->actingAs($this->member())->post(route('interview.start'), $this->startPayload());
        $id = DB::table('interview_sessions')->value('id');
        $payload = ['answer' => 'I would clarify priorities, document risks, and work with stakeholders.', 'mode' => 'type'];
        for ($position = 0; $position < 5; $position++) {
            $this->postJson(route('interview.answer', $id), ['position' => $position] + $payload)->assertOk();
        }
        $this->postJson(route('interview.finish', $id))->assertOk();
        $this->get(route('interview.results.show', $id))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('interview/Results')
                ->where('selected.overall_score', null)
                ->has('history', 1)
                ->has('questions', 5)
                ->has('answers', 5)
                ->where('answers.0.score', null)
                ->where('answers.0.evaluation', null));
    }

    public function test_interview_answers_and_results_are_private(): void
    {
        $owner = $this->member();
        $another = $this->member();
        $this->actingAs($owner)->post(route('interview.start'), $this->startPayload());
        $id = DB::table('interview_sessions')->value('id');
        $this->actingAs($another)->get(route('interview.practice', $id))->assertNotFound();
        $this->postJson(route('interview.answer', $id), ['position' => 0, 'answer' => str_repeat('A', 40), 'mode' => 'type'])->assertNotFound();
        $this->getJson(route('interview.answer.status', [$id, 0]))->assertNotFound();
        $this->deleteJson(route('interview.answer.retry', [$id, 0]))->assertNotFound();
        $this->postJson(route('interview.finish', $id))->assertNotFound();
        $this->get(route('interview.results.show', $id))->assertNotFound();
    }

    public function test_answers_save_without_openai_credits_or_queued_evaluation(): void
    {
        config()->set('pm-interview.api_key', null);
        config()->set('pm-interview.daily_evaluations.free', 0);
        $this->actingAs($this->member())->post(route('interview.start'), $this->startPayload());
        $id = DB::table('interview_sessions')->value('id');
        $payload = ['position' => 0, 'answer' => 'I would clarify the business need and assess schedule and scope changes.', 'mode' => 'type'];
        $this->postJson(route('interview.answer', $id), $payload)->assertOk()
            ->assertJsonPath('status', 'submitted')->assertJsonPath('answer.evaluation', null);
        $this->postJson(route('interview.answer', $id), $payload)->assertOk();
        $this->assertDatabaseCount('interview_answers', 1);
        $this->assertDatabaseHas('interview_answers', [
            'interview_session_id' => $id, 'position' => 0, 'status' => 'submitted',
            'score' => null, 'input_tokens' => 0, 'output_tokens' => 0,
        ]);
        $this->assertDatabaseCount('interview_ai_usage', 0);
        Queue::assertNotPushed(EvaluateInterviewAnswer::class);
        Http::assertNothingSent();
        $this->getJson(route('interview.answer.status', [$id, 0]))->assertOk()
            ->assertJsonPath('answer.status', 'submitted');
        $this->postJson(route('interview.finish', $id))->assertUnprocessable();
    }

    public function test_member_can_edit_answers_and_complete_without_scoring(): void
    {
        $this->actingAs($this->member())->post(route('interview.start'), $this->startPayload());
        $id = DB::table('interview_sessions')->value('id');
        $payload = ['answer' => 'I would assess the situation, discuss impacts with the team, and communicate the decision.', 'mode' => 'type'];
        $this->postJson(route('interview.answer', $id), ['position' => 1] + $payload)->assertUnprocessable();
        for ($position = 0; $position < 5; $position++) {
            $this->postJson(route('interview.answer', $id), ['position' => $position] + $payload)
                ->assertOk()->assertJsonPath('answer.position', $position);
        }
        $updated = ['answer' => 'After reviewing the situation, I would clarify priorities and present options to the sponsor.', 'mode' => 'type'];
        $this->postJson(route('interview.answer', $id), ['position' => 1] + $updated)->assertOk();
        $this->assertDatabaseCount('interview_answers', 5);
        $this->assertDatabaseHas('interview_answers', [
            'interview_session_id' => $id, 'position' => 1, 'status' => 'submitted', 'answer' => $updated['answer'],
        ]);
        $this->postJson(route('interview.finish', $id))->assertOk()
            ->assertJsonPath('url', route('interview.results.show', $id));
        $this->postJson(route('interview.finish', $id))->assertOk();
        $this->assertDatabaseHas('interview_sessions', ['id' => $id, 'status' => 'completed', 'overall_score' => null]);
        $this->assertDatabaseCount('interview_ai_usage', 0);
        $this->get(route('interview.results.show', $id))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('interview/Results')->has('answers', 5)->has('history', 1));
        $this->postJson(route('interview.answer', $id), ['position' => 0] + $payload)->assertStatus(409);
    }

    public function test_speech_transcript_can_be_submitted_as_text_and_old_pending_answers_can_finish(): void
    {
        $this->actingAs($this->member())->post(route('interview.start'), [...$this->startPayload(), 'mode' => 'speak']);
        $id = DB::table('interview_sessions')->value('id');
        $payload = ['answer' => 'I would investigate constraints, align with stakeholders, and document the decision.'];
        $this->postJson(route('interview.answer', $id), ['position' => 0, 'mode' => 'speak'] + $payload)->assertOk();
        DB::table('interview_answers')->where('interview_session_id', $id)->where('position', 0)
            ->update(['status' => 'pending']); // Compatibility with sessions started before AI was disabled.
        for ($position = 1; $position < 5; $position++) {
            $this->postJson(route('interview.answer', $id), ['position' => $position, 'mode' => 'type'] + $payload)->assertOk();
        }
        $this->postJson(route('interview.finish', $id))->assertOk();
        $this->assertDatabaseCount('interview_ai_usage', 0);
        Queue::assertNotPushed(EvaluateInterviewAnswer::class);
        Http::assertNothingSent();
    }
}
