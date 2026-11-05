<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get(route('profile.edit'));

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete(route('profile.destroy'), [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('home'));

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_correct_password_must_be_provided_to_delete_account()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from(route('profile.edit'))
            ->delete(route('profile.destroy'), [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->fresh());
    }

    public function test_profile_tabs_render_properly()
    {
        $user = User::factory()->create();

        foreach (['overview', 'edit', 'imports', 'privacy'] as $tab) {
            $response = $this->actingAs($user)->get(route('profile.edit', ['tab' => $tab]));
            $response->assertOk();
            $response->assertInertia(fn ($page) => $page->component('settings/profile')->where('activeTab', $tab));
        }
    }

    public function test_profile_extended_fields_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patch(route('profile.update'), [
            'name' => 'Sara Ahmed Updated',
            'email' => $user->email,
            'headline' => 'Senior Project Manager',
            'role' => 'Project Manager',
            'industry' => 'Fintech',
            'country' => 'Bangladesh',
            'city' => 'Dhaka',
            'about' => 'Passionate about agile product delivery.',
            'skills' => ['Scrum', 'Risk Management'],
            'open_to_opportunities' => true,
            'visibility' => 'members_only',
        ]);

        $response->assertSessionHasNoErrors();
        $user->refresh();
        $this->assertSame('Sara Ahmed Updated', $user->name);
        $this->assertSame('Senior Project Manager', $user->profile->headline);
        $this->assertSame(['Scrum', 'Risk Management'], $user->profile->skills);
    }

    public function test_experience_can_be_created_and_deleted()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('profile.experiences.save'), [
            'job_title' => 'Project Manager',
            'organization' => 'Northstar Digital',
            'employment_type' => 'Full-time',
            'start_date' => 'Jan 2022',
            'is_current' => true,
            'responsibilities' => 'Managed sprint cycles and squad alignment.',
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect(route('profile.edit', ['tab' => 'edit']));

        $experience = $user->experiences()->first();
        $this->assertNotNull($experience);
        $this->assertSame('Northstar Digital', $experience->organization);

        $deleteResponse = $this->actingAs($user)->delete(route('profile.experiences.delete', $experience));
        $deleteResponse->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('experiences', ['id' => $experience->id]);
    }

    public function test_import_apply_updates_headline_and_skills()
    {
        $user = User::factory()->create();
        $user->profile()->create(['headline' => 'Current headline', 'skills' => ['Scrum']]);
        $import = $user->importSessions()->create([
            'source_filename' => 'uploaded-resume.pdf',
            'status' => 'ready',
            'extracted_data' => ['fields' => [
                'headline' => 'Lead Project Manager | Agile & Digital Transformation',
                'skills' => ['Scrum', 'Jira Advanced Roadmaps'],
            ]],
        ]);

        $response = $this->actingAs($user)->post(route('profile.import.apply'), [
            'import_id' => $import->id,
            'decisions' => ['headline' => 'replace', 'skills' => 'merge'],
        ]);

        $response->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit', ['tab' => 'overview']));

        $user->refresh();
        $this->assertSame('Lead Project Manager | Agile & Digital Transformation', $user->profile->headline);
        $this->assertSame(['Scrum', 'Jira Advanced Roadmaps'], $user->profile->skills);
        $this->assertSame('applied', $import->fresh()->status);
    }

    public function test_legacy_import_payload_does_not_apply_profile_updates()
    {
        $user = User::factory()->create();
        $user->profile()->create(['headline' => 'Keep original headline', 'skills' => ['Scrum']]);

        $this->actingAs($user)->post(route('profile.import.apply'), [
            'updates' => ['headline', 'skills_add'],
        ])->assertSessionHasErrors(['import_id', 'decisions']);

        $this->assertSame('Keep original headline', $user->fresh()->profile->headline);
        $this->assertSame(['Scrum'], $user->fresh()->profile->skills);
    }
}
