<?php

namespace Tests\Feature\Dashboard;

use App\Models\User;
use Database\Seeders\DemoScenarioSeeder;
use Database\Seeders\LearningDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class MemberSectionRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_sections_require_auth_and_completed_onboarding(): void
    {
        $this->get('/dashboard/learning')->assertRedirect('/login');
        $this->get('/dashboard/daily-challenge')->assertRedirect('/login');
        $this->get('/dashboard/learning/courses/agile-scrum-fundamentals')->assertRedirect('/login');
        $this->get('/dashboard/daily-challenge/example')->assertRedirect('/login');

        $incomplete = User::factory()->create(['onboarding_step' => 1]);
        $this->actingAs($incomplete)->get('/dashboard/learning')->assertRedirect(route('join.profile'));
        $this->actingAs($incomplete)->get('/dashboard/daily-challenge')->assertRedirect(route('join.profile'));
    }

    public function test_learning_catalog_reuses_public_content_projection_inside_the_member_shell(): void
    {
        $this->seed(LearningDemoSeeder::class);

        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->get('/dashboard/learning')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('learning/Catalog')
                ->has('courses', 12)->has('paths', 5)
                ->where('isMember', true)
                ->where('memberShell.member.name', $member->name)
                ->etc());

        $this->get('/learning')->assertOk()->assertInertia(
            fn (Assert $page) => $page->component('learning/Catalog')->has('courses', 12)
        );
    }

    public function test_member_course_enrollment_returns_to_member_details_without_changing_public_redirects(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $url = '/dashboard/learning/courses/agile-scrum-fundamentals';

        $this->actingAs($member)->post($url.'/enroll')->assertRedirect($url);
        $this->actingAs($member)->post($url.'/enroll')->assertRedirect($url);
        $this->assertDatabaseCount('learning_demo_course_enrollments', 1);
        $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('learning/CourseShow')->where('enrolled', true)->where('eligible', true)
            ->has('memberShell')->etc());
        $this->post('/learning/courses/agile-scrum-fundamentals/enroll')
            ->assertRedirect('/learning/courses/agile-scrum-fundamentals');
        $this->assertDatabaseCount('learning_demo_course_enrollments', 1);
    }

    public function test_scenarios_share_public_filters_and_detail_data_without_loading_dashboard_feed(): void
    {
        $this->seed(DemoScenarioSeeder::class);
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->get('/dashboard/daily-challenge')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('scenarios/Index')
                ->has('scenarios.data', 4)->where('canInteract', true)
                ->has('memberShell')->missing('dashboard.posts')->etc());

        $slug = 'a-late-change-a-fixed-deadline';
        $this->get('/dashboard/daily-challenge/'.$slug)->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('scenarios/Show')
                ->where('scenario.slug', $slug)->has('memberShell')->etc());
        $this->get('/daily-challenge')->assertOk()->assertInertia(
            fn (Assert $page) => $page->component('scenarios/Index')->has('scenarios.data', 4)
        );
    }

    public function test_member_learning_and_challenge_filter_validation_stays_bounded(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->get('/dashboard/daily-challenge?tab=invalid')->assertSessionHasErrors('tab');
        $this->get('/dashboard/daily-challenge?search='.str_repeat('X', 81))->assertSessionHasErrors('search');
        $this->get('/dashboard/learning/courses/not-real')->assertNotFound();
    }
}
