<?php

namespace Tests\Feature\Settings;

use App\Models\Experience;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ProfileEditorPrototypeTest extends TestCase
{
    use RefreshDatabase;

    private function payload(): array
    {
        return [
            'tab' => 'edit',
            'name' => 'Editor Member',
            'email' => 'editor@example.com',
            'phone' => '+880 1712 345678',
            'headline' => 'Programme Lead',
            'role' => 'Project Manager',
            'industry' => 'Information Technology',
            'country' => 'Bangladesh',
            'city' => 'Dhaka',
            'about' => 'Responsible for delivery.',
            'skills' => ['Planning', 'Risk Management'],
            'languages' => ['Bangla'],
            'linkedin_url' => '',
            'open_to_opportunities' => true,
            'editor_details' => [
                'current_organization' => 'Example Technology',
                'profile_photo_url' => '', 'cover_photo_url' => '',
                'tools_software' => 'Jira', 'delivery_methods' => 'Hybrid',
                'career' => [
                    'availability' => 'open', 'target_roles' => 'PMO Lead', 'seniority' => 'Senior',
                    'locations' => 'Dhaka', 'work_arrangement' => 'Hybrid',
                    'employment_type' => 'Full-time', 'notice_period' => '30 days', 'relocation' => false,
                ],
                'records' => [
                    'experiences' => [[
                        'job_title' => 'Project Manager', 'organization' => 'Example Technology',
                        'employment_type' => 'Full-time', 'location' => 'Dhaka',
                        'work_arrangement' => 'Hybrid', 'start_month' => '2023-01', 'end_month' => '',
                        'is_current' => true, 'responsibilities' => 'Delivery planning', 'achievements' => 'On time',
                    ]],
                    'projects' => [], 'educations' => [], 'certifications' => [],
                    'courses' => [], 'awards' => [], 'publications' => [], 'volunteering' => [],
                    'languages' => [['name' => 'Bangla', 'proficiency' => 'Native or bilingual']],
                    'links' => [],
                ],
            ],
            'removed_entries' => [],
        ];
    }

    public function test_profile_editor_saves_existing_domain_records_and_extra_details(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $payload = $this->payload();
        $payload['email'] = $member->email;

        $this->actingAs($member)->patch(route('profile.update'), $payload)
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit', ['tab' => 'edit']));

        $member->refresh();
        $this->assertSame('Editor Member', $member->name);
        $this->assertSame('Example Technology', $member->profile->editor_details['current_organization']);
        $this->assertSame('Jira', $member->profile->editor_details['tools_software']);
        $this->assertSame(['Bangla'], $member->profile->languages);
        $this->assertSame(1, $member->experiences()->count());
        $this->assertSame('2023-01', $member->experiences()->first()->start_date);

        $payload['editor_details'] = $member->profile->editor_details;
        $this->actingAs($member)->patch(route('profile.update'), $payload)->assertSessionHasNoErrors();
        $this->assertSame(1, $member->experiences()->count(), 'A repeat save must update, not duplicate, the owned record.');
    }

    public function test_owner_overview_loads_persisted_editor_sections_without_exposing_them_on_privacy_tab(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $member->profile()->create([
            'editor_details' => [
                'tools_software' => 'Jira',
                'career' => ['availability' => 'open', 'target_roles' => 'Programme Lead'],
                'records' => ['awards' => [['name' => 'Leadership Award', 'organization' => 'PM Circle']]],
            ],
        ]);

        $this->actingAs($member)->get(route('profile.edit', ['tab' => 'overview']))
            ->assertOk()->assertInertia(fn ($page) => $page
                ->component('settings/profile')
                ->where('profileData.editor_details.tools_software', 'Jira')
                ->where('profileData.editor_details.career.target_roles', 'Programme Lead')
                ->where('profileData.editor_details.records.awards.0.name', 'Leadership Award'));

        $this->actingAs($member)->get(route('profile.edit', ['tab' => 'privacy']))
            ->assertOk()->assertInertia(fn ($page) => $page
                ->where('profileData.editor_details', []));
    }

    public function test_user_cannot_update_other_members_experience(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $owner = User::factory()->create(['onboarding_step' => 3]);
        $other = Experience::create([
            'user_id' => $owner->id, 'job_title' => 'Confidential role', 'organization' => 'Private',
            'employment_type' => 'Full-time', 'start_date' => '2025-01', 'is_current' => true,
        ]);
        $payload = $this->payload();
        $payload['email'] = $member->email;
        $payload['editor_details']['records']['experiences'][0]['id'] = $other->id;

        $this->actingAs($member)->patch(route('profile.update'), $payload)->assertNotFound();
        $this->assertSame('Confidential role', $other->fresh()->job_title);
    }

    public function test_invalid_prototype_url_is_rejected_before_writes(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $payload = $this->payload();
        $payload['email'] = $member->email;
        $payload['editor_details']['profile_photo_url'] = 'javascript:alert(1)';

        $this->actingAs($member)->patch(route('profile.update'), $payload)
            ->assertSessionHasErrors('editor_details.profile_photo_url');
        $this->assertDatabaseMissing('experiences', ['user_id' => $member->id, 'job_title' => 'Project Manager']);
    }

    public function test_compact_editor_preserves_structured_records_and_saves_summary_fields(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $detailed = $this->payload();
        $detailed['email'] = $member->email;
        $this->actingAs($member)->patch(route('profile.update'), $detailed)->assertSessionHasNoErrors();
        $before = $member->fresh()->profile->editor_details;
        $experienceId = $member->experiences()->firstOrFail()->id;
        $compact = [
            'tab' => 'edit', 'name' => $member->name, 'email' => $member->email,
            'role' => 'Delivery Lead', 'phone' => '+880 1712 345678',
            'linkedin_url' => 'https://www.linkedin.com/in/example',
            'compact_details' => [
                'current_organization' => 'Example Technology',
                'display_location' => 'Dhaka, Bangladesh',
                'selected_projects' => 'Led a delivery programme.',
                'public_speaking' => 'Project leadership seminar.',
            ],
        ];
        $this->actingAs($member)->patch(route('profile.update'), $compact)
            ->assertSessionHasNoErrors()->assertRedirect(route('profile.edit', ['tab' => 'edit']));
        $profile = $member->fresh()->profile;
        $this->assertSame('Delivery Lead', $profile->role);
        $this->assertSame('Led a delivery programme.', $profile->editor_details['compact']['selected_projects']);
        $this->assertSame($before['records'], $profile->editor_details['records']);
        $this->assertSame($before['career'], $profile->editor_details['career']);
        $this->assertSame($experienceId, $member->experiences()->firstOrFail()->id);
        $this->assertSame(1, $member->experiences()->count());

        // A subsequent detailed save must not erase the compact summaries.
        $detailed['editor_details'] = $before;
        $this->actingAs($member)->patch(route('profile.update'), $detailed)->assertSessionHasNoErrors();
        $this->assertSame('Led a delivery programme.', $member->fresh()->profile->editor_details['compact']['selected_projects']);
    }

    public function test_compact_editor_rejects_unsafe_urls_and_unknown_fields(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->patch(route('profile.update'), [
            'tab' => 'edit', 'name' => $member->name, 'email' => $member->email,
            'role' => 'Project Manager', 'phone' => '+880 1712 345678',
            'compact_details' => [
                'current_organization' => 'Example Technology',
                'profile_photo_url' => 'javascript:alert(1)',
                'records' => [],
            ],
        ])->assertSessionHasErrors(['compact_details', 'compact_details.profile_photo_url']);
    }

    public function test_compact_summary_respects_public_profile_section_privacy(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $profile = $member->profile()->create([
            'visibility' => 'public',
            'field_visibility' => ['selected_projects' => 'private', 'city' => 'private'],
            'editor_details' => ['compact' => [
                'selected_projects' => 'Private project', 'public_speaking' => 'Public seminar',
                'display_location' => 'Private city',
            ]],
        ]);
        $result = app(\App\Domain\Identity\Services\MemberProfileOverview::class)->forMember($member, $profile, null);
        $details = $result['profile']['editor_details']['compact'];
        $this->assertArrayNotHasKey('selected_projects', $details);
        $this->assertArrayNotHasKey('display_location', $details);
        $this->assertSame('Public seminar', $details['public_speaking']);
    }

    public function test_resume_shaped_fields_save_and_are_available_to_owner_overview_and_new_cv(): void
    {
        $this->withoutVite();
        $member = User::factory()->create(['onboarding_step' => 3]);
        $payload = $this->payload();
        $payload['email'] = $member->email;
        $payload['editor_details']['portfolio'] = 'https://example.com/portfolio';
        $payload['editor_details']['github'] = 'example-user';
        $records = &$payload['editor_details']['records'];
        $records['experiences'][0]['technical'] = 'SQL';
        $records['experiences'][0]['soft'] = 'Facilitation';
        $records['research'] = [['title' => 'Delivery research', 'team_role' => 'Researcher', 'period' => '2025', 'description' => 'Study outcomes']];
        $records['skill_groups'] = [['category' => 'Programming', 'skills' => 'PHP, TypeScript']];
        $records['interests'] = [['title' => 'Reading', 'description' => 'History']];
        $records['educations'] = [['degree' => 'BSc', 'institution' => 'University', 'location' => 'Dhaka', 'start_month' => '2020-01', 'end_month' => '2024-06', 'is_current' => false, 'courses' => 'Software engineering']];
        $records['projects'] = [['title' => 'Portal', 'role' => 'Developer', 'organization' => 'Example', 'location' => 'Dhaka', 'team' => 'Four developers', 'scope' => 'Portal delivery', 'technical' => 'Laravel', 'soft' => 'Collaboration']];
        $records['certifications'] = [['name' => 'Example credential', 'issuing_organization' => 'Example issuer', 'does_not_expire' => true, 'details' => 'Credential details']];
        unset($records);
        $this->actingAs($member)->patch(route('profile.update'), $payload)->assertSessionHasNoErrors();
        $member = $member->fresh();
        $this->get(route('profile.edit', ['tab' => 'overview']))->assertOk()->assertInertia(fn ($page) => $page
            ->where('profileData.editor_details.records.research.0.title', 'Delivery research')
            ->where('profileData.editor_details.records.skill_groups.0.skills', 'PHP, TypeScript')
            ->where('profileData.editor_details.records.interests.0.title', 'Reading')
            ->where('profileData.editor_details.records.projects.0.team', 'Four developers')
            ->where('profileData.editor_details.records.educations.0.courses', 'Software engineering')
            ->where('profileData.editor_details.records.experiences.0.technical', 'SQL')
            ->where('profileData.editor_details.github', 'example-user'));
        $snapshot = app(\App\Domain\Identity\Services\ResumeAssistantProfile::class)->snapshot($member);
        $this->assertSame('Delivery research', $snapshot['document']['research'][0]['title']);
        $this->assertSame('Four developers', $snapshot['document']['projects'][0]['team']);
        $this->assertSame('Software engineering', $snapshot['document']['education'][0]['courses']);
        $this->assertSame('SQL', $snapshot['document']['experience'][0]['technical']);
        $this->assertSame('Example issuer', $snapshot['document']['certifications'][0]['subtitle']);
        $this->assertSame('example-user', $snapshot['document']['github']);
        // The profile editor never replaces an already saved private CV.
        $private = $snapshot['document'];
        $private['research'] = [['title' => 'Private CV only']];
        $member->profile->private_resume_document = $private;
        $member->profile->save();
        $payload['editor_details'] = $member->profile->editor_details;
        $payload['editor_details']['records']['research'][0]['description'] = 'Updated research';
        $this->patch(route('profile.update'), $payload)->assertSessionHasNoErrors();
        $this->assertSame($private, $member->fresh()->profile->private_resume_document);
        $this->assertSame(1, $member->experiences()->count());
    }

    public function test_new_sections_have_private_defaults_and_respect_explicit_public_visibility(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $profile = $member->profile()->create([
            'visibility' => 'public',
            'editor_details' => ['records' => [
                'research' => [['title' => 'Private research']],
                'interests' => [['title' => 'Private interest']],
                'skill_groups' => [['category' => 'Technical', 'skills' => 'SQL']],
            ]],
            'field_visibility' => ['core_skills' => 'private'],
        ]);
        $projection = app(\App\Domain\Identity\Services\MemberProfileOverview::class);
        $guest = $projection->forMember($member, $profile, null);
        $this->assertArrayNotHasKey('research', $guest['profile']['editor_details']['records'] ?? []);
        $this->assertArrayNotHasKey('interests', $guest['profile']['editor_details']['records'] ?? []);
        $this->assertArrayNotHasKey('skill_groups', $guest['profile']['editor_details']['records'] ?? []);
        $profile->field_visibility = ['research_work' => 'public', 'interests' => 'public', 'core_skills' => 'public'];
        $profile->save();
        $guest = $projection->forMember($member, $profile, null);
        $this->assertSame('Private research', $guest['profile']['editor_details']['records']['research'][0]['title']);
        $this->assertSame('Private interest', $guest['profile']['editor_details']['records']['interests'][0]['title']);
        $this->assertSame('SQL', $guest['profile']['editor_details']['records']['skill_groups'][0]['skills']);
    }

    public function test_new_fields_reject_unrecognized_keys_and_oversized_values(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $payload = $this->payload();
        $payload['email'] = $member->email;
        $payload['editor_details']['records']['research'] = [['title' => 'Research', 'description' => str_repeat('x', 4001)]];
        $payload['editor_details']['records']['interests'] = [['title' => 'Reading', 'unknown_field' => 'reject']];
        $this->actingAs($member)->patch(route('profile.update'), $payload)
            ->assertSessionHasErrors(['editor_details.records.research.0.description', 'editor_details.records.interests.0']);
        $this->assertSame(0, $member->experiences()->count());
    }

    public function test_exact_resume_profile_editor_preserves_legacy_data_and_private_cv(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $legacy = $this->payload();
        $legacy['email'] = $member->email;
        $legacy['editor_details']['records']['courses'] = [['name' => 'Legacy course']];
        $legacy['editor_details']['records']['awards'] = [['name' => 'Legacy award', 'details' => 'Retain this detail']];
        $this->actingAs($member)->patch(route('profile.update'), $legacy)->assertSessionHasNoErrors();
        $member->refresh();
        $experience = $member->experiences()->firstOrFail();
        $private = app(\App\Domain\Identity\Services\ResumeDocument::class)->fromProfile($member->loadMissing(['profile', 'educations', 'experiences', 'profileProjects', 'certifications']));
        $private['research'] = [['title' => 'Private CV only']];
        $member->profile->private_resume_document = $private;
        $member->profile->save();
        $payload = [
            'tab' => 'edit', 'name' => $member->name, 'email' => $member->email, 'phone' => '+880 1712 345678',
            'headline' => 'Programme Lead', 'role' => 'Project Manager', 'about' => 'Summary',
            'editor_details' => [
                'resume_aligned' => true, 'portfolio' => 'Portfolio', 'github' => 'example',
                'records' => [
                    'educations' => [['institution' => 'Example university', 'degree' => 'BSc', 'period' => '2020 – 2024', 'courses' => 'Research methods']],
                    'experiences' => [['id' => $experience->id, 'organization' => 'Example Technology', 'job_title' => 'Project Manager', 'period' => '2023-01 – Present', 'responsibilities' => "Delivery planning\nOn time"]],
                    'research' => [['title' => 'Research project', 'period' => 'Summer 2025']],
                    'projects' => [['title' => 'New project', 'organization' => 'Example university', 'period' => 'Summer 2024', 'scope' => 'Delivery', 'team' => 'Four members']],
                    'skill_groups' => [['category' => 'Engineering', 'skills' => 'PHP, SQL']],
                    'awards' => [['source_index' => 0, 'period' => '2024', 'name' => 'Updated award']],
                    'interests' => [['title' => 'Reading', 'description' => 'History']],
                    'languages' => [['name' => 'Bangla', 'proficiency' => 'Native']],
                    'certifications' => [['name' => 'Example certification', 'period' => '2024 – Does not expire', 'details' => 'Details']],
                ],
            ],
        ];
        $this->patch(route('profile.update'), $payload)->assertSessionHasNoErrors();
        $member->refresh();
        $details = $member->profile->editor_details;
        $this->assertSame('Legacy course', $details['records']['courses'][0]['name']);
        $this->assertSame('Retain this detail', $details['records']['awards'][0]['details']);
        $this->assertSame('PMO Lead', $details['career']['target_roles']);
        $this->assertSame('Jira', $details['tools_software']);
        $this->assertSame($private, $member->profile->private_resume_document);
        $this->assertSame('Delivery planning', $experience->fresh()->responsibilities);
        $this->assertSame('On time', $details['records']['experiences'][0]['achievements']);
        $this->assertSame('Summer 2024', $details['records']['projects'][0]['period']);
        $this->assertSame('2024', $member->educations()->firstOrFail()->year);
        $this->assertSame(['PHP', 'SQL'], $member->profile->skills);
        $this->assertSame(['Bangla'], $member->profile->languages);
        $this->assertSame(1, $member->experiences()->count());
        $this->get(route('profile.edit', ['tab' => 'overview']))->assertOk()->assertInertia(fn ($page) => $page
            ->where('profileData.editor_details.records.projects.0.period', 'Summer 2024')
            ->where('profileData.editor_details.records.awards.0.period', '2024'));
        $freshDocument = app(\App\Domain\Identity\Services\ResumeDocument::class)->fromProfile($member->fresh()->loadMissing(['profile', 'educations', 'experiences', 'profileProjects', 'certifications']));
        $this->assertSame('2020 – 2024', $freshDocument['education'][0]['period']);
        $this->assertSame('Summer 2024', $freshDocument['projects'][0]['period']);
    }

    public function test_exact_resume_editor_rejects_hidden_fields_and_foreign_record_ids(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $foreign = $other->experiences()->create(['job_title' => 'Other', 'organization' => 'Private', 'start_date' => '2024-01']);
        $payload = [
            'tab' => 'edit', 'name' => $member->name, 'email' => $member->email, 'phone' => '+880 1712 345678',
            'editor_details' => ['resume_aligned' => true, 'records' => [
                'educations' => [], 'experiences' => [['id' => $foreign->id, 'organization' => 'Changed', 'job_title' => 'Changed']],
                'research' => [], 'projects' => [], 'skill_groups' => [], 'awards' => [], 'interests' => [], 'languages' => [], 'certifications' => [],
            ]],
        ];
        $this->actingAs($member)->patch(route('profile.update'), $payload)->assertNotFound();
        $this->assertSame('Other', $foreign->fresh()->job_title);
        $payload['editor_details']['records']['experiences'] = [];
        $payload['editor_details']['career'] = ['availability' => 'open'];
        $this->patch(route('profile.update'), $payload)->assertSessionHasErrors('editor_details');
    }

}
