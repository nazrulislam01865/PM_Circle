<?php

namespace Tests\Feature\Billing;

use App\Domain\Billing\Queries\MemberFeatureAccess;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class PlanAccessCriteriaTest extends TestCase
{
    use RefreshDatabase;

    public function test_course_and_interview_access_matrix(): void
    {
        $access = new MemberFeatureAccess;
        foreach (['free', 'plus', 'pro'] as $rank => $plan) {
            $this->assertTrue(MemberFeatureAccess::allowsCourse($plan, 'free'));
            $this->assertSame($rank >= 1, MemberFeatureAccess::allowsCourse($plan, 'paid'));
            $this->assertSame($rank === 2, MemberFeatureAccess::allowsCourse($plan, 'pro'));
            $this->assertTrue($access->forPlan($plan)['resume']);
            $this->assertSame($rank >= 1, MemberFeatureAccess::allowsAi($plan, 'resume_rewrite', 'plus'));
            $this->assertSame($rank === 2, MemberFeatureAccess::allowsAi($plan, 'resume_analyze', 'pro'));
            $this->assertSame([[], [5, 10], [5, 10, 20]][$rank], MemberFeatureAccess::interviewCounts($plan));
        }
    }

    public function test_free_member_is_denied_paid_endpoints_but_can_review_interviews(): void
    {
        $this->withoutVite();
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->get('/activity-log')->assertForbidden();
        $this->get('/dashboard/features/achievements')->assertForbidden();
        $this->get('/dashboard/features/insights')->assertForbidden();
        $this->get('/events/create')->assertForbidden();
        $this->get('/events/host/1/registrants')->assertForbidden();
        $this->postJson('/interview-preparation/preview', [])->assertForbidden();
        $this->get('/interview-preparation/results')->assertOk();
        $this->get('/dashboard/resume-assistant')->assertOk();
        $this->get('/exams/pmp')->assertRedirect('/exam-simulator/pmp/details');
        $this->getJson('/exams/pmp/start-options')->assertForbidden();
    }
}
