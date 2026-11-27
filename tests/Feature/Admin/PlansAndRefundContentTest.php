<?php

namespace Tests\Feature\Admin;

use App\Models\Plan;
use App\Models\User;
use App\Support\Admin\PublicPageContent;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class PlansAndRefundContentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        PublicPageContent::clear('compare-plans');
        PublicPageContent::clear('refund-policy');
    }

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true, 'status' => 'active', 'email_verified_at' => now(), 'onboarding_step' => 3]);
    }

    public function test_public_pages_keep_defaults_and_admin_routes_require_permission(): void
    {
        $this->seed(PlanSeeder::class);
        $this->get('/pricing')->assertInertia(fn (Assert $page) => $page->component('public/Pricing')->where('content.banner.currentLabel', 'Compare plans')->has('content.community.rows', 7)->where('plans.1.code', 'plus'));
        $this->get('/refund-policy')->assertInertia(fn (Assert $page) => $page->component('public/PolicyNotice')->where('content.banner.title', 'Refund Policy')->where('content.consumer-rights.paragraphs.0.href', '/terms'));
        foreach (['compare-plans', 'refund-policy'] as $page) $this->get('/admin/public-pages/'.$page)->assertRedirect();
        $this->actingAs(User::factory()->create(['is_admin' => false, 'status' => 'active', 'email_verified_at' => now(), 'onboarding_step' => 3]));
        foreach (['compare-plans', 'refund-policy'] as $page) {
            $this->get('/admin/public-pages/'.$page)->assertForbidden();
            $this->put('/admin/public-pages/'.$page.'/banner', [])->assertForbidden();
        }
    }

    public function test_comparison_sections_save_independently_without_mutating_catalogue(): void
    {
        $this->seed(PlanSeeder::class);
        $this->actingAs($this->admin());
        $price = Plan::where('code', 'plus')->firstOrFail()->prices()->where('months', 1)->firstOrFail();
        $section = PublicPageContent::defaults('compare-plans')['community'];
        $section['rows'] = [['label' => 'Updated feature', 'icon' => 'FileText', 'free' => 'Not included', 'plus' => 'Included', 'pro' => 'Unlimited']];
        $this->get('/admin/public-pages/compare-plans?section=community')->assertInertia(fn (Assert $page) => $page->where('section', 'community')->where('version', 0));
        $this->get('/pricing')->assertOk(); // Warm the existing content cache.
        $this->put('/admin/public-pages/compare-plans/community', ['version' => 0, 'content' => $section])->assertRedirect()->assertSessionHasNoErrors();
        $this->get('/pricing')->assertInertia(fn (Assert $page) => $page->where('content.community.rows.0.label', 'Updated feature')->has('content.community.rows', 1)->has('content.learning.rows', 5));
        $this->assertSame($price->amount_minor, $price->fresh()->amount_minor);
        $this->put('/admin/public-pages/compare-plans/community', ['version' => 0, 'content' => $section])->assertSessionHasErrors('version');
        $section['rows'][0]['icon'] = 'UnknownIcon';
        $this->put('/admin/public-pages/compare-plans/community', ['version' => 1, 'content' => $section])->assertSessionHasErrors('content.rows.0.icon');
    }

    public function test_refund_sections_preserve_anchors_and_validate_inline_links(): void
    {
        $this->actingAs($this->admin());
        $section = PublicPageContent::defaults('refund-policy')['cancel-your-plan'];
        $section['title'] = 'Updated cancellation policy';
        $section['paragraphs'] = [['text' => 'Please contact support.', 'linkLabel' => 'contact support', 'href' => '/contact']];
        $this->put('/admin/public-pages/refund-policy/cancel-your-plan', ['version' => 0, 'content' => $section])->assertRedirect()->assertSessionHasNoErrors();
        $this->get('/refund-policy')->assertInertia(fn (Assert $page) => $page->where('content.cancel-your-plan.title', 'Updated cancellation policy')->where('content.cancel-your-plan.paragraphs.0.href', '/contact')->where('content.consumer-rights.title', 'Consumer rights'));
        $section['paragraphs'][0]['href'] = 'javascript:alert(1)';
        $this->put('/admin/public-pages/refund-policy/cancel-your-plan', ['version' => 1, 'content' => $section])->assertSessionHasErrors('content.paragraphs.0.href');
        $section['paragraphs'][0]['href'] = '/contact';
        $section['paragraphs'][0]['linkLabel'] = 'missing phrase';
        $this->put('/admin/public-pages/refund-policy/cancel-your-plan', ['version' => 1, 'content' => $section])->assertSessionHasErrors('content.paragraphs.0.linkLabel');
        $section['paragraphs'] = [];
        $this->put('/admin/public-pages/refund-policy/cancel-your-plan', ['version' => 1, 'content' => $section])->assertSessionHasErrors('content.paragraphs');
    }
}
