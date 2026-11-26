<?php

namespace Tests\Feature\Interview;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class InterviewPrototypeFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function member(): User
    {
        return User::factory()->create(['is_admin' => false, 'status' => 'active', 'onboarding_step' => 3, 'email_verified_at' => now()]);
    }

    private function payload(): array
    {
        return ['industry' => 'software', 'role' => 'Project Manager', 'experience' => 'mid', 'profession' => 'Project Management',
            'types' => ['General', 'Behavioral', 'Technical', 'Situational'], 'count' => 5, 'mode' => 'both', 'mix' => 'recommended',
            'requested_experience' => '4–6 years', 'jd' => 'Lead delivery, manage risks and dependencies.', 'focus' => [], 'question_set' => null];
    }

    public function test_preview_is_not_a_session_and_start_reuses_the_exact_snapshot(): void
    {
        $member = $this->member();
        $payload = $this->payload();
        $preview = $this->actingAs($member)->postJson('/interview-preparation/preview', $payload)->assertOk()->assertJsonCount(5, 'questions')->json();
        $this->assertDatabaseCount('interview_sessions', 0);
        $this->postJson('/interview-preparation/start', array_replace($payload, ['draft' => $preview['draft'], 'count' => 10]))->assertUnprocessable()->assertJsonValidationErrors('draft');
        $this->post('/interview-preparation/start', $payload + ['draft' => $preview['draft']])->assertRedirect();
        $session = DB::table('interview_sessions')->where('user_id', $member->id)->first();
        $this->assertSame($preview['questions'], json_decode($session->questions, true));
        $this->assertSame('4–6 years', $session->requested_experience);
        $this->postJson('/interview-preparation/start', $payload + ['draft' => $preview['draft']])->assertUnprocessable()->assertJsonValidationErrors('draft');
        $this->assertDatabaseCount('interview_sessions', 1);
    }

    public function test_evaluation_skip_completion_and_ownership(): void
    {
        $member = $this->member();
        $this->actingAs($member)->post('/interview-preparation/start', $this->payload())->assertRedirect();
        $id = DB::table('interview_sessions')->where('user_id', $member->id)->value('id');
        $url = '/interview-preparation/sessions/'.$id;
        $this->postJson($url.'/finish')->assertUnprocessable();
        $this->postJson($url.'/answer', ['position' => 1, 'mode' => 'type', 'skip' => true])->assertUnprocessable();
        $response = $this->postJson($url.'/answer', ['position' => 0, 'mode' => 'type', 'answer' => 'I reviewed risks and communicated the result.'])->assertOk()->assertJsonPath('answer.status', 'evaluated')->json();
        $score = $response['answer']['score'];
        $this->postJson($url.'/answer', ['position' => 0, 'mode' => 'type', 'answer' => 'I reviewed risks and communicated the result.'])->assertOk()->assertJsonPath('answer.score', $score);
        $this->assertDatabaseCount('interview_answers', 1);
        for ($i = 1; $i < 5; $i++) {
            $this->postJson($url.'/answer', ['position' => $i, 'mode' => 'type', 'skip' => true])->assertOk()->assertJsonPath('answer.status', 'skipped')->assertJsonPath('answer.score', 0);
        }
        $this->postJson($url.'/finish')->assertOk();
        $this->assertDatabaseHas('interview_sessions', ['id' => $id, 'status' => 'completed', 'overall_score' => round($score / 5, 1)]);
        $this->assertDatabaseCount('interview_ai_usage', 0);
        $this->postJson($url.'/answer', ['position' => 0, 'mode' => 'type', 'answer' => 'Changed'])->assertStatus(409);
        $other = $this->member();
        $this->actingAs($other)->get($url)->assertNotFound();
        $this->get('/interview-preparation/results/'.$id)->assertNotFound();
        $this->postJson($url.'/answer', ['position' => 0, 'mode' => 'type', 'answer' => 'Changed'])->assertNotFound();
    }

    public function test_job_description_text_upload_is_validated(): void
    {
        $this->actingAs($this->member())->post('/interview-preparation/jd-text', ['file' => UploadedFile::fake()->createWithContent('role.txt', 'Project Manager with 4 years of delivery experience.')], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('text', 'Project Manager with 4 years of delivery experience.');
        $this->post('/interview-preparation/jd-text', ['file' => UploadedFile::fake()->create('role.exe', 1)], ['Accept' => 'application/json'])->assertUnprocessable();
    }
}
