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
}
