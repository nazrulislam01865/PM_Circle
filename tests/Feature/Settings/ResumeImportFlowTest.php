<?php

namespace Tests\Feature\Settings;

use App\Jobs\AnalyzeProfileResume;
use App\Models\ProfileImportSession;
use App\Models\ProfileResume;
use App\Models\User;
use App\Services\Resume\ApplyProfileImport;
use App\Services\Resume\ProfileImportPresenter;
use App\Services\Resume\ResumeImportAnalyzer;
use App\Services\Resume\ResumeTextExtractor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ResumeImportFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_import_tab_never_displays_fake_extracted_resume(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get(route('profile.edit', ['tab' => 'imports']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('settings/profile')
                ->where('profileData.import.status', 'empty')
                ->where('profileData.import.comparisons', [])
                ->where('profileData.import.history', []));
    }

    public function test_overview_shows_latest_uploaded_resume_from_the_database(): void
    {
        $user = User::factory()->create();
        $older = ProfileResume::create([
            'user_id' => $user->id, 'original_name' => 'older.pdf',
            'storage_path' => 'resumes/'.$user->id.'/older.pdf',
            'mime_type' => 'application/pdf', 'file_size' => 1024,
        ]);
        $latest = ProfileResume::create([
            'user_id' => $user->id, 'original_name' => 'latest.docx',
            'storage_path' => 'resumes/'.$user->id.'/latest.docx',
            'mime_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'file_size' => 2048,
        ]);
        // Timestamps are guarded, so set them explicitly when constructing test fixtures.
        $older->forceFill(['created_at' => now()->subDay(), 'updated_at' => now()->subDay()])->save();
        $latest->forceFill(['created_at' => now(), 'updated_at' => now()])->save();

        $this->actingAs($user)->get(route('profile.edit', ['tab' => 'overview']))
            ->assertOk()->assertInertia(fn ($page) => $page
                ->component('settings/profile')
                ->where('profileData.resume.id', $latest->id)
                ->where('profileData.resume.original_name', 'latest.docx'));
    }

    public function test_overview_uses_newest_resume_id_when_uploads_share_a_creation_timestamp(): void
    {
        $user = User::factory()->create();
        $uploadedAt = now()->startOfSecond();

        foreach (['first.pdf', 'second.pdf'] as $name) {
            $user->resumes()->create([
                'original_name' => $name,
                'storage_path' => 'resumes/'.$user->id.'/'.$name,
                'mime_type' => 'application/pdf',
                'file_size' => 1024,
            ])->forceFill(['created_at' => $uploadedAt, 'updated_at' => $uploadedAt])->save();
        }

        $newest = $user->resumes()->orderByDesc('id')->firstOrFail();

        $this->actingAs($user)->get(route('profile.edit', ['tab' => 'overview']))
            ->assertOk()->assertInertia(fn ($page) => $page
                ->component('settings/profile')
                ->where('profileData.resume.id', $newest->id)
                ->where('profileData.resume.original_name', 'second.pdf'));
    }

    public function test_uploaded_resume_is_saved_privately_and_can_be_seen_on_overview(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Queue::fake();
        $user = User::factory()->create();
        $pdf = \Illuminate\Http\UploadedFile::fake()->createWithContent('my-resume.pdf',
            "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF");

        $this->actingAs($user)->post(route('profile.resume.upload'), ['resume' => $pdf])
            ->assertSessionHasNoErrors()->assertRedirect(route('profile.edit', ['tab' => 'imports']));

        $resume = $user->resumes()->firstOrFail();
        \Illuminate\Support\Facades\Storage::disk('local')->assertExists($resume->storage_path);
        $this->assertSame('my-resume.pdf', $resume->original_name);
        $this->assertSame(1, $user->importSessions()->count());
        $this->actingAs($user)->get(route('profile.edit', ['tab' => 'overview']))
            ->assertOk()->assertInertia(fn ($page) => $page
                ->component('settings/profile')
                ->where('profileData.resume.id', $resume->id));
    }

    public function test_extractor_only_proposes_data_found_in_the_resume(): void
    {
        $result = app(ResumeImportAnalyzer::class)->analyze(<<<'RESUME'
Sara Ahmed
Project Manager | Agile delivery
sara@example.com
+880 1712 345678
Skills
Agile delivery, Stakeholder engagement, Risk management
Work Experience
Project Manager at Northstar Digital
Education
BBA Management
University of Dhaka
Certifications
PMP
RESUME);

        $this->assertSame('Sara Ahmed', $result['fields']['name']);
        $this->assertSame('Project Manager | Agile delivery', $result['fields']['headline']);
        $this->assertContains('Risk management', $result['fields']['skills']);
        $this->assertSame('Northstar Digital', $result['fields']['experiences'][0]['organization']);
        $this->assertSame('University of Dhaka', $result['fields']['educations'][0]['institution']);
        $this->assertSame('PMP', $result['fields']['certifications'][0]['name']);
    }

    public function test_job_stores_extracted_fields_for_owned_resume(): void
    {
        $user = User::factory()->create();
        $resume = ProfileResume::create(['user_id' => $user->id, 'original_name' => 'resume.pdf',
            'storage_path' => 'resumes/'.$user->id.'/resume.pdf', 'mime_type' => 'application/pdf', 'file_size' => 500]);
        $import = ProfileImportSession::create(['user_id' => $user->id, 'profile_resume_id' => $resume->id,
            'source_filename' => 'resume.pdf', 'extracted_data' => ['fields' => []], 'status' => 'processing']);
        $reader = $this->mock(ResumeTextExtractor::class);
        $reader->shouldReceive('extract')->once()->andReturn("Sara Ahmed\nProject Manager\nSkills\nScrum, Risk management");

        (new AnalyzeProfileResume($import->id))->handle($reader, app(ResumeImportAnalyzer::class));

        $this->assertSame('ready', $import->fresh()->status);
        $this->assertSame('Sara Ahmed', $import->fresh()->extracted_data['fields']['name']);
    }

    public function test_member_can_apply_selected_fields_without_overwriting_unselected_fields(): void
    {
        $user = User::factory()->create(['name' => 'Existing Member']);
        $user->profile()->create(['headline' => 'Existing headline', 'skills' => ['Scrum']]);
        $import = ProfileImportSession::create([
            'user_id' => $user->id, 'source_filename' => 'resume.pdf', 'status' => 'ready',
            'extracted_data' => ['fields' => [
                'name' => 'Resume Name', 'headline' => 'Senior Project Manager',
                'skills' => ['Risk management', 'Scrum'],
                'certifications' => [['name' => 'PMP']],
                'experiences' => [['job_title' => 'Project Manager', 'organization' => 'Northstar', 'start_date' => 'Jan 2022']],
            ]],
        ]);
        $decisions = ['name' => 'keep', 'headline' => 'replace', 'skills' => 'merge',
            'certifications' => 'keep', 'experiences' => 'merge'];

        $this->actingAs($user)->post(route('profile.import.apply'), ['import_id' => $import->id, 'decisions' => $decisions])
            ->assertRedirect(route('profile.edit', ['tab' => 'overview']));

        $this->assertSame('Existing Member', $user->fresh()->name);
        $this->assertSame('Senior Project Manager', $user->fresh()->profile->headline);
        $this->assertSame(['Scrum', 'Risk management'], $user->fresh()->profile->skills);
        $this->assertSame(1, $user->experiences()->count());
        $this->assertSame(0, $user->certifications()->count());
        $this->assertSame('applied', $import->fresh()->status);
    }

    public function test_repeated_import_submission_is_rejected_without_duplicate_experiences(): void
    {
        $user = User::factory()->create();
        $import = ProfileImportSession::create(['user_id' => $user->id, 'source_filename' => 'resume.docx',
            'status' => 'ready', 'extracted_data' => ['fields' => ['experiences' => [
                ['job_title' => 'Manager', 'organization' => 'Acme', 'start_date' => '2023'],
            ]]]]);
        $service = app(ApplyProfileImport::class);
        $service->apply($user, $import->id, ['experiences' => 'merge']);
        $this->assertSame(1, $user->experiences()->count());
        $this->assertNull($user->fresh()->profile, 'Applying only experiences must not create an empty profile.');
        $this->expectException(ValidationException::class);
        $service->apply($user, $import->id, ['experiences' => 'merge']);
    }

    public function test_import_skips_incomplete_and_duplicate_experiences(): void
    {
        $user = User::factory()->create();
        $user->experiences()->create([
            'job_title' => 'Manager', 'organization' => 'Acme',
            'employment_type' => 'Full-time', 'start_date' => '2023',
        ]);
        $import = ProfileImportSession::create([
            'user_id' => $user->id,
            'source_filename' => 'resume.pdf',
            'status' => 'ready',
            'extracted_data' => ['fields' => ['experiences' => [
                ['job_title' => 'Manager', 'organization' => 'Acme'],
                ['job_title' => 'Manager', 'organization' => 'Northstar'],
                ['job_title' => 'Manager', 'organization' => 'Northstar'],
                ['job_title' => 'Coordinator'],
                ['organization' => 'Another company'],
            ]]],
        ]);

        $applied = app(ApplyProfileImport::class)->apply($user, $import->id, ['experiences' => 'merge']);

        $this->assertSame(1, $applied);
        $this->assertSame(2, $user->experiences()->count());
        $this->assertSame(1, $user->experiences()->where('organization', 'Northstar')->count());
        $this->assertSame('applied', $import->fresh()->status);
    }

    public function test_member_cannot_poll_or_apply_another_members_import(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $import = ProfileImportSession::create(['user_id' => $owner->id,
            'source_filename' => 'private.pdf', 'extracted_data' => ['fields' => ['name' => 'Private Person']], 'status' => 'ready']);

        $this->actingAs($other)->get(route('profile.import.status', $import))->assertForbidden();
        $this->actingAs($other)->post(route('profile.import.apply'), [
            'import_id' => $import->id, 'decisions' => ['name' => 'replace'],
        ])->assertNotFound();
        $this->assertSame('ready', $import->fresh()->status);
    }

    public function test_review_recommends_only_real_changes_and_uses_prototype_action_labels(): void
    {
        $user = User::factory()->create(['name' => 'Existing Member']);
        $user->profile()->create(['headline' => 'Project Manager', 'skills' => ['Scrum']]);
        $user->load(['profile', 'experiences', 'educations', 'certifications']);
        $import = new ProfileImportSession(['status' => 'ready', 'extracted_data' => ['fields' => [
            'name' => 'Existing Member',
            'headline' => 'Project Manager | Agile delivery',
            'skills' => ['Scrum', 'Risk management'],
            'phone' => '+880 1712 345678',
            'certifications' => [['name' => 'PMP']],
        ]]]);

        DB::enableQueryLog();
        DB::flushQueryLog();
        $rows = collect(app(ProfileImportPresenter::class)->present($user, $import, collect())['comparisons'])->keyBy('field_key');
        $this->assertCount(0, DB::getQueryLog(), 'Comparison presentation should only read already loaded profile relations.');
        DB::disableQueryLog();

        $this->assertTrue($rows['name']['unchanged']);
        $this->assertFalse($rows['name']['selected']);
        $this->assertSame('Keep existing', $rows['name']['suggested_label']);
        $this->assertSame('Replace', $rows['headline']['suggested_label']);
        $this->assertSame('Add 1 new', $rows['skills']['suggested_label']);
        $this->assertSame('Import privately', $rows['phone']['suggested_label']);
        $this->assertSame('Review manually', $rows['certifications']['suggested_label']);
        $this->assertFalse($rows['certifications']['selected']);
    }

    public function test_member_can_cancel_only_their_own_ready_import_without_deleting_resume(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = ProfileResume::create([
            'user_id' => $user->id, 'original_name' => 'my-resume.pdf',
            'storage_path' => 'resumes/'.$user->id.'/my-resume.pdf',
            'mime_type' => 'application/pdf', 'file_size' => 500,
        ]);
        $import = ProfileImportSession::create([
            'user_id' => $user->id, 'profile_resume_id' => $resume->id,
            'source_filename' => 'my-resume.pdf', 'status' => 'ready',
            'extracted_data' => ['fields' => ['headline' => 'A title']],
        ]);

        $this->actingAs($other)->post(route('profile.import.cancel'), ['import_id' => $import->id])->assertNotFound();
        $this->assertSame('ready', $import->fresh()->status);

        $this->actingAs($user)->post(route('profile.import.cancel'), ['import_id' => $import->id])
            ->assertRedirect(route('profile.edit', ['tab' => 'imports']));
        $this->assertSame('cancelled', $import->fresh()->status);
        $this->assertDatabaseHas('profile_resumes', ['id' => $resume->id]);
        $this->actingAs($user)->post(route('profile.import.cancel'), ['import_id' => $import->id])->assertNotFound();
    }

    public function test_stalled_import_is_reported_without_exposing_resume_data(): void
    {
        $user = User::factory()->create();
        $import = ProfileImportSession::create([
            'user_id' => $user->id,
            'source_filename' => 'private.pdf',
            'status' => 'processing',
            'extracted_data' => ['fields' => ['name' => 'Private Person']],
        ]);
        $import->forceFill(['updated_at' => now()->subMinutes(10)])->save();

        $response = $this->actingAs($user)->get(route('profile.import.status', $import));
        $response->assertOk()->assertJsonPath('status', 'processing')
            ->assertJsonPath('stalled', true)->assertJsonPath('can_retry', true)
            ->assertDontSee('Private Person');
        $cacheDirectives = array_map('trim', explode(',', (string) $response->headers->get('Cache-Control')));
        $this->assertContains('private', $cacheDirectives);
        $this->assertContains('no-store', $cacheDirectives);
    }

    public function test_active_import_cannot_be_retried_while_a_worker_may_be_running(): void
    {
        \Illuminate\Support\Facades\Queue::fake();
        $user = User::factory()->create();
        $import = ProfileImportSession::create([
            'user_id' => $user->id,
            'source_filename' => 'resume.pdf',
            'status' => 'processing',
            'extracted_data' => ['fields' => []],
        ]);

        $this->actingAs($user)->post(route('profile.import.retry', $import))
            ->assertSessionHasErrors('import');
        $this->assertDatabaseCount('profile_import_sessions', 1);
        \Illuminate\Support\Facades\Queue::assertNothingPushed();
    }

    public function test_member_can_retry_own_stalled_import_without_duplicate_retries(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Queue::fake();
        $user = User::factory()->create();
        $path = 'resumes/'.$user->id.'/cv.pdf';
        \Illuminate\Support\Facades\Storage::disk('local')->put($path, 'private resume content');
        $resume = ProfileResume::create([
            'user_id' => $user->id,
            'original_name' => 'cv.pdf',
            'storage_path' => $path,
            'mime_type' => 'application/pdf',
            'file_size' => 100,
        ]);
        $original = ProfileImportSession::create([
            'user_id' => $user->id,
            'profile_resume_id' => $resume->id,
            'source_filename' => 'cv.pdf',
            'status' => 'processing',
            'extracted_data' => ['fields' => []],
        ]);
        $original->forceFill(['updated_at' => now()->subMinutes(10)])->save();

        $this->actingAs($user)->post(route('profile.import.retry', $original))
            ->assertRedirect(route('profile.edit', ['tab' => 'imports']));

        $this->assertSame('cancelled', $original->fresh()->status);
        $this->assertDatabaseCount('profile_resumes', 1);
        $this->assertDatabaseCount('profile_import_sessions', 2);
        $latest = $user->importSessions()->first();
        $this->assertSame('processing', $latest->status);
        $this->assertSame($resume->id, $latest->profile_resume_id);
        \Illuminate\Support\Facades\Queue::assertPushed(AnalyzeProfileResume::class, 1);

        $this->actingAs($user)->post(route('profile.import.retry', $original))
            ->assertSessionHasErrors('import');
        $this->assertDatabaseCount('profile_import_sessions', 2);
        \Illuminate\Support\Facades\Queue::assertPushed(AnalyzeProfileResume::class, 1);
    }

    public function test_failed_import_can_be_retried_without_uploading_the_private_file_again(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Queue::fake();
        $user = User::factory()->create();
        $path = 'resumes/'.$user->id.'/resume.docx';
        \Illuminate\Support\Facades\Storage::disk('local')->put($path, 'private resume content');
        $resume = ProfileResume::create([
            'user_id' => $user->id,
            'original_name' => 'resume.docx',
            'storage_path' => $path,
            'mime_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'file_size' => 100,
        ]);
        $failed = ProfileImportSession::create([
            'user_id' => $user->id,
            'profile_resume_id' => $resume->id,
            'source_filename' => 'resume.docx',
            'status' => 'failed',
            'extracted_data' => ['fields' => [], 'warnings' => ['Old failure']],
        ]);

        $this->actingAs($user)->post(route('profile.import.retry', $failed))
            ->assertRedirect(route('profile.edit', ['tab' => 'imports']));
        $this->assertSame('cancelled', $failed->fresh()->status);
        $this->assertDatabaseCount('profile_import_sessions', 2);
        $this->assertSame('processing', $user->importSessions()->first()->status);
        \Illuminate\Support\Facades\Queue::assertPushed(AnalyzeProfileResume::class, 1);
    }

    public function test_retry_does_not_expose_another_members_import(): void
    {
        \Illuminate\Support\Facades\Queue::fake();
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $import = ProfileImportSession::create([
            'user_id' => $owner->id,
            'source_filename' => 'private.pdf',
            'status' => 'failed',
            'extracted_data' => ['fields' => []],
        ]);

        $this->actingAs($other)->post(route('profile.import.retry', $import))->assertNotFound();
        $this->assertSame('failed', $import->fresh()->status);
        \Illuminate\Support\Facades\Queue::assertNothingPushed();
    }

    public function test_presenter_does_not_run_per_row_database_queries(): void
    {
        $user = User::factory()->create();
        $user->load(['profile', 'experiences', 'educations', 'certifications']);
        $import = new ProfileImportSession(['status' => 'ready', 'extracted_data' => [
            'fields' => ['name' => 'New Name', 'skills' => ['Scrum', 'Agile'], 'headline' => 'PM']]]);

        DB::enableQueryLog();
        DB::flushQueryLog();
        app(ProfileImportPresenter::class)->present($user, $import, collect());
        $queries = DB::getQueryLog();
        DB::disableQueryLog();
        $this->assertCount(0, $queries);
    }
}
