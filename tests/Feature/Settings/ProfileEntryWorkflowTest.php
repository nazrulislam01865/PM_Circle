<?php

namespace Tests\Feature\Settings;

use App\Models\Education;
use App\Models\Experience;
use App\Models\ProfileProject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileEntryWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_edit_page_shows_real_counts_and_not_sample_entries(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get(route('profile.edit', ['tab' => 'edit']))
            ->assertOk()->assertInertia(fn ($page) => $page
                ->component('settings/profile')
                ->has('profileData.experiences', 0)
                ->has('profileData.projects', 0)
                ->has('profileData.educations', 0)
                ->has('profileData.certifications', 0)
                ->where('profileData.featured_project', null));
    }

    public function test_project_can_be_saved_updated_and_removed_and_featured_is_unique(): void
    {
        $user = User::factory()->create();
        $data = ['title' => 'Portal launch', 'summary' => 'A private case study', 'role' => 'Lead',
            'team_size' => 5, 'delivery_months' => 8, 'is_featured' => true, 'is_anonymized' => true];

        $this->actingAs($user)->post(route('profile.projects.save'), $data)->assertSessionHasNoErrors();
        $first = $user->profileProjects()->firstOrFail();
        $this->assertTrue($first->is_featured);
        $this->actingAs($user)->post(route('profile.projects.save'), [...$data, 'title' => 'New launch'])
            ->assertSessionHasNoErrors();
        $this->assertSame(1, $user->profileProjects()->where('is_featured', true)->count());

        $this->actingAs($user)->post(route('profile.projects.save'), [...$data, 'id' => $first->id,
            'title' => 'Edited launch', 'is_featured' => false])->assertSessionHasNoErrors();
        $this->assertSame('Edited launch', $first->fresh()->title);
        $this->actingAs($user)->delete(route('profile.projects.delete', $first))->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('profile_projects', ['id' => $first->id]);
    }

    public function test_education_and_certification_are_persisted_and_self_reported(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post(route('profile.educations.save'), [
            'degree' => 'BSc in Computing', 'institution' => 'Test University', 'year' => '2021',
        ])->assertSessionHasNoErrors();
        $this->actingAs($user)->post(route('profile.certifications.save'), [
            'name' => 'PMP', 'credential_number' => 'PMP-123', 'valid_until' => '2028',
        ])->assertSessionHasNoErrors();
        $this->assertSame('Test University', $user->educations()->firstOrFail()->institution);
        $this->assertFalse((bool) $user->certifications()->firstOrFail()->verified);
        $this->assertSame('2028', $user->certifications()->firstOrFail()->valid_until);
    }

    public function test_member_cannot_edit_or_delete_another_members_entries(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $project = ProfileProject::create(['user_id' => $owner->id, 'title' => 'Private',
            'is_featured' => false, 'is_anonymized' => true]);
        $education = Education::create(['user_id' => $owner->id, 'degree' => 'BA', 'institution' => 'Private College']);
        $cert = $owner->certifications()->create(['name' => 'Private credential']);
        $experience = Experience::create(['user_id' => $owner->id, 'job_title' => 'PM',
            'organization' => 'Private', 'employment_type' => 'Contract', 'start_date' => '2020']);

        $this->actingAs($other)->post(route('profile.projects.save'), ['id' => $project->id, 'title' => 'Hijacked',
            'is_featured' => false, 'is_anonymized' => true])->assertNotFound();
        $this->actingAs($other)->delete(route('profile.projects.delete', $project))->assertForbidden();
        $this->actingAs($other)->delete(route('profile.educations.delete', $education))->assertForbidden();
        $this->actingAs($other)->delete(route('profile.certifications.delete', $cert))->assertForbidden();
        $this->actingAs($other)->delete(route('profile.experiences.delete', $experience))->assertForbidden();
        $this->assertSame('Private', $project->fresh()->title);
    }

    public function test_partial_career_and_link_updates_do_not_require_reposting_email_and_name(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->patch(route('profile.update'), [
            'open_to_opportunities' => false,
            'linkedin_url' => 'https://www.linkedin.com/in/example',
            'languages' => ['English', 'Bangla'],
            'tab' => 'edit',
        ])->assertSessionHasNoErrors()->assertRedirect(route('profile.edit', ['tab' => 'edit']));

        $this->assertFalse($user->fresh()->profile->open_to_opportunities);
        $this->assertSame(['English', 'Bangla'], $user->fresh()->profile->languages);
        $this->assertSame('https://www.linkedin.com/in/example', $user->fresh()->profile->linkedin_url);
        $this->assertSame($user->email, $user->fresh()->email);
    }

    public function test_entry_validation_rejects_blank_titles_and_untrusted_certification_flags(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post(route('profile.projects.save'), [
            'title' => '', 'is_featured' => true, 'is_anonymized' => true,
        ])->assertSessionHasErrors('title');
        $this->actingAs($user)->post(route('profile.certifications.save'), [
            'name' => 'Member certification', 'verified' => true,
        ])->assertSessionHasNoErrors();
        $this->assertFalse((bool) $user->certifications()->firstOrFail()->verified);
    }
}
