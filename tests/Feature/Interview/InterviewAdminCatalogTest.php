<?php

namespace Tests\Feature\Interview;

use App\Domain\Interview\QuestionCatalog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

final class InterviewAdminCatalogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true, 'status' => 'active', 'onboarding_step' => 3, 'email_verified_at' => now()]);
    }

    private function member(): User
    {
        $user = User::factory()->create(['is_admin' => false, 'status' => 'active', 'onboarding_step' => 3, 'email_verified_at' => now()]);
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        DB::table('temporary_memberships')->insert(['user_id' => $user->id, 'plan_code' => 'plus', 'created_at' => now(), 'updated_at' => now()]);
        return $user;
    }

    private function startPayload(array $changes = []): array
    {
        return array_merge([
            'industry' => 'software', 'role' => 'Project Manager', 'experience' => 'mid',
            'types' => ['General', 'Behavioral'], 'count' => 5, 'mode' => 'type',
        ], $changes);
    }

    public function test_existing_questions_and_member_options_are_migrated_into_editable_catalog(): void
    {
        $this->assertSame(40, DB::table('interview_questions')->count());
        $this->assertDatabaseHas('interview_question_sets', ['title' => 'Core PM interview questions', 'is_active' => true]);
        $this->assertDatabaseHas('master_data_options', ['category' => 'interview_mode', 'value' => 'both', 'is_active' => true]);

        $questions = app(QuestionCatalog::class)->select('software', 'Project Manager', 'mid', ['General', 'Behavioral'], 5);
        $this->assertCount(5, $questions);
        $this->assertCount(5, array_unique(array_column($questions, 'id')));
        $this->assertStringContainsString('Project Manager', $questions[0]['text']);
    }

    public function test_admin_routes_are_protected_from_guests_and_members(): void
    {
        $this->get('/admin/interview-preparation')->assertRedirect();
        $this->actingAs($this->member())->get('/admin/interview-preparation')->assertForbidden();
        $this->post('/admin/interview-preparation/questions', [
            'set_id' => 1, 'type' => 'General', 'text' => 'How do you lead a project kickoff meeting?',
            'is_active' => true, 'sort_order' => 1,
        ])->assertForbidden();
        $this->actingAs($this->admin())->get('/admin/interview-preparation')->assertOk();
    }

    public function test_admin_can_add_choices_sets_and_questions_without_overwriting_existing_sessions(): void
    {
        $member = $this->member();
        $this->actingAs($member)->post('/interview-preparation/start', $this->startPayload())->assertRedirect();
        $session = DB::table('interview_sessions')->where('user_id', $member->id)->first();
        $original = $session->questions;
        $this->assertNotNull($session);

        $this->actingAs($this->admin());
        $this->post('/admin/interview-preparation/options', [
            'group' => 'industry', 'key' => 'energy', 'label' => 'Energy & Utilities',
            'is_active' => true, 'sort_order' => 9,
        ])->assertRedirect();
        $this->post('/admin/interview-preparation/sets', [
            'title' => 'Energy project interviews', 'description' => 'Field-specific role questions.',
            'industry' => 'energy', 'role' => null, 'experience' => null,
            'is_active' => true, 'sort_order' => 2,
        ])->assertRedirect();
        $setId = DB::table('interview_question_sets')->where('title', 'Energy project interviews')->value('id');
        foreach (range(1, 5) as $number) {
            $this->post('/admin/interview-preparation/questions', [
                'set_id' => $setId, 'type' => 'Technical',
                'text' => 'How would you manage energy project risk '.$number.' with your team?',
                'is_active' => true, 'sort_order' => $number,
            ])->assertRedirect();
        }
        $this->actingAs($member)->post('/interview-preparation/start', $this->startPayload([
            'industry' => 'energy', 'types' => ['Technical'], 'question_set' => $setId,
        ]))->assertRedirect();
        $fresh = DB::table('interview_sessions')->where('user_id', $member->id)->orderByDesc('id')->first();
        $this->assertNotEquals($session->id, $fresh->id);
        $questions = json_decode($fresh->questions, true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(5, $questions);
        $this->assertStringContainsString('energy project risk', $questions[0]['text']);
        $this->assertSame($original, DB::table('interview_sessions')->where('id', $session->id)->value('questions'));
    }

    public function test_unavailable_question_selection_cannot_create_empty_session(): void
    {
        $setId = DB::table('interview_question_sets')->insertGetId([
            'title' => 'Unpublished draft', 'is_active' => false, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $member = $this->member();
        $this->actingAs($member)->post('/interview-preparation/start', $this->startPayload([
            'question_set' => $setId,
        ]))->assertSessionHasErrors(['question_set']);
        $this->assertSame(0, DB::table('interview_sessions')->where('user_id', $member->id)->count());
    }

    public function test_timing_changes_only_apply_to_new_sessions_and_admin_cannot_disable_last_option(): void
    {
        $member = $this->member();
        $this->actingAs($member)->post('/interview-preparation/start', $this->startPayload())->assertRedirect();
        $sessionId = DB::table('interview_sessions')->where('user_id', $member->id)->value('id');
        $this->assertDatabaseHas('interview_sessions', ['id' => $sessionId, 'minutes_per_question' => 2]);

        $this->actingAs($this->admin())->put('/admin/interview-preparation/settings', ['minutes_per_question' => 3])->assertRedirect();
        $option = DB::table('master_data_options')->where('category', 'interview_mode')->where('value', 'type')->first();
        $this->patch('/admin/interview-preparation/options/'.$option->id, [
            'label' => 'Keyboard answer', 'is_active' => false, 'sort_order' => 0,
        ])->assertRedirect();
        $this->assertDatabaseHas('master_data_options', ['id' => $option->id, 'label' => 'Keyboard answer', 'is_active' => false]);

        $this->actingAs($member)->post('/interview-preparation/start', $this->startPayload(['mode' => 'both']))->assertRedirect();
        $this->assertSame(2, (int) DB::table('interview_sessions')->where('id', $sessionId)->value('minutes_per_question'));
        $this->assertSame(3, (int) DB::table('interview_sessions')->where('user_id', $member->id)->orderByDesc('id')->value('minutes_per_question'));
    }
    public function test_interview_values_are_shared_with_master_data(): void
    {
        $this->actingAs($this->admin())->post('/admin/master-data', [
            'category' => 'interview_industry', 'value' => 'energy', 'label' => 'Energy',
        ])->assertRedirect();
        $this->assertArrayHasKey('energy', app(QuestionCatalog::class)->choices()['industry']);
        $this->assertDatabaseHas('master_data_options', ['category' => 'interview_industry', 'value' => 'energy']);
    }

    public function test_csv_import_to_selected_set_and_atomic_rejection_of_invalid_rows(): void
    {
        $this->actingAs($this->admin());
        $this->post('/admin/interview-preparation/sets', [
            'title' => 'Interview CSV set', 'description' => null, 'industry' => null,
            'role' => null, 'experience' => null, 'is_active' => true, 'sort_order' => 10,
        ])->assertRedirect();
        $setId = (int) DB::table('interview_question_sets')->where('title', 'Interview CSV set')->value('id');
        $header = "Question Type,Interview Question,Active,Display Order\n";
        $good = $header."General,Describe your approach to stakeholder mapping in a project.,Yes,10\n"
            ."Behavioral,Tell me how you resolved a project conflict.,No,20\n";
        $this->post('/admin/interview-preparation/questions/import', [
            'set_id' => $setId, 'file' => UploadedFile::fake()->createWithContent('questions.csv', $good),
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame(2, DB::table('interview_questions')->where('set_id', $setId)->count());
        $this->assertSame(1, DB::table('interview_questions')->where('set_id', $setId)->where('is_active', true)->count());
        $bad = $header."General,Explain how you deal with project risk in practice.,Yes,10\n"
            ."NOT_A_TYPE,This row has an invalid question type.,Yes,20\n";
        $this->post('/admin/interview-preparation/questions/import', [
            'set_id' => $setId, 'file' => UploadedFile::fake()->createWithContent('invalid.csv', $bad),
        ])->assertSessionHasErrors('file');
        $this->assertSame(2, DB::table('interview_questions')->where('set_id', $setId)->count());
        $this->get('/admin/interview-preparation/questions/template')->assertOk();
    }

    public function test_delete_actions_protect_references_and_preserve_session_snapshots(): void
    {
        $member = $this->member();
        $this->actingAs($member)->post('/interview-preparation/start', $this->startPayload())->assertRedirect();
        $session = DB::table('interview_sessions')->where('user_id', $member->id)->first();
        $this->actingAs($this->admin());
        $setId = (int) DB::table('interview_question_sets')->where('title', 'Core PM interview questions')->value('id');
        $this->delete('/admin/interview-preparation/sets/'.$setId)->assertSessionHasErrors('delete');
        $typeId = (int) DB::table('master_data_options')->where('category', 'interview_type')->where('value', 'General')->value('id');
        $this->delete('/admin/interview-preparation/options/'.$typeId)->assertSessionHasErrors('delete');
        $questionId = (int) DB::table('interview_questions')->where('set_id', $setId)->value('id');
        $this->delete('/admin/interview-preparation/questions/'.$questionId)->assertRedirect()->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('interview_questions', ['id' => $questionId]);
        $this->assertSame($session->questions, DB::table('interview_sessions')->where('id', $session->id)->value('questions'));
        $this->post('/admin/interview-preparation/sets', [
            'title' => 'Empty deletable set', 'description' => null, 'industry' => null,
            'role' => null, 'experience' => null, 'is_active' => false, 'sort_order' => 50,
        ])->assertRedirect();
        $emptyId = (int) DB::table('interview_question_sets')->where('title', 'Empty deletable set')->value('id');
        $this->delete('/admin/interview-preparation/sets/'.$emptyId)->assertRedirect()->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('interview_question_sets', ['id' => $emptyId]);
    }

    public function test_delete_and_import_routes_require_admin_permission(): void
    {
        $this->actingAs($this->member());
        $this->delete('/admin/interview-preparation/questions/1')->assertForbidden();
        $this->delete('/admin/interview-preparation/sets/1')->assertForbidden();
        $this->delete('/admin/interview-preparation/options/1')->assertForbidden();
        $this->post('/admin/interview-preparation/questions/import', [])->assertForbidden();
        $this->get('/admin/interview-preparation/questions/template')->assertForbidden();
    }

    public function test_dynamic_settings_apply_to_new_sessions_and_guidance_is_not_exposed_before_submission(): void
    {
        $admin = $this->admin();
        $member = $this->member();
        $this->actingAs($admin)->put('/admin/interview-preparation/settings', [
            'minutes_per_question' => 4,
            'allow_new_sessions' => true,
            'allow_job_description' => false,
            'hero_title' => 'Prepare for a delivery interview',
            'mix_labels' => ['recommended' => 'Balanced', 'common' => 'Common', 'focus' => 'Specialist'],
            'focus_percent' => 50, 'focus_common_percent' => 30,
            'role_profiles' => [['role' => 'Project Manager', 'profession' => 'Delivery Leadership', 'focus' => ['capacity']]],
        ])->assertRedirect()->assertSessionHasNoErrors();
        $set = DB::table('interview_question_sets')->insertGetId(['title' => 'Custom guidance', 'is_active' => true, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()]);
        $this->post('/admin/interview-preparation/questions', [
            'set_id' => $set, 'type' => 'General', 'text' => 'How do you plan resource capacity for a project?',
            'topic' => 'Capacity planning', 'difficulty' => 'Hard', 'answer_guidance' => 'Discuss resource availability and capacity.',
            'is_active' => true, 'sort_order' => 1,
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->post('/admin/interview-preparation/options', ['group' => 'count', 'key' => '1', 'label' => 'One question', 'is_active' => true, 'sort_order' => 1])->assertRedirect()->assertSessionHasNoErrors();
        for ($i = 2; $i <= 5; $i++) {
            $this->post('/admin/interview-preparation/questions', [
                'set_id' => $set, 'type' => 'General', 'text' => 'How do you manage resource capacity in case '.$i.'?',
                'topic' => 'Capacity planning', 'difficulty' => 'Hard', 'answer_guidance' => 'Discuss resource availability and capacity.',
                'is_active' => true, 'sort_order' => $i,
            ])->assertRedirect()->assertSessionHasNoErrors();
        }
        $payload = $this->startPayload(['count' => 5, 'question_set' => $set, 'types' => ['General'], 'mix' => 'focus', 'focus' => ['capacity']]);
        $this->actingAs($member)->postJson('/interview-preparation/preview', array_replace($payload, ['count' => 1]))->assertUnprocessable()->assertJsonValidationErrors('count');
        $this->actingAs($member)->postJson('/interview-preparation/preview', array_replace($payload, ['focus' => ['unconfigured']]))->assertUnprocessable()->assertJsonValidationErrors('focus');
        $this->postJson('/interview-preparation/preview', $payload + ['jd' => 'Some job description'])->assertUnprocessable()->assertJsonValidationErrors('jd');
        $preview = $this->postJson('/interview-preparation/preview', $payload)->assertOk()->assertJsonPath('questions.0.topic', 'Capacity planning')->assertJsonPath('questions.0.difficulty', 'Hard')->assertJsonMissingPath('questions.0.answer_guidance')->json();
        $this->post('/interview-preparation/start', $payload + ['draft' => $preview['draft']])->assertRedirect()->assertSessionHasNoErrors();
        $session = DB::table('interview_sessions')->where('user_id', $member->id)->first();
        $this->assertSame('Delivery Leadership', $session->profession);
        $this->assertSame(4, (int) $session->minutes_per_question);
        $this->assertSame('Discuss resource availability and capacity.', json_decode($session->questions, true)[0]['answer_guidance']);
        $this->actingAs($admin)->put('/admin/interview-preparation/settings', ['minutes_per_question' => 8, 'allow_new_sessions' => false])->assertRedirect();
        $this->actingAs($member)->postJson('/interview-preparation/preview', $payload)->assertUnprocessable()->assertJsonValidationErrors('count');
        $this->get('/interview-preparation/sessions/'.$session->id)->assertOk();
        $this->postJson('/interview-preparation/sessions/'.$session->id.'/answer', ['position' => 0, 'mode' => 'type', 'answer' => 'I would review capacity.'])->assertOk()->assertJsonPath('answer.evaluation.suggested_answer', 'Discuss resource availability and capacity.');
        $this->assertDatabaseHas('interview_sessions', ['id' => $session->id, 'minutes_per_question' => 4]);
    }

    public function test_prompt_activation_preserves_routing_and_requires_permission_and_current_version(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->getJson('/admin/ai/prompts/interview_answer_review')->assertForbidden();
        DB::table('ai_admin_permissions')->insert(['user_id' => $admin->id, 'permission' => 'ai.manage_prompts', 'created_at' => now()]);
        $current = $this->getJson('/admin/ai/prompts/interview_answer_review')->assertOk()->json();
        $before = DB::table('ai_features')->where('code', 'interview_answer_review')->first();
        $payload = ['feature' => 'interview_answer_review', 'template' => 'Review the exact saved question and give educational coaching only.', 'evaluation_reference' => 'test-reference', 'reason' => 'Update interview coaching instructions.', 'activate' => true, 'expected_version' => $current['version']];
        $next = $this->postJson('/admin/ai/prompts', $payload)->assertCreated()->json('version');
        $this->assertDatabaseHas('ai_features', ['code' => 'interview_answer_review', 'prompt_version' => $next, 'model' => $before->model, 'credit_tariff' => $before->credit_tariff, 'enabled' => $before->enabled]);
        $this->postJson('/admin/ai/prompts', $payload)->assertConflict();
    }
}
