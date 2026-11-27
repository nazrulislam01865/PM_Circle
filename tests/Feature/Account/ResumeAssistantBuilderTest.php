<?php

namespace Tests\Feature\Account;

use App\Domain\Identity\Services\ResumeAssistantProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class ResumeAssistantBuilderTest extends TestCase
{
    use RefreshDatabase;

    private function member(string $plan = 'pro'): User
    {
        $this->withoutVite();
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        $user = User::factory()->create(['onboarding_step' => 3]);
        DB::table('temporary_memberships')->insert(['user_id' => $user->id, 'plan_code' => $plan, 'created_at' => now(), 'updated_at' => now()]);
        return $user;
    }

    public function test_draft_is_private_and_does_not_change_profile_until_submit(): void
    {
        $user = $this->member();
        $snapshot = app(ResumeAssistantProfile::class)->snapshot($user);
        $payload = [...$snapshot['fields'], 'version' => $snapshot['version'], 'summary' => 'Reviewed professional summary.'];
        $this->actingAs($user)->post('/dashboard/resume-assistant', [...$payload, 'action' => 'draft'])->assertRedirect('/dashboard/resume-assistant');
        $this->assertNotSame('Reviewed professional summary.', $user->fresh()->profile?->about);
        $this->get('/dashboard/resume-assistant')->assertInertia(fn ($page) => $page->where('draft.summary', 'Reviewed professional summary.'));
        $this->post('/dashboard/resume-assistant', [...$payload, 'action' => 'submit'])->assertRedirect('/dashboard/resume-assistant');
        $this->assertSame('Reviewed professional summary.', $user->fresh()->profile->about);
        $this->assertNull(session('resume_assistant.'.$user->id));
        $this->post('/dashboard/resume-assistant', [...$payload, 'action' => 'submit'])->assertSessionHasErrors('version');
    }

    public function test_non_entitled_member_cannot_save_or_submit(): void
    {
        $user = $this->member('plus');
        $snapshot = app(ResumeAssistantProfile::class)->snapshot($user);
        foreach (['draft', 'submit'] as $action) {
            $this->actingAs($user)->post('/dashboard/resume-assistant', [...$snapshot['fields'], 'version' => $snapshot['version'], 'action' => $action])->assertForbidden();
        }
    }

    public function test_existing_additional_entries_and_verified_credentials_are_preserved(): void
    {
        $user = $this->member();
        $first = $user->educations()->create(['degree' => 'Bachelor', 'institution' => 'University']);
        $second = $user->educations()->create(['degree' => 'Master', 'institution' => 'University']);
        $credential = $user->certifications()->create(['name' => 'Existing certification']);
        $credential->verified = true;
        $credential->save();
        $snapshot = app(ResumeAssistantProfile::class)->snapshot($user);
        $payload = [...$snapshot['fields'], 'version' => $snapshot['version'], 'action' => 'submit'];
        $this->actingAs($user)->post('/dashboard/resume-assistant', [...$payload, 'degree' => 'Updated bachelor'])->assertRedirect('/dashboard/resume-assistant');
        $this->assertSame('Updated bachelor', $first->fresh()->degree);
        $this->assertSame('Master', $second->fresh()->degree);
        $snapshot = app(ResumeAssistantProfile::class)->snapshot($user->fresh());
        $this->post('/dashboard/resume-assistant', [...$snapshot['fields'], 'version' => $snapshot['version'], 'action' => 'submit', 'certification' => 'New name'])->assertSessionHasErrors('certification');
        $this->assertSame('Existing certification', $credential->fresh()->name);
        $this->assertTrue((bool) $credential->fresh()->verified);
    }
    public function test_full_template_document_is_saved_privately_and_exported(): void
    {
        $user = $this->member();
        $existing = $user->educations()->create(['degree' => 'Original degree', 'institution' => 'Original university']);
        $snapshot = app(ResumeAssistantProfile::class)->snapshot($user);
        $document = $snapshot['document'];
        $document['research'] = [['title' => 'Private research', 'description' => 'Research details']];
        $document['education'] = [['title' => 'CV university', 'subtitle' => 'CV degree']];
        $document['achievements'] = [['title' => 'Private achievement', 'period' => '2025']];
        $this->actingAs($user)->get('/settings/profile?tab=assistant')->assertOk();
        $payload = [...$snapshot['fields'], 'version' => $snapshot['version'], 'document' => $document];
        $this->post('/dashboard/resume-assistant', [...$payload, 'action' => 'draft'])->assertRedirect('/settings/profile?tab=assistant');
        $this->assertNull($user->fresh()->profile?->private_resume_document);
        $this->post('/dashboard/resume-assistant', [...$payload, 'action' => 'submit'])->assertRedirect('/settings/profile?tab=assistant');
        $profile = $user->fresh()->profile;
        $this->assertSame('Private research', $profile->private_resume_document['research'][0]['title']);
        $this->assertArrayNotHasKey('private_resume_document', $profile->toArray());
        $this->assertStringNotContainsString('Private research', $profile->getRawOriginal('private_resume_document'));
        $this->assertSame('Original degree', $existing->fresh()->degree);
        $this->get('/settings/profile/resume/export?format=pdf')->assertOk()->assertSee('Private research')->assertSee('Private achievement');
        $word = $this->get('/settings/profile/resume/export?format=word')->assertOk()->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        $this->assertWordContains($word->getContent(), 'CV university');
    }

    public function test_reviewed_resume_updates_both_profile_views_without_duplicate_records(): void
    {
        $user = $this->member();
        $credential = $user->certifications()->create(['name' => 'Verified credential']);
        $credential->verified = true;
        $credential->save();
        $snapshot = app(ResumeAssistantProfile::class)->snapshot($user);
        $document = $snapshot['document'];
        $document['education'] = [['title' => 'Example University', 'subtitle' => 'BSc', 'period' => '2020 - 2024']];
        $document['experience'] = [['title' => 'Example Company', 'subtitle' => 'Engineer', 'period' => '2024-01 – Present', 'description' => 'Developed software.']];
        $document['projects'] = [['title' => 'Example project', 'description' => 'Built a service.']];
        $document['skills'] = [['title' => 'Engineering', 'description' => 'PHP, SQL']];
        $document['certifications'] = [['title' => 'Verified credential', 'subtitle' => 'Unverified issuer']];
        $document['research'] = [['title' => 'Example research', 'description' => 'Research details']];
        $payload = [...$snapshot['fields'], 'version' => $snapshot['version'], 'document' => $document, 'sync_profile' => true];
        $this->actingAs($user)->post('/dashboard/resume-assistant', [...$payload, 'action' => 'draft'])->assertRedirect();
        $this->assertSame(0, $user->educations()->count());
        $this->post('/dashboard/resume-assistant', [...$payload, 'action' => 'submit'])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame('Example University', $user->educations()->firstOrFail()->institution);
        $this->assertSame('Example Company', $user->experiences()->firstOrFail()->organization);
        $this->assertSame('Example project', $user->profileProjects()->firstOrFail()->title);
        $this->assertSame(['PHP', 'SQL'], $user->fresh()->profile->skills);
        $this->assertTrue((bool) $credential->fresh()->verified);
        foreach (['overview', 'edit'] as $tab) {
            $this->get('/settings/profile?tab='.$tab)->assertOk()->assertInertia(fn ($page) => $page
                ->where('profileData.educations.0.institution', 'Example University')
                ->where('profileData.experiences.0.organization', 'Example Company')
                ->where('profileData.editor_details.records.research.0.title', 'Example research'));
        }
        $fresh = app(ResumeAssistantProfile::class)->snapshot($user->fresh());
        $this->post('/dashboard/resume-assistant', [...$payload, 'version' => $fresh['version'], 'action' => 'submit'])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame(1, $user->educations()->count());
        $this->assertSame(1, $user->experiences()->count());
        $this->assertSame(1, $user->profileProjects()->count());
    }

    public function test_profile_tab_does_not_bypass_entitlement(): void
    {
        $this->actingAs($this->member('plus'))->get('/settings/profile?tab=assistant')->assertForbidden();
    }
    public function test_local_extraction_is_private_and_rate_limited_independently(): void
    {
        $user = $this->member();
        config()->set('pm-ai.resume_extract_enabled', true);
        $this->mock(\App\Services\Resume\ResumeTextExtractor::class, function ($mock): void {
            $mock->shouldReceive('extractTemplate')->times(3)->andReturn("Example Member\nProject Coordinator\nDhaka, Bangladesh\nPersonal Profile\nCoordinates delivery and reporting.\nEducation\nExample University  Dhaka, Bangladesh\nBSc  2020 - 2024\nCompleted a capstone project.\nProjects\nExample Project  Dhaka, Bangladesh\nDeveloper  2024 - 2025\nBuilt a reporting application.\nSkills\nProgramming  SQL, PHP, JavaScript");
        });
        $this->actingAs($user);
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/dashboard/resume-assistant/extract', ['resume' => \Illuminate\Http\UploadedFile::fake()->create('resume.pdf', 100, 'application/pdf')])
                ->assertOk()->assertJsonPath('fields.name', 'Example Member')->assertJsonPath('document.projects.0.title', 'Example Project');
        }
        $this->postJson('/dashboard/resume-assistant/extract', ['resume' => \Illuminate\Http\UploadedFile::fake()->create('resume.pdf', 100, 'application/pdf')])->assertTooManyRequests();
        $this->assertDatabaseMissing('profile_resumes', ['user_id' => $user->id]);
        $this->assertNull($user->fresh()->profile?->private_resume_document);
        $this->get('/settings/profile?tab=assistant')->assertOk();
    }

    public function test_non_entitled_member_cannot_extract_resume(): void
    {
        $this->actingAs($this->member('plus'))->postJson('/dashboard/resume-assistant/extract', ['resume' => \Illuminate\Http\UploadedFile::fake()->create('resume.pdf', 100, 'application/pdf')])->assertForbidden();
    }

    public function test_current_draft_exports_without_saving_or_replacing_profile(): void
    {
        $user = $this->member();
        $snapshot = app(ResumeAssistantProfile::class)->snapshot($user);
        $document = $snapshot['document'];
        $document['phone'] = '+123456789';
        $document['projects'] = [['title' => 'Unsaved project', 'description' => "First contribution\nSecond contribution", 'team' => 'Example team']];
        $document['research'] = [['title' => 'Unsaved research']];
        $payload = [...$snapshot['fields'], 'name' => 'Unsaved candidate', 'summary' => 'Unsaved summary <script>alert(1)</script>', 'document' => $document];
        $this->actingAs($user)->postJson('/dashboard/resume-assistant/export', [...$payload, 'format' => 'pdf'])
            ->assertOk()->assertSee('Unsaved candidate')->assertSee('Unsaved project')->assertSee('Second contribution')->assertSee('Example team')->assertSee('Unsaved research')
            ->assertSee('&lt;script&gt;alert(1)&lt;/script&gt;', false)->assertDontSee('<script>alert(1)</script>', false);
        $word = $this->postJson('/dashboard/resume-assistant/export', [...$payload, 'format' => 'word'])
            ->assertOk()->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            ->assertHeader('Content-Disposition', 'attachment; filename="pm-circle-resume.docx"');
        foreach (['Unsaved candidate', 'Unsaved project', 'Second contribution', 'Example team', 'Unsaved research', '&lt;script&gt;alert(1)&lt;/script&gt;', ' | '] as $text) {
            $this->assertWordContains($word->getContent(), $text);
        }
        $this->assertSame($snapshot['fields']['name'], $user->fresh()->name);
        $this->assertNull($user->fresh()->profile?->private_resume_document);
        $this->assertNull(session('resume_assistant.'.$user->id));
        $this->postJson('/dashboard/resume-assistant/export', ['format' => 'pdf'])->assertUnprocessable();
    }

    public function test_current_draft_export_requires_entitlement(): void
    {
        $this->actingAs($this->member('plus'))->postJson('/dashboard/resume-assistant/export', ['format' => 'pdf'])->assertForbidden();
    }

    private function assertWordContains(string $bytes, string $text): void
    {
        $this->assertStringStartsWith("PK", $bytes);
        $file = tempnam(sys_get_temp_dir(), 'cv-test-');
        try {
            file_put_contents($file, $bytes);
            $zip = new \ZipArchive();
            $this->assertTrue($zip->open($file));
            try { $this->assertStringContainsString($text, $zip->getFromName('word/document.xml')); }
            finally { $zip->close(); }
        } finally { unlink($file); }
    }

}
