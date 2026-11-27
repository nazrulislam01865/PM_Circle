<?php

namespace Tests\Feature\Exam;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class PmpExamStartSelectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        config()->set('pm-ai.enabled', false);
        config()->set('pm-pmp.ai_help_enabled', false);
    }

    private function member(): User
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        DB::table('temporary_memberships')->insert([
            'user_id' => $member->id, 'plan_code' => 'plus',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return $member;
    }

    private function questions(int $count): void
    {
        for ($i = 1; $i <= $count; $i++) {
            DB::table('pmp_exam_questions')->insert([
                'code' => "dialog-question-{$i}", 'domain' => 'Process',
                'difficulty' => 'Moderate', 'prompt' => "Question {$i}?",
                'options' => json_encode(['A' => 'One', 'B' => 'Two', 'C' => 'Three', 'D' => 'Four']),
                'correct_option' => 'B', 'explanation' => 'Explanation',
                'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function test_coverage_counts_every_issued_question_and_new_mixed_random_sets_do_not_leak(): void
    {
        $this->questions(5);
        DB::table('pmp_exam_settings')->insert([
            'id' => 1, 'full_question_count' => 3, 'shuffle_questions' => false,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $member = $this->member();
        $other = $this->member();
        $this->actingAs($member)->getJson('/exams/pmp/start-options')->assertOk()
            ->assertJsonPath('bankTotal', 5)->assertJsonPath('unseenCount', 5)
            ->assertJsonPath('examSize', 3);

        $firstUrl = $this->postJson('/exams/pmp/start', ['selection' => 'new'])
            ->assertOk()->json('takeUrl');
        $first = json_decode(DB::table('pmp_exam_attempts')->find((int) basename($firstUrl))->question_ids, true);
        $this->assertCount(3, $first);
        $this->getJson('/exams/pmp/start-options')->assertOk()
            ->assertJsonPath('usedCount', 3)->assertJsonPath('unseenCount', 2);
        $this->postJson('/exams/pmp/start', ['selection' => 'new'])->assertStatus(409);
        $this->assertDatabaseCount('pmp_exam_attempts', 1);

        $mixedUrl = $this->postJson('/exams/pmp/start', ['selection' => 'mixed'])
            ->assertOk()->json('takeUrl');
        $mixed = json_decode(DB::table('pmp_exam_attempts')->find((int) basename($mixedUrl))->question_ids, true);
        $this->assertCount(3, $mixed);
        $this->assertCount(2, array_diff($mixed, $first), 'All unseen questions must be included.');
        $this->assertCount(1, array_intersect($mixed, $first), 'Previously issued questions fill the remaining slots.');
        $this->getJson('/exams/pmp/start-options')->assertOk()
            ->assertJsonPath('usedCount', 5)->assertJsonPath('unseenCount', 0);
        $this->postJson('/exams/pmp/start', ['selection' => 'random'])->assertOk();

        $this->actingAs($other)->getJson('/exams/pmp/start-options')->assertOk()
            ->assertJsonPath('unseenCount', 5)->assertJsonPath('usedCount', 0);
        $this->assertSame(3, DB::table('pmp_exam_attempts')->where('user_id', $member->id)->count());
    }

    public function test_admin_configured_counts_and_minutes_are_exact_and_insufficient_banks_cannot_start(): void
    {
        $this->questions(5);
        DB::table('pmp_exam_settings')->insert([
            'id' => 1, 'full_question_count' => 6, 'full_duration_minutes' => 48,
            'focused_question_count' => 4, 'focused_duration_minutes' => 15,
            'shuffle_questions' => false, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $member = $this->member();
        $this->actingAs($member)->getJson('/exams/pmp/start-options')->assertOk()
            ->assertJsonPath('bankTotal', 5)->assertJsonPath('examSize', 0)
            ->assertJsonPath('fullQuestionCount', 6)->assertJsonPath('fullDurationMinutes', 48);
        $this->postJson('/exams/pmp/start', ['selection' => 'random'])->assertStatus(409);
        $this->assertDatabaseCount('pmp_exam_attempts', 0);

        // Focused practice has its own administrator-controlled question count and time.
        $focusedUrl = $this->postJson('/exams/pmp/start', [
            'mode' => 'focused', 'domain' => 'Process',
        ])->assertOk()->json('takeUrl');
        $focused = DB::table('pmp_exam_attempts')->find((int) basename($focusedUrl));
        $this->assertSame(4, (int) $focused->total_questions);
        $this->assertSame(15, (int) round(\Carbon\Carbon::parse($focused->started_at)->diffInMinutes($focused->expires_at, true)));

        DB::table('pmp_exam_settings')->where('id', 1)->update(['focused_question_count' => 6]);
        $this->postJson('/exams/pmp/start', ['mode' => 'focused', 'domain' => 'Process'])->assertStatus(409);
        $this->assertDatabaseCount('pmp_exam_attempts', 1);

        DB::table('pmp_exam_settings')->where('id', 1)->update([
            'full_question_count' => 3, 'full_duration_minutes' => 27,
        ]);
        $this->getJson('/exams/pmp/start-options')->assertOk()
            ->assertJsonPath('examSize', 3)->assertJsonPath('fullDurationMinutes', 27);
        $fullUrl = $this->postJson('/exams/pmp/start', ['selection' => 'random'])->assertOk()->json('takeUrl');
        $full = DB::table('pmp_exam_attempts')->find((int) basename($fullUrl));
        $this->assertSame(3, (int) $full->total_questions);
        $this->assertSame(27, (int) round(\Carbon\Carbon::parse($full->started_at)->diffInMinutes($full->expires_at, true)));

        DB::table('pmp_exam_settings')->where('id', 1)->update(['full_duration_minutes' => 40]);
        $this->assertSame(27, (int) round(\Carbon\Carbon::parse($full->started_at)->diffInMinutes($full->expires_at, true)));
    }

    public function test_out_of_order_answers_and_skipped_questions_preserve_scoring(): void
    {
        $this->questions(3);
        DB::table('pmp_exam_settings')->insert([
            'id' => 1, 'full_question_count' => 3, 'shuffle_questions' => false,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $url = $this->actingAs($this->member())->postJson('/exams/pmp/start', ['selection' => 'random'])
            ->assertOk()->json('takeUrl');
        $attempt = (int) basename($url);
        $ids = json_decode(DB::table('pmp_exam_attempts')->find($attempt)->question_ids, true);
        $endpoint = "/exams/pmp/attempts/{$attempt}";

        // Answer the last question first, then return to the first one.
        $this->putJson("{$endpoint}/answer", [
            'questionId' => $ids[2], 'choice' => 'B', 'marked' => false,
        ])->assertOk();
        $this->assertDatabaseMissing('pmp_exam_attempt_answers', [
            'attempt_id' => $attempt, 'question_id' => $ids[0],
        ]);
        $this->putJson("{$endpoint}/answer", [
            'questionId' => $ids[0], 'choice' => 'B', 'marked' => false,
        ])->assertOk();
        $this->postJson("{$endpoint}/submit")->assertOk();
        $this->assertDatabaseMissing('pmp_exam_attempt_answers', [
            'attempt_id' => $attempt, 'question_id' => $ids[1],
        ]);
        $this->assertDatabaseHas('pmp_exam_attempts', [
            'id' => $attempt, 'status' => 'completed', 'correct_count' => 2, 'total_questions' => 3,
        ]);
        $this->get("{$endpoint}/result")->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('exam/Result')->where('attempt.total', 3)->where('attempt.answered', 2)
            ->where('attempt.correct', 2)->etc());
    }

    public function test_imported_approved_workbook_questions_become_active_without_approving_drafts(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'onboarding_step' => 3]);
        $this->actingAs($admin);
        $headers = \App\Services\Exam\PmpQuestionContent::WORKBOOK_HEADERS;
        $buildRow = static function (string $code, string $review): array {
            return [
                $code, 'People', 'I-01', 'Engage stakeholders', 'Moderate', 'Hybrid',
                'Which action should the PM take?', 'Choice A', 'Choice B', 'Choice C', 'Choice D',
                'B', 'Choice B', 'The reason', 'Rationale A', 'Rationale B', 'Rationale C',
                'Rationale D', 'Takeaway', 'Concepts', 'Stakeholders', 'Stakeholder Management',
                'Healthcare', 'Single Select', 'PMBOK Guide', '2.1', 'Stakeholders', 22,
                'ECO', $review,
            ];
        };
        $stream = fopen('php://temp', 'w+');
        foreach ([$headers, $buildRow('review-approved-1', 'Approved'),
            $buildRow('review-draft-2', 'Editorial draft')] as $row) {
            fputcsv($stream, $row, ',', '"', '');
        }
        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => \Illuminate\Http\UploadedFile::fake()->createWithContent('approved-import.csv', $csv),
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertDatabaseHas('pmp_exam_questions', ['code' => 'review-approved-1', 'is_active' => true]);
        $this->assertDatabaseHas('pmp_exam_questions', ['code' => 'review-draft-2', 'is_active' => false]);
    }

    public function test_approved_inactive_questions_can_be_published_without_activating_drafts(): void
    {
        foreach (['Approved', 'Editorial draft'] as $i => $status) {
            DB::table('pmp_exam_questions')->insert([
                'code' => 'review-'.($i + 1), 'domain' => 'People', 'difficulty' => 'Easy',
                'prompt' => 'Review this question?',
                'options' => json_encode(['A' => 'One', 'B' => 'Two', 'C' => 'Three', 'D' => 'Four']),
                'correct_option' => 'B', 'explanation' => 'Because',
                'review_status' => $status, 'is_active' => false,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $member = $this->member();
        $this->actingAs($member)->post('/admin/exam-simulator/pmp/questions/activate-approved')->assertForbidden();
        $this->getJson('/exams/pmp/start-options')->assertOk()->assertJsonPath('bankTotal', 0);
        $admin = User::factory()->create(['is_admin' => true, 'onboarding_step' => 3]);
        $this->actingAs($admin)->post('/admin/exam-simulator/pmp/questions/activate-approved')->assertRedirect();
        $this->assertDatabaseHas('pmp_exam_questions', ['code' => 'review-1', 'is_active' => true]);
        $this->assertDatabaseHas('pmp_exam_questions', ['code' => 'review-2', 'is_active' => false]);
        $this->actingAs($member)->getJson('/exams/pmp/start-options')->assertOk()->assertJsonPath('bankTotal', 1);
    }
}
