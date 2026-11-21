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

    public function test_admin_can_search_active_questions_and_select_the_public_sample(): void
    {
        $admin = $this->admin();
        $member = $this->member();
        $url = '/admin/exam-simulator/pmp/questions/sample-options';

        $this->getJson($url)->assertStatus(401);
        $this->actingAs($member)->getJson($url)->assertForbidden();

        $this->actingAs($admin);
        $this->post('/admin/exam-simulator/pmp/questions', $this->question('pmp-sample-active'))
            ->assertSessionHasNoErrors()->assertRedirect();
        $this->post('/admin/exam-simulator/pmp/questions', $this->question('pmp-sample-inactive'))
            ->assertSessionHasNoErrors()->assertRedirect();
        $activeId = (int) DB::table('pmp_exam_questions')->where('code', 'pmp-sample-active')->value('id');
        $inactiveId = (int) DB::table('pmp_exam_questions')->where('code', 'pmp-sample-inactive')->value('id');
        $this->patch("/admin/exam-simulator/pmp/questions/{$inactiveId}/status", ['is_active' => false])
            ->assertSessionHasNoErrors()->assertRedirect();

        $results = $this->getJson($url.'?search=sample')->assertOk()->json('questions');
        $this->assertCount(1, $results);
        $this->assertSame($activeId, $results[0]['id']);
        $this->assertSame('pmp-sample-active', $results[0]['code']);
        $this->assertSame($activeId, $this->getJson($url.'?search='.$activeId)->assertOk()->json('questions.0.id'));
        $this->assertArrayNotHasKey('correct_option', $results[0]);
        $this->getJson($url.'?search='.str_repeat('x', 101))->assertUnprocessable();

        $this->put('/admin/exam-simulator/pmp/settings', $this->settings(['sample_question_id' => $inactiveId]))
            ->assertSessionHasErrors('sample_question_id');
        $this->put('/admin/exam-simulator/pmp/settings', $this->settings(['sample_question_id' => $activeId]))
            ->assertSessionHasNoErrors()->assertRedirect();
        $this->assertDatabaseHas('pmp_exam_settings', ['id' => 1, 'sample_question_id' => $activeId]);

        $this->get('/admin/exam-simulator/pmp/questions')->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('admin/PmpQuestionBank')
            ->where('selectedSampleQuestion.id', $activeId)
            ->etc());
        $this->app['auth']->guard()->logout();
        $this->get('/exam-simulator/pmp')->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('exam/Public')
            ->where('sampleQuestion.id', $activeId)
            ->where('sampleQuestion.correct', 'B')
            ->etc());

        $this->actingAs($admin)->put('/admin/exam-simulator/pmp/settings', $this->settings(['sample_question_id' => null]))
            ->assertSessionHasNoErrors()->assertRedirect();
        $this->assertDatabaseHas('pmp_exam_settings', ['id' => 1, 'sample_question_id' => null]);
    }

    public function test_admin_can_save_ordered_public_sample_questions_and_guests_receive_the_same_order(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);
        foreach (['sample-one', 'sample-two', 'sample-three'] as $code) {
            $this->post('/admin/exam-simulator/pmp/questions', $this->question($code))
                ->assertSessionHasNoErrors();
        }
        $ids = DB::table('pmp_exam_questions')->whereIn('code', ['sample-one', 'sample-two', 'sample-three'])
            ->pluck('id', 'code');
        $this->assertCount(3, $this->getJson('/admin/exam-simulator/pmp/questions/sample-options?domain=Process')->assertOk()->json('questions'));
        $this->assertCount(0, $this->getJson('/admin/exam-simulator/pmp/questions/sample-options?domain=People')->assertOk()->json('questions'));
        $first = (int) $ids['sample-one'];
        $second = (int) $ids['sample-two'];
        $third = (int) $ids['sample-three'];

        $this->put('/admin/exam-simulator/pmp/settings', $this->settings([
            'sample_question_ids' => [$second, $first], 'sample_question_id' => $second,
        ]))->assertSessionHasNoErrors();
        $record = DB::table('pmp_exam_settings')->where('id', 1)->first();
        $this->assertSame([$second, $first], json_decode($record->sample_question_ids, true));
        $this->assertSame($second, (int) $record->sample_question_id);

        $this->get('/admin/exam-simulator/pmp/questions')->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('admin/PmpQuestionBank')
            ->where('selectedSampleQuestions.0.id', $second)
            ->where('selectedSampleQuestions.1.id', $first)
            ->etc());

        $this->app['auth']->guard()->logout();
        $this->get('/exam-simulator/pmp')->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('exam/Public')
            ->has('sampleQuestions', 2)
            ->where('sampleQuestions.0.id', $second)
            ->where('sampleQuestions.1.id', $first)
            ->where('sampleQuestion.id', $second)
            ->etc());

        // Deactivating a selected question must not expose it to guests.
        $this->actingAs($admin)->patch("/admin/exam-simulator/pmp/questions/{$second}/status", ['is_active' => false])
            ->assertSessionHasNoErrors();
        $this->app['auth']->guard()->logout();
        $this->get('/exam-simulator/pmp')->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->has('sampleQuestions', 1)
            ->where('sampleQuestions.0.id', $first)
            ->etc());

        $this->actingAs($admin)->put('/admin/exam-simulator/pmp/settings', $this->settings([
            'sample_question_ids' => [$first, $second], 'sample_question_id' => $first,
        ]))->assertSessionHasErrors('sample_question_ids');
        $this->put('/admin/exam-simulator/pmp/settings', $this->settings([
            'sample_question_ids' => [$first, $first], 'sample_question_id' => $first,
        ]))->assertSessionHasErrors();
        $this->put('/admin/exam-simulator/pmp/settings', $this->settings([
            'sample_question_ids' => [$first, $third], 'sample_question_id' => $first,
        ]))->assertSessionHasNoErrors();
        $this->put('/admin/exam-simulator/pmp/settings', $this->settings([
            'sample_question_ids' => [], 'sample_question_id' => null,
        ]))->assertSessionHasNoErrors();
        $this->assertSame([], json_decode(DB::table('pmp_exam_settings')->value('sample_question_ids'), true));
        $this->app['auth']->guard()->logout();
        $this->get('/exam-simulator/pmp')->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->has('sampleQuestions', 0)
            ->where('sampleQuestion', null)
            ->etc());
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
            ->assertDownload('PM_Circle_PMP_Question_Bank.xlsx');

        $template = resource_path('templates/pmp-question-import.xlsx');
        $this->assertFileExists($template);
        $method = new \ReflectionMethod(\App\Services\Exam\PmpQuestionImporter::class, 'xlsx');
        $rows = $method->invoke(app(\App\Services\Exam\PmpQuestionImporter::class), $template);
        $this->assertCount(1, $rows, 'The downloadable template must have no sample questions.');
        $this->assertSame(\App\Services\Exam\PmpQuestionContent::WORKBOOK_HEADERS, $rows[0]);
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => new UploadedFile($template, 'pm-circle-pmp-question-template.xlsx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
        ])->assertSessionHasErrors('file');
        $this->assertSame(0, DB::table('pmp_exam_questions')->count());

        // Keep source test data separately; the admin download must remain blank.
        $original = base_path('tests/Fixtures/pmp-question-bank-original.xlsx');
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => new UploadedFile($original, 'pm-circle-pmp-questions.xlsx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
        ])->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame(100, DB::table('pmp_exam_questions')->count());
        $this->assertDatabaseHas('pmp_exam_questions', [
            'code' => 'PMC-PMP-0001', 'correct_option' => 'C',
            'review_status' => 'Editorial draft', 'is_active' => false,
        ]);
    }

    public function test_instant_activation_approves_and_publishes_every_imported_question(): void
    {
        $this->actingAs($this->admin());
        $original = base_path('tests/Fixtures/pmp-question-bank-original.xlsx');
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => new UploadedFile($original, 'pmp-original.xlsx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
            'activate_all' => '1',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertSame(100, DB::table('pmp_exam_questions')->count());
        $this->assertSame(100, DB::table('pmp_exam_questions')->where('is_active', true)->count());
        $this->assertSame(100, DB::table('pmp_exam_questions')->where('review_status', 'Approved')->count());
        $source = DB::table('pmp_exam_questions')->where('code', 'PMC-PMP-0001')->first();
        $this->assertSame('C', $source->correct_option);
        $this->assertSame(json_decode($source->options, true)['C'], $source->correct_answer_text);
        $this->assertNotEmpty($source->eco_task_id);
        $this->assertNotEmpty($source->eco_reference);
        $this->assertCount(4, json_decode($source->option_rationales, true, 512, JSON_THROW_ON_ERROR));

        // Retrying must never overwrite any already published question or attempt.
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => new UploadedFile($original, 'pmp-original.xlsx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
            'activate_all' => true,
        ])->assertSessionHasErrors('file');
        $this->assertSame(100, DB::table('pmp_exam_questions')->count());
    }

    public function test_instant_activation_is_not_allowed_without_admin_access(): void
    {
        $content = "code,domain,question,option_a,option_b,option_c,option_d,correct\n".
            "pmp-unauthorized,People,Question?,A,B,C,D,B\n";
        $this->actingAs($this->member())->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => UploadedFile::fake()->createWithContent('question.csv', $content),
            'activate_all' => true,
        ])->assertForbidden();
        $this->assertSame(0, DB::table('pmp_exam_questions')->count());
    }

    public function test_instant_activation_does_not_allow_invalid_answer_rows(): void
    {
        $this->actingAs($this->admin());
        $headers = \App\Services\Exam\PmpQuestionContent::WORKBOOK_HEADERS;
        $row = [
            'pmp-activate-bad', 'People', 'I-01', 'Agree outcome', 'Moderate', 'Hybrid',
            'Question?', 'One', 'Two', 'Three', 'Four', 'B', 'WRONG TEXT',
            'Explanation', 'A rationale', 'B rationale', 'C rationale', 'D rationale',
            'Takeaway', 'Concept', 'Stakeholders', 'Stakeholder Management', 'Healthcare',
            'Single Select', 'PMBOK Guide', '2.1', 'Stakeholders', 30,
            'July 2026 ECO', 'Editorial draft',
        ];
        $handle = fopen('php://temp', 'w+');
        fputcsv($handle, $headers, ',', '"', '');
        fputcsv($handle, $row, ',', '"', '');
        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => UploadedFile::fake()->createWithContent('invalid.csv', $content),
            'activate_all' => true,
        ])->assertSessionHasErrors('file');
        $this->assertSame(0, DB::table('pmp_exam_questions')->count());
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

    public function test_official_thirty_column_excel_template_imports_complete_editorial_metadata(): void
    {
        $this->actingAs($this->admin());
        $template = base_path('tests/Fixtures/pmp-question-bank-original.xlsx');
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => new UploadedFile($template, 'pm-circle-pmp-question-template.xlsx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
        ])->assertRedirect();

        $question = DB::table('pmp_exam_questions')->where('code', 'PMC-PMP-0001')->first();
        $this->assertNotNull($question);
        $this->assertSame('Editorial draft', $question->review_status);
        $this->assertFalse((bool) $question->is_active);
        $this->assertSame('Single Select', $question->question_type);
        $this->assertSame('Hybrid', $question->approach);
        $this->assertNotEmpty($question->eco_task_id);
        $this->assertNotEmpty($question->reference_publication);
        $this->assertNotEmpty($question->pmbok_performance_domain);
        $this->assertSame('C', $question->correct_option);
        $this->assertSame(json_decode($question->options, true)['C'], $question->correct_answer_text);
        $this->assertSame(4, count(json_decode($question->option_rationales, true, 512, JSON_THROW_ON_ERROR)));
        $this->assertStringContainsString('A:', $question->other_options);
        $this->patch("/admin/exam-simulator/pmp/questions/{$question->id}/status", [
            'is_active' => true,
        ])->assertSessionHasErrors('review_status');
        $this->assertDatabaseHas('pmp_exam_questions', ['id' => $question->id, 'is_active' => false]);
        $this->assertSame(100, DB::table('pmp_exam_questions')->count());
    }

    public function test_official_workbook_rejects_mismatched_answer_without_partial_insert(): void
    {
        $this->actingAs($this->admin());
        $headers = \App\Services\Exam\PmpQuestionContent::WORKBOOK_HEADERS;
        $row = [
            'pmp-import-01', 'People', 'I-01', 'Agree outcome', 'Moderate', 'Hybrid',
            'What should the PM do first?', 'Option one', 'Option two', 'Option three', 'Option four',
            'B', 'Option two', 'Correct rationale', 'Incorrect A', 'Correct B', 'Incorrect C', 'Incorrect D',
            'Takeaway', 'Concept 1; Concept 2', 'Stakeholders', 'Stakeholder Management',
            'Healthcare', 'Single Select', 'PMBOK Guide', '2.1', 'Stakeholders', 30,
            'July 2026 ECO', 'Editorial draft',
        ];
        $makeCsv = static function (array $rows): string {
            $handle = fopen('php://temp', 'w+');
            foreach ($rows as $values) {
                fputcsv($handle, $values, ',', '"', '');
            }
            rewind($handle);
            $csv = stream_get_contents($handle);
            fclose($handle);
            return $csv;
        };
        $wrong = $row;
        $wrong[0] = 'pmp-import-02';
        $wrong[12] = 'This does not match Option B';
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => UploadedFile::fake()->createWithContent('pmp-official.csv', $makeCsv([$headers, $row, $wrong])),
        ])->assertSessionHasErrors('file');
        $this->assertDatabaseMissing('pmp_exam_questions', ['code' => 'pmp-import-01']);

        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => UploadedFile::fake()->createWithContent('pmp-official.csv', $makeCsv([$headers, $row])),
        ])->assertRedirect();
        $question = DB::table('pmp_exam_questions')->where('code', 'pmp-import-01')->first();
        $this->assertNotNull($question);
        $this->assertSame('I-01', $question->eco_task_id);
        $this->assertSame('Option two', $question->correct_answer_text);
        $this->assertSame(30, (int) $question->reference_pdf_page);
        $this->assertSame('Editorial draft', $question->review_status);
        $this->assertSame('A: Incorrect A', explode("\n", $question->other_options)[0]);
        $this->assertFalse((bool) $question->is_active);
    }

    public function test_exact_supplied_excel_preserves_each_of_30_columns_for_all_100_rows(): void
    {
        $this->actingAs($this->admin());
        $template = base_path('tests/Fixtures/pmp-question-bank-original.xlsx');
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => new UploadedFile($template, 'PM_Circle_PMP_Question_Bank.xlsx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true),
        ])->assertSessionHasNoErrors()->assertRedirect();

        // The supplied Question Bank has exactly 30 fields; compare each stored
        // field for EVERY row instead of just checking the import count.
        $method = new \ReflectionMethod(\App\Services\Exam\PmpQuestionImporter::class, 'xlsx');
        $rows = $method->invoke(app(\App\Services\Exam\PmpQuestionImporter::class), $template);
        $this->assertSame(\App\Services\Exam\PmpQuestionContent::WORKBOOK_HEADERS, $rows[0]);
        $this->assertCount(101, $rows);
        $questions = DB::table('pmp_exam_questions')->get()->keyBy('code');
        $this->assertCount(100, $questions);

        foreach (array_slice($rows, 1) as $index => $source) {
            $record = $questions->get($source[0]);
            $this->assertNotNull($record, 'Missing Question ID at row '.($index + 2));
            $options = json_decode($record->options, true, 512, JSON_THROW_ON_ERROR);
            $rationales = json_decode($record->option_rationales, true, 512, JSON_THROW_ON_ERROR);
            $stored = [
                $record->code, $record->domain, $record->eco_task_id, $record->eco_task_focus,
                $record->difficulty, $record->approach, $record->prompt,
                $options['A'], $options['B'], $options['C'], $options['D'],
                $record->correct_option, $record->correct_answer_text, $record->explanation,
                $rationales['A'], $rationales['B'], $rationales['C'], $rationales['D'],
                $record->takeaway, $record->concepts, $record->pmbok_performance_domain,
                $record->legacy_knowledge_area, $record->industry, $record->question_type,
                $record->reference_publication, $record->reference_section,
                $record->reference_heading, (string) $record->reference_pdf_page,
                $record->eco_reference, $record->review_status,
            ];
            $this->assertCount(30, $stored);
            foreach ($stored as $col => $value) {
                $this->assertSame((string) ($source[$col] ?? ''), (string) ($value ?? ''),
                    sprintf('Question Bank %s row %d col %d (%s)',
                        $source[0], $index + 2, $col + 1,
                        \App\Services\Exam\PmpQuestionContent::WORKBOOK_HEADERS[$col]));
            }
            $this->assertFalse((bool) $record->is_active);
        }
    }

    public function test_manual_question_creation_stores_correct_answer_as_separate_source_field(): void
    {
        $this->actingAs($this->admin());
        $payload = $this->question('manual-source-test');
        $payload['correct_answer_text'] = 'Analyze impact';
        $this->post('/admin/exam-simulator/pmp/questions', $payload)
            ->assertSessionHasNoErrors()->assertRedirect();
        $this->assertDatabaseHas('pmp_exam_questions', [
            'code' => 'manual-source-test', 'correct_option' => 'B',
            'correct_answer_text' => 'Analyze impact',
        ]);
        $invalid = $this->question('manual-mismatch-test');
        $invalid['correct_answer_text'] = 'Ignore';
        $this->post('/admin/exam-simulator/pmp/questions', $invalid)
            ->assertSessionHasErrors('correct_answer_text');
        $this->assertDatabaseMissing('pmp_exam_questions', ['code' => 'manual-mismatch-test']);
    }

    public function test_30_column_import_rejects_extra_headers_without_silent_data_loss(): void
    {
        $this->actingAs($this->admin());
        $headers = [...\App\Services\Exam\PmpQuestionContent::WORKBOOK_HEADERS, 'Unknown Column'];
        $content = implode(',', $headers)."\n".implode(',', array_fill(0, 31, 'test'))."\n";
        $this->post('/admin/exam-simulator/pmp/questions/import', [
            'file' => UploadedFile::fake()->createWithContent('altered.csv', $content),
        ])->assertSessionHasErrors('file');
    }

}
