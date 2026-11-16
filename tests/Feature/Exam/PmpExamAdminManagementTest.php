<?php

namespace Tests\Feature\Exam;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class PmpExamAdminManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config()->set('pm-circle.temporary_paid_access_enabled', true);
    }

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true, 'onboarding_step' => 3]);
    }

    private function member(): User
    {
        $user = User::factory()->create(['onboarding_step' => 3]);
        DB::table('temporary_memberships')->insert([
            'user_id' => $user->id, 'plan_code' => 'plus', 'created_at' => now(), 'updated_at' => now(),
        ]);
        return $user;
    }

    private function settings(array $overrides = []): array
    {
        return array_merge([
            'enabled' => true, 'full_question_count' => 3, 'full_duration_minutes' => 24,
            'focused_question_count' => 2, 'focused_duration_minutes' => 12,
            'shuffle_questions' => false, 'sample_duration_seconds' => 120,
            'needs_improvement_below' => 25, 'target_below' => 65,
            'above_target_from' => 85, 'sample_question_id' => null,
        ], $overrides);
    }

    private function question(string $code = 'case-one'): array
    {
        return [
            'code' => $code, 'domain' => 'Process', 'difficulty' => 'Moderate',
            'prompt' => 'How should the PM respond to a new change request?',
            'options' => ['A' => 'Ignore', 'B' => 'Analyze impact', 'C' => 'Implement', 'D' => 'Close'],
            'correct_option' => 'B', 'explanation' => 'Assess impact before approval.',
            'other_options' => null, 'takeaway' => null, 'concepts' => null, 'references' => null, 'is_active' => true,
        ];
    }

    public function test_only_admin_can_manage_exam_settings_and_questions(): void
    {
        $this->get('/admin/exam-simulator/pmp/questions')->assertRedirect();
        $this->actingAs($this->member())->get('/admin/exam-simulator/pmp/questions')->assertForbidden();
        $this->put('/admin/exam-simulator/pmp/settings', $this->settings())->assertForbidden();
        $this->post('/admin/exam-simulator/pmp/questions', $this->question())->assertForbidden();
        $this->actingAs($this->admin())->get('/admin/exam-simulator/pmp/questions')->assertOk();
    }

    public function test_admin_settings_drive_new_exam_length_and_deadline(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->put('/admin/exam-simulator/pmp/settings', $this->settings())->assertRedirect();
        $this->assertDatabaseHas('pmp_exam_settings', ['id' => 1, 'full_question_count' => 3, 'full_duration_minutes' => 24]);
        for ($i = 0; $i < 4; $i++) {
            $this->post('/admin/exam-simulator/pmp/questions', $this->question('case-'.$i))->assertRedirect();
        }
        $member = $this->member();
        $url = $this->actingAs($member)->postJson('/exams/pmp/start')->assertOk()->json('takeUrl');
        $id = (int) basename($url);
        $record = DB::table('pmp_exam_attempts')->find($id);
        $this->assertSame(3, (int) $record->total_questions);
        $this->assertSame('full', $record->mode);
        $this->assertSame(24, (int) round(\Carbon\Carbon::parse($record->started_at)->diffInMinutes($record->expires_at, true)));

        $this->actingAs($admin)->put('/admin/exam-simulator/pmp/settings', $this->settings(['full_duration_minutes' => 45]))->assertRedirect();
        $this->assertSame(24, (int) round(\Carbon\Carbon::parse($record->started_at)->diffInMinutes($record->expires_at, true)));
        $this->assertSame(65, json_decode($record->rules_snapshot, true)['target_below']);
    }

    public function test_csv_import_validates_every_row_and_does_not_overwrite_existing_codes(): void
    {
        $this->actingAs($this->admin());
        $heading = 'code,domain,difficulty,question,option_a,option_b,option_c,option_d,correct,explanation,other_options,takeaway,concepts,references,active';
        $valid = $heading."\nimport-one,People,Easy,Question one?,A,B,C,D,B,Correct because B,,,,,yes\n";
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => UploadedFile::fake()->createWithContent('questions.csv', $valid),
        ])->assertRedirect();
        $this->assertDatabaseHas('pmp_exam_questions', ['code' => 'import-one', 'correct_option' => 'B']);

        $invalid = $heading."\nimport-two,People,Easy,Question two?,A,B,C,D,C,Reason,,,,,yes\nimport-three,People,Easy,Question three?,A,B,C,D,Z,Reason,,,,,yes\n";
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => UploadedFile::fake()->createWithContent('questions.csv', $invalid),
        ])->assertSessionHasErrors('file');
        $this->assertDatabaseMissing('pmp_exam_questions', ['code' => 'import-two']);

        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => UploadedFile::fake()->createWithContent('questions.csv', $valid),
        ])->assertSessionHasErrors('file');
        $this->assertSame(1, DB::table('pmp_exam_questions')->count());
    }

    public function test_excel_template_download_and_import_are_supported(): void
    {
        $this->actingAs($this->admin());
        $this->get('/admin/exam-simulator/pmp/questions/template')
            ->assertOk()
            ->assertDownload('pm-circle-pmp-question-template.xlsx');

        $template = resource_path('templates/pmp-question-import.xlsx');
        $this->assertFileExists($template);
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => new UploadedFile($template, 'pm-circle-pmp-question-template.xlsx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
        ])->assertRedirect();
        $this->assertDatabaseHas('pmp_exam_questions', [
            'code' => 'pmp-example-001', 'correct_option' => 'B', 'is_active' => false,
        ]);
    }

    public function test_word_question_import_is_rejected(): void
    {
        $this->actingAs($this->admin());
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => UploadedFile::fake()->createWithContent('questions.docx', 'Not an Excel workbook'),
        ])->assertSessionHasErrors('file');
    }

    public function test_attempted_question_answer_key_cannot_be_changed_but_can_be_deactivated(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->post('/admin/exam-simulator/pmp/questions', $this->question())->assertRedirect();
        $id = (int) DB::table('pmp_exam_questions')->value('id');
        $member = $this->member();
        $this->actingAs($member)->postJson('/exams/pmp/start')->assertOk();
        $changed = $this->question();
        $changed['correct_option'] = 'C';
        $this->actingAs($admin)->put("/admin/exam-simulator/pmp/questions/{$id}", $changed)->assertSessionHasErrors('question');
        $this->patch("/admin/exam-simulator/pmp/questions/{$id}/status", ['is_active' => false])->assertRedirect();
        $this->assertDatabaseHas('pmp_exam_questions', ['id' => $id, 'correct_option' => 'B', 'is_active' => false]);
    }

    public function test_invalid_threshold_order_is_rejected(): void
    {
        $this->actingAs($this->admin())->put('/admin/exam-simulator/pmp/settings', $this->settings([
            'needs_improvement_below' => 80, 'target_below' => 70,
        ]))->assertSessionHasErrors('target_below');
    }
}
