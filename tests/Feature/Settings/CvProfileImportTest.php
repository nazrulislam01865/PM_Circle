<?php

namespace Tests\Feature\Settings;

use App\Domain\AI\Services\CvExtractionService;
use App\Models\ProfileImportSession;
use App\Models\ProfileResume;
use App\Models\User;
use App\Services\Resume\ApplyProfileImport;
use App\Services\Resume\ResumeTextExtractor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

final class CvProfileImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_approved_suggestions_fill_profile_editor_sections_without_duplicates_or_verified_credentials(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $member->profile()->create(['about' => 'Existing introduction', 'skills' => ['Agile']]);
        $fields = [
            'about' => 'Programme delivery specialist',
            'skills' => ['Agile', 'Project planning'],
            'experiences' => [[
                'job_title' => 'Project Manager', 'organization' => 'Example Ltd',
                'start_month' => '2022-03', 'end_month' => '', 'is_current' => true,
                'location' => 'Dhaka', 'responsibilities' => 'Delivery governance',
            ]],
            'projects' => [['title' => 'Customer Portal', 'role' => 'Delivery lead',
                'scope' => 'Led cross-functional implementation', 'status' => 'Completed']],
            'educations' => [['degree' => 'BSc', 'institution' => 'Example University', 'end_month' => '2019-06']],
            'certifications' => [['name' => 'Example Certificate', 'issuing_organization' => 'Example Body']],
            'courses' => [['name' => 'Leadership course', 'provider' => 'Example Academy']],
            'awards' => [['name' => 'Delivery award', 'organization' => 'Example Ltd']],
            'publications' => [['title' => 'Project delivery article', 'publisher' => 'Example Journal']],
            'volunteering' => [['role' => 'Mentor', 'organization' => 'Community']],
            'languages' => [['name' => 'Bangla', 'proficiency' => 'Native or bilingual']],
            'links' => [['label' => 'Portfolio', 'url' => 'https://example.com/portfolio']],
            'career' => ['target_roles' => 'Programme Lead'],
        ];
        $import = ProfileImportSession::create([
            'user_id' => $member->id, 'source_filename' => 'sample.pdf',
            'status' => 'ready', 'extracted_data' => ['fields' => $fields, 'warnings' => []],
        ]);
        $decisions = array_fill_keys(array_keys($fields), 'merge');
        $decisions['about'] = 'replace';
        $count = app(ApplyProfileImport::class)->apply($member, $import->id, $decisions);
        $this->assertGreaterThan(5, $count);
        $member->refresh()->load('profile');
        $this->assertSame('Programme delivery specialist', $member->profile->about);
        $this->assertSame(['Agile', 'Project planning'], $member->profile->skills);
        $this->assertSame('Delivery governance', $member->profile->editor_details['records']['experiences'][0]['responsibilities']);
        $this->assertSame('Completed', $member->profile->editor_details['records']['projects'][0]['status']);
        $this->assertSame('Leadership course', $member->profile->editor_details['records']['courses'][0]['name']);
        $this->assertSame('Programme Lead', $member->profile->editor_details['career']['target_roles']);
        $this->assertDatabaseHas('experiences', ['user_id' => $member->id, 'start_date' => '2022-03']);
        $this->assertDatabaseHas('profile_projects', ['user_id' => $member->id, 'title' => 'Customer Portal']);
        $this->assertDatabaseHas('educations', ['user_id' => $member->id, 'year' => '2019']);
        $this->assertDatabaseHas('certifications', ['user_id' => $member->id, 'verified' => false]);

        $second = ProfileImportSession::create([
            'user_id' => $member->id, 'source_filename' => 'same.pdf',
            'status' => 'ready', 'extracted_data' => ['fields' => $fields, 'warnings' => []],
        ]);
        $this->assertSame(0, app(ApplyProfileImport::class)->apply($member, $second->id, $decisions));
        $this->assertSame(1, $member->experiences()->count());
        $this->assertSame(1, $member->profileProjects()->count());
    }

    public function test_unapproved_cv_import_never_updates_a_profile(): void
    {
        $member = User::factory()->create();
        $import = ProfileImportSession::create(['user_id' => $member->id, 'source_filename' => 'cv.pdf',
            'extracted_data' => ['fields' => ['about' => 'Not approved'], 'warnings' => []], 'status' => 'ready']);
        $this->actingAs($member)->post(route('profile.import.apply'), [
            'import_id' => $import->id, 'decisions' => ['about' => 'keep'],
        ])->assertRedirect();
        $this->assertNull($member->fresh()->profile?->about);
    }

    public function test_ai_adapter_uses_dedicated_key_and_never_stores_provider_response(): void
    {
        config()->set('pm-ai.resume_extract_enabled', true);
        config()->set('pm-ai.resume_extract_api_key', 'test-resume-key');
        config()->set('pm-ai.resume_extract_model', 'gpt-4o-mini');
        config()->set('pm-ai.global_daily_budget_usd', 20);
        \Illuminate\Support\Facades\DB::table('ai_model_prices')->insert(['model' => 'gpt-4o-mini', 'input_usd_per_m' => 1, 'cached_input_usd_per_m' => 1, 'output_usd_per_m' => 1, 'effective_from' => now()->subMinute(), 'created_at' => now(), 'updated_at' => now()]);
        Storage::fake('local');
        Storage::disk('local')->put('resumes/test.pdf', '%PDF placeholder');
        $resume = new ProfileResume(['original_name' => 'test.pdf', 'storage_path' => 'resumes/test.pdf', 'file_size' => 17]);
        $reader = \Mockery::mock(ResumeTextExtractor::class);
        $reader->shouldReceive('extract')->once()->andReturn(str_repeat('CV facts. ', 10));
        $this->app->instance(ResumeTextExtractor::class, $reader);
        Http::fake(['*api.openai.com/v1/responses' => Http::response([
            'status' => 'completed', 'model' => 'gpt-4o-mini',
            'usage' => ['input_tokens' => 120, 'output_tokens' => 70],
            'output' => [['content' => [['type' => 'output_text',
                'text' => json_encode(['fields' => ['name' => 'Sample Member', 'skills' => ['Laravel']]])]]]],
        ], 200)]);
        $result = app(CvExtractionService::class)->analyze($resume, true);
        $this->assertSame('Sample Member', $result['fields']['name']);
        $this->assertSame(120, $result['ai_usage']['input_tokens']);
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer test-resume-key')
            && $request['store'] === false && $request['model'] === 'gpt-4o-mini'
            && data_get($request->data(), 'text.format.strict') === true);
    }


    public function test_scanned_pdf_uses_private_file_input_when_local_text_is_unreadable(): void
    {
        config()->set('pm-ai.resume_extract_enabled', true);
        config()->set('pm-ai.resume_extract_api_key', 'private-test-key');
        config()->set('pm-ai.resume_extract_model', 'gpt-4o');
        config()->set('pm-ai.global_daily_budget_usd', 20);
        \Illuminate\Support\Facades\DB::table('ai_model_prices')->insert(['model' => 'gpt-4o', 'input_usd_per_m' => 1, 'cached_input_usd_per_m' => 1, 'output_usd_per_m' => 1, 'effective_from' => now()->subMinute(), 'created_at' => now(), 'updated_at' => now()]);
        Storage::fake('local');
        Storage::disk('local')->put('resumes/scan.pdf', '%PDF-1.4 placeholder scanned pages');
        $resume = new ProfileResume([
            'user_id' => 9001, 'original_name' => 'scan.pdf', 'storage_path' => 'resumes/scan.pdf', 'file_size' => 34,
        ]);
        $reader = \Mockery::mock(ResumeTextExtractor::class);
        $reader->shouldReceive('extract')->once()->andThrow(new RuntimeException('No selectable text'));
        $this->app->instance(ResumeTextExtractor::class, $reader);
        Http::fake(['*api.openai.com/v1/responses' => Http::response([
            'status' => 'completed', 'usage' => ['input_tokens' => 300, 'output_tokens' => 80],
            'output' => [['content' => [['type' => 'output_text',
                'text' => json_encode(['fields' => ['name' => 'Scanned Candidate', 'skills' => []]])]]]],
        ], 200)]);
        $result = app(CvExtractionService::class)->analyze($resume, true);
        $this->assertSame('Scanned Candidate', $result['fields']['name']);
        Http::assertSent(fn ($request) => str_starts_with((string) data_get($request->data(), 'input.0.content.0.file_data'), 'data:application/pdf;base64,'));
    }

    public function test_external_ai_requires_explicit_consent(): void
    {
        config()->set('pm-ai.resume_extract_enabled', true);
        config()->set('pm-ai.resume_extract_api_key', 'test-key');
        config()->set('pm-ai.resume_extract_model', 'gpt-4o-mini');
        config()->set('pm-ai.global_daily_budget_usd', 20);
        \Illuminate\Support\Facades\DB::table('ai_model_prices')->insert(['model' => 'gpt-4o-mini', 'input_usd_per_m' => 1, 'cached_input_usd_per_m' => 1, 'output_usd_per_m' => 1, 'effective_from' => now()->subMinute(), 'created_at' => now(), 'updated_at' => now()]);
        Http::fake();
        $this->expectException(RuntimeException::class);
        try {
            app(CvExtractionService::class)->analyze(new ProfileResume(), false);
        } finally {
            Http::assertNothingSent();
        }
    }
}
