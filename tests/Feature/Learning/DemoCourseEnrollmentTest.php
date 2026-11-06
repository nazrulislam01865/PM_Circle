<?php

namespace Tests\Feature\Learning;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class DemoCourseEnrollmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_visitor_can_browse_courses_and_details_but_cannot_enroll_or_read_lessons(): void
    {
        $this->get('/learning')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('learning/Catalog')
                ->has('courses', 12)->where('isMember', false)
                ->missing('courses.0.price'));

        $this->get('/learning/courses/agile-scrum-fundamentals')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('learning/CourseShow')
                ->where('enrolled', false)->where('course.lessons.0.body', null));
        $this->post('/learning/courses/agile-scrum-fundamentals/enroll')->assertRedirect('/login');
        $this->assertDatabaseCount('learning_demo_course_enrollments', 0);
    }

    public function test_free_member_can_enroll_in_free_demo_course_once_and_read_its_lessons(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $url = '/learning/courses/agile-scrum-fundamentals';

        $this->actingAs($member)->post($url.'/enroll')->assertRedirect($url);
        $this->actingAs($member)->post($url.'/enroll')->assertRedirect($url);
        $this->assertDatabaseCount('learning_demo_course_enrollments', 1);
        $this->actingAs($member)->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('enrolled', true)->where('eligible', true)
            ->where('course.lessons.0.body', 'Explore iterative delivery, feedback loops and the importance of adapting to change.'));
        $this->actingAs($member)->get('/learning')->assertInertia(fn (Assert $page) => $page
            ->where('courses.1.enrolled', true));
    }

    public function test_free_member_cannot_enroll_in_paid_demo_course_or_read_its_lessons(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $url = '/learning/courses/pmp-exam-preparation';

        $this->actingAs($member)->post($url.'/enroll')->assertForbidden();
        $this->actingAs($member)->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('eligible', false)->where('course.lessons.0.body', null));
        $this->assertDatabaseCount('learning_demo_course_enrollments', 0);
    }

    public function test_plus_and_pro_enroll_in_paid_courses_without_any_payment_and_downgrades_relock_content(): void
    {
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        foreach (['plus', 'pro'] as $tier) {
            $member = User::factory()->create(['onboarding_step' => 3]);
            DB::table('temporary_memberships')->insert([
                'user_id' => $member->id, 'plan_code' => $tier,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $url = '/learning/courses/pmp-exam-preparation';

            $this->actingAs($member)->post($url.'/enroll')->assertRedirect($url);
            $this->actingAs($member)->get($url)->assertInertia(fn (Assert $page) => $page
                ->where('memberTier', $tier)->where('enrolled', true)->where('eligible', true)
                ->where('course.lessons.0.body', 'Review the project lifecycle, business value and key responsibilities of a project manager. Compare predictive, agile and hybrid approaches in a sample project.'));

            DB::table('temporary_memberships')->where('user_id', $member->id)->update(['plan_code' => 'free']);
            $this->actingAs($member)->get($url)->assertInertia(fn (Assert $page) => $page
                ->where('enrolled', true)->where('eligible', false)->where('course.lessons.0.body', null));
        }
        $this->assertDatabaseCount('learning_demo_course_enrollments', 2);
        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_active_subscription_grants_paid_course_access_without_a_course_charge(): void
    {
        $this->seed(\Database\Seeders\PlanSeeder::class);
        $member = User::factory()->create(['onboarding_step' => 3]);
        $priceId = DB::table('plan_prices')->join('plans', 'plans.id', '=', 'plan_prices.plan_id')
            ->where('plans.code', 'plus')->value('plan_prices.id');
        DB::table('subscriptions')->insert([
            'user_id' => $member->id, 'plan_price_id' => $priceId, 'status' => 'active',
            'starts_at' => now()->subDay(), 'ends_at' => now()->addMonth(),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $url = '/learning/courses/stakeholder-management';
        $this->actingAs($member)->post($url.'/enroll')->assertRedirect($url);
        $this->actingAs($member)->get($url)->assertInertia(fn (Assert $page) => $page
            ->where('memberTier', 'plus')->where('eligible', true)->where('enrolled', true));
        $this->assertDatabaseCount('learning_demo_course_enrollments', 1);
    }

    public function test_membership_must_be_completed_before_any_enrollment(): void
    {
        $member = User::factory()->create(['onboarding_step' => 1]);
        $this->actingAs($member)->get('/learning')->assertOk();
        $this->actingAs($member)->post('/learning/courses/agile-scrum-fundamentals/enroll')
            ->assertRedirect(route('join.profile'));
        $this->assertDatabaseCount('learning_demo_course_enrollments', 0);
    }

    public function test_course_bookmarks_are_separate_per_member_and_idempotent(): void
    {
        $first = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $url = '/learning/courses/pmp-exam-preparation/save';
        $this->actingAs($first)->post($url)->assertRedirect();
        $this->actingAs($first)->post($url)->assertRedirect();
        $this->assertDatabaseCount('learning_demo_course_saves', 1);
        $this->actingAs($first)->get('/learning')->assertInertia(fn (Assert $page) => $page->where('courses.0.saved', true));
        $this->actingAs($other)->get('/learning')->assertInertia(fn (Assert $page) => $page->where('courses.0.saved', false));
        $this->actingAs($first)->delete($url)->assertRedirect();
        $this->assertDatabaseCount('learning_demo_course_saves', 0);
    }

    public function test_unknown_course_cannot_be_enrolled_or_bookmarked(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->get('/learning/courses/not-an-actual-course')->assertNotFound();
        $this->actingAs($member)->post('/learning/courses/not-an-actual-course/enroll')->assertNotFound();
        $this->actingAs($member)->post('/learning/courses/not-an-actual-course/save')->assertNotFound();
    }
}
