<?php

namespace Tests\Feature\Account;

use App\Domain\AI\Services\AiCreditService;
use App\Domain\Billing\Queries\MemberFeatureAccess;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

final class MemberWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        config()->set('pm-ai.allow_demo_credit_grants', true);
    }

    private function member(): User { return User::factory()->create(['onboarding_step' => 3]); }

    private function grantPlan(User $member, string $plan): void
    {
        DB::table('temporary_memberships')->updateOrInsert(['user_id' => $member->id], ['plan_code' => $plan, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_premium_locks_and_direct_resume_api_follow_the_existing_plan_catalog(): void
    {
        $member = $this->member();
        $this->actingAs($member);
        foreach (['free', 'plus'] as $plan) {
            $this->grantPlan($member, $plan);
            $this->get('/membership')->assertOk()->assertInertia(fn ($page) => $page->component('billing/PlanUsage')
                ->where('access.pmp', $plan === 'plus')->where('access.resume', true));
            $this->get('/dashboard/resume-assistant')->assertOk();
            $this->postJson('/ai/requests', ['feature' => 'resume_analyze', 'client_request_key' => (string) Str::uuid(), 'accepted_max_credits' => 0])->assertForbidden()->assertJsonPath('code', 'NOT_ENTITLED');
            $plan === 'free' ? $this->getJson('/ai/resume-drafts')->assertForbidden() : $this->getJson('/ai/resume-drafts')->assertOk();
        }
        $this->grantPlan($member, 'free');
        $this->get('/exams/pmp')->assertRedirect('/exam-simulator/pmp/details');
        $this->grantPlan($member, 'pro');
        $this->get('/membership')->assertOk()->assertInertia(fn ($page) => $page->where('access.pmp', true)->where('access.resume', true));
        $this->get('/dashboard/resume-assistant')->assertOk()->assertInertia(fn ($page) => $page->component('account/ResumeAssistant')->where('resumes', []));
        $this->get('/membership?view=plans')->assertOk()->assertInertia(fn ($page) => $page->component('billing/Membership'));
        $this->assertFalse(MemberFeatureAccess::allowsAi('pro', 'trend_draft', 'free'));
    }

    public function test_entire_exam_simulator_group_has_shared_membership_access(): void
    {
        $this->get('/simulators/scrum')->assertOk()->assertInertia(fn ($page) => $page->component('public/ComingSoon'));
        $member = $this->member();
        $this->actingAs($member);
        foreach (['free', 'plus', 'pro'] as $plan) {
            $this->grantPlan($member, $plan);
            $allowed = $plan !== 'free';
            $this->assertSame($allowed, MemberFeatureAccess::allowsExamSimulator($plan));
            $this->get('/membership')->assertOk()->assertInertia(fn ($page) => $page->where('access.examSimulator', $allowed));
            $this->get('/simulators/scrum')->assertRedirect('/exams/scrum');
            $this->get('/dashboard/features/scrum')->assertRedirect('/exams/scrum');
            $scrum = $this->get('/exams/scrum');
            if ($allowed) {
                $scrum->assertOk()->assertInertia(fn ($page) => $page->component('public/ComingSoon'));
            } else {
                $scrum->assertForbidden();
                $this->get('/exams/pmp')->assertRedirect('/exam-simulator/pmp/details');
                $this->getJson('/exams/pmp/start-options')->assertForbidden();
                $this->getJson('/exams/pmp/ai-usage')->assertForbidden();
            }
        }
    }

    public function test_plan_usage_has_actual_quota_credits_and_member_scoped_usage(): void
    {
        $member = $this->member(); $other = $this->member();
        $this->grantPlan($member, 'plus');
        DB::table('ai_chat_limit_policies')->insert(['version' => 1, 'plan_code' => 'plus', 'feature_scope' => 'feature:pmp', 'max_daily' => 5, 'max_cycle' => 40, 'max_per_conversation' => 10, 'max_concurrent' => 3, 'max_cycle_tokens' => 80000, 'enabled' => true, 'active_from_utc' => now()->subDay(), 'created_at' => now(), 'updated_at' => now()]);
        config()->set('pm-ai.hard_pmp_cycle_tokens', 100000);
        $start = now('Asia/Dhaka')->startOfMonth()->utc();
        DB::table('ai_chat_usage_buckets')->insert(['user_id' => $member->id, 'scope_key' => 'feature:pmp', 'window_kind' => 'cycle', 'window_start_utc' => $start, 'window_end_utc' => now('Asia/Dhaka')->startOfMonth()->addMonth()->utc(), 'used_tokens' => 123, 'reserved_tokens' => 7]);
        app(AiCreditService::class)->grant($member->id, 'test', 'workspace', 30);
        foreach ([$member, $other] as $owner) DB::table('ai_requests')->insert(['request_uuid' => (string) Str::uuid(), 'user_id' => $owner->id, 'feature_code' => 'pmp_explain', 'model' => 'gpt-5-nano', 'status' => 'completed', 'payload_encrypted' => 'test', 'input_tokens' => 100, 'output_tokens' => 23, 'completed_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $this->actingAs($member)->get('/membership')->assertOk()->assertInertia(fn ($page) => $page->component('billing/PlanUsage')
            ->where('tokens.allocated', 80000)->where('tokens.used', 123)->where('tokens.remaining', 79870)->where('credits.available', 30)->where('usage.0.tokens', 123)->where('usage.0.requests', 1));
    }

    public function test_home_plan_cards_use_actual_access_and_token_balance_without_granting_tokens(): void
    {
        $member = $this->member();
        $this->actingAs($member);
        $this->grantPlan($member, 'free');
        $this->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page->component('account/Dashboard')
            ->where('dashboard.planUsage.plan', 'free')->where('dashboard.planUsage.examAccess', false)
            ->where('dashboard.planUsage.tokensRemaining', null));
        $this->assertDatabaseMissing('ai_chat_usage_buckets', ['user_id' => $member->id]);
        $this->get('/exams/pmp/enter')->assertRedirect(route('pricing'));
        config()->set('pm-circle.demo_content_enabled', true);
        $this->get('/dashboard?demo_plan=pro')->assertOk()->assertInertia(fn ($page) => $page
            ->where('dashboard.plan', 'pro')->where('dashboard.planUsage.plan', 'free')
            ->where('dashboard.planUsage.examAccess', false)->where('dashboard.planUsage.tokensRemaining', null));

        $this->grantPlan($member, 'plus');
        DB::table('ai_chat_limit_policies')->where('plan_code', 'plus')->where('feature_scope', 'feature:pmp')->delete();
        $this->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page
            ->where('dashboard.planUsage.plan', 'plus')->where('dashboard.planUsage.examAccess', true)
            ->where('dashboard.planUsage.tokensRemaining', null));
        DB::table('ai_chat_limit_policies')->insert(['version' => 1, 'plan_code' => 'plus', 'feature_scope' => 'feature:pmp', 'max_daily' => 5, 'max_cycle' => 40, 'max_per_conversation' => 10, 'max_concurrent' => 3, 'max_cycle_tokens' => 80000, 'enabled' => true, 'active_from_utc' => now()->subDay(), 'created_at' => now(), 'updated_at' => now()]);
        config()->set('pm-ai.hard_pmp_cycle_tokens', 100000);
        $start = now('Asia/Dhaka')->startOfMonth()->utc();
        DB::table('ai_chat_usage_buckets')->insert(['user_id' => $member->id, 'scope_key' => 'feature:pmp', 'window_kind' => 'cycle', 'window_start_utc' => $start, 'window_end_utc' => now('Asia/Dhaka')->startOfMonth()->addMonth()->utc(), 'used_tokens' => 123, 'reserved_tokens' => 7]);
        $this->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page
            ->where('dashboard.planUsage.tokensRemaining', 79870));
        $this->get('/membership')->assertOk()->assertInertia(fn ($page) => $page->where('tokens.remaining', 79870));
        $this->get('/exams/pmp/enter')->assertRedirect('/exams/pmp');
        DB::table('ai_chat_usage_buckets')->where('user_id', $member->id)->update(['used_tokens' => 80000, 'reserved_tokens' => 0]);
        $this->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page->where('dashboard.planUsage.tokensRemaining', 0));
        $this->grantPlan($member, 'pro');
        $this->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page
            ->where('dashboard.planUsage.plan', 'pro')->where('dashboard.planUsage.examAccess', true));
    }

    public function test_support_requests_are_persistent_private_and_have_staff_replies(): void
    {
        Storage::fake('local');
        $member = $this->member(); $other = $this->member(); $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($member)->get('/help-center')->assertRedirect('/help-center/guides');
        $this->get('/help-center/guides')->assertOk()->assertInertia(fn ($page) => $page->component('support/HelpCentre'));
        $data = ['topic' => 'Account & profile', 'subject' => 'Profile update', 'details' => 'Unable to save my profile.', 'submission_key' => (string) Str::uuid()];
        $this->post('/help-center/requests', [...$data, 'screenshot' => UploadedFile::fake()->image('issue.png')])->assertRedirect();
        $ticket = DB::table('support_requests')->where('user_id', $member->id)->first();
        Storage::disk('local')->assertExists($ticket->screenshot_path);
        $this->post('/help-center/requests', $data)->assertRedirect('/help-center/requests/'.$ticket->id);
        $this->assertDatabaseCount('support_requests', 1);
        $this->get('/help-center/requests/'.$ticket->id.'/screenshot')->assertOk();
        $this->actingAs($other)->get('/help-center/requests/'.$ticket->id)->assertNotFound();
        $this->get('/help-center/requests/'.$ticket->id.'/screenshot')->assertNotFound();
        $this->post('/admin/support-requests/'.$ticket->id, ['status' => 'resolved'])->assertForbidden();
        $reply = ['status' => 'resolved', 'body' => 'Please try again.', 'submission_key' => (string) Str::uuid()];
        $this->actingAs($admin)->post('/admin/support-requests/'.$ticket->id, $reply)->assertRedirect();
        $this->post('/admin/support-requests/'.$ticket->id, $reply)->assertRedirect();
        $this->assertDatabaseCount('support_request_replies', 1);
        $this->actingAs($member)->get('/help-center/requests/'.$ticket->id)->assertOk()->assertInertia(fn ($page) => $page->component('support/RequestDetails')->where('ticket.status', 'resolved')->where('replies.data.0.body', 'Please try again.')->missing('ticket.screenshot_path'));
    }
}
