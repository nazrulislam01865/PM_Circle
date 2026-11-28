<?php

namespace Tests\Feature\Settings;

use App\Domain\Identity\Services\ProfileCompleteness;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ProfileCoverageTest extends TestCase
{
    use RefreshDatabase;

    public function test_display_progress_drops_after_deleting_current_profile_data_without_changing_reward_rules(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $member->profile()->create([
            'headline' => 'Project manager', 'role' => 'Manager', 'industry' => 'IT',
            'country' => 'Bangladesh', 'city' => 'Dhaka', 'about' => 'Project delivery',
            'avatar_path' => 'avatar.png', 'phone' => '+8801712345678', 'linkedin_url' => 'https://www.linkedin.com/in/example',
            'skills' => ['Agile'], 'languages' => ['Bangla'],
            'editor_details' => ['portfolio' => 'Portfolio', 'github' => 'example', 'records' => [
                'research' => [['title' => 'Research']], 'awards' => [['name' => 'Award']],
                'interests' => [['title' => 'Reading']],
            ]],
        ]);
        $member->experiences()->create(['job_title' => 'Manager', 'organization' => 'Example', 'employment_type' => 'Full-time', 'start_date' => '2020-01-01']);
        $education = $member->educations()->create(['degree' => 'BSc', 'institution' => 'University']);
        $member->profileProjects()->create(['title' => 'Project', 'summary' => 'Scope', 'role' => 'Lead', 'team_size' => 1, 'delivery_months' => 1]);
        $member->certifications()->create(['name' => 'Certification']);
        $service = app(ProfileCompleteness::class);

        $this->assertSame(['profile' => 100, 'core' => 100, 'missing' => []], $service->scores($member->fresh()));
        $this->actingAs($member)->delete(route('profile.educations.delete', $education))->assertRedirect();
        $this->assertSame(['profile' => 92, 'core' => 100, 'missing' => ['Education']], $service->scores($member->fresh()));
        $this->get(route('profile.edit', ['tab' => 'edit']))->assertOk()->assertInertia(fn ($page) => $page->where('profileData.completeness', 92));
        $this->get(route('dashboard'))->assertOk()->assertInertia(fn ($page) => $page->where('dashboard.member.completion', 92));

        // The same PATCH used by the active editor clears a counted field and optional research.
        $member->refresh();
        $payload = [
            'tab' => 'edit', 'name' => $member->name, 'email' => $member->email,
            'phone' => '+8801712345678', 'headline' => '', 'role' => 'Manager',
            'about' => 'Project delivery', 'linkedin_url' => 'https://www.linkedin.com/in/example',
            'editor_details' => [
                'resume_aligned' => true, 'portfolio' => 'Portfolio', 'github' => 'example',
                'records' => [
                    'educations' => [],
                    'experiences' => [['id' => $member->experiences()->firstOrFail()->id, 'organization' => 'Example', 'job_title' => 'Manager', 'period' => '2020-01-01']],
                    'projects' => [['id' => $member->profileProjects()->firstOrFail()->id, 'title' => 'Project', 'scope' => 'Scope']],
                    'skill_groups' => [['category' => 'Skills', 'skills' => 'Agile']],
                    'research' => [], 'awards' => [['name' => 'Award']], 'interests' => [['title' => 'Reading']],
                    'languages' => [['name' => 'Bangla']],
                    'certifications' => [['id' => $member->certifications()->firstOrFail()->id, 'name' => 'Certification']],
                ],
            ],
        ];
        $this->patch(route('profile.update'), $payload)->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame(['profile' => 84, 'core' => 90, 'missing' => ['Professional headline', 'Education']], $service->scores($member->fresh()));
        $this->get(route('profile.edit', ['tab' => 'edit']))->assertOk()->assertInertia(fn ($page) => $page->where('profileData.completeness', 84));
        $this->get(route('dashboard'))->assertOk()->assertInertia(fn ($page) => $page->where('dashboard.member.completion', 84));

        $member->profile()->update(['skills' => []]);
        $this->assertSame(['profile' => 76, 'core' => 80, 'missing' => ['Professional headline', 'Skills', 'Education']], $service->scores($member->fresh()));
        // Restore the fields through the actual editor request, not direct database writes.
        // Leave optional extras blank: a professional profile can still be complete.
        $payload['headline'] = 'Project manager';
        $payload['linkedin_url'] = null;
        $payload['editor_details']['portfolio'] = null;
        $payload['editor_details']['github'] = null;
        $payload['editor_details']['records']['awards'] = [];
        $payload['editor_details']['records']['interests'] = [];
        $payload['editor_details']['records']['educations'] = [['degree' => 'BSc', 'institution' => 'University']];
        $member->profile()->update(['avatar_path' => null]);
        $this->patch(route('profile.update'), $payload)->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame(['profile' => 100, 'core' => 90, 'missing' => []], $service->scores($member->fresh()));
        $this->get(route('profile.edit', ['tab' => 'edit']))->assertOk()->assertInertia(fn ($page) => $page->where('profileData.completeness', 100)->where('profileData.completion_missing', []));
        $this->get(route('dashboard'))->assertOk()->assertInertia(fn ($page) => $page->where('dashboard.member.completion', 100));
    }
}
