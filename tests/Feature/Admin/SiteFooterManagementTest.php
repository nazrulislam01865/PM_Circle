<?php

namespace Tests\Feature\Admin;

use App\Models\HomePageContent;
use App\Models\User;
use App\Support\Exam\PmpPublicContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class SiteFooterManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        PmpPublicContent::clearCache();
    }

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true, 'onboarding_step' => 3, 'email_verified_at' => now()]);
    }

    private function version(): int
    {
        return (int) (HomePageContent::query()->where('key', PmpPublicContent::KEY)->value('revision') ?? 0);
    }

    public function test_only_admin_can_edit_the_shared_footer(): void
    {
        $this->get('/admin/footer')->assertRedirect();
        $this->actingAs(User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]))
            ->get('/admin/footer')->assertForbidden();
        $this->actingAs($this->admin())->get('/admin/footer')->assertOk();
    }

    public function test_footer_updates_are_atomic_and_leave_pmp_page_content_intact(): void
    {
        $this->actingAs($this->admin());
        $before = PmpPublicContent::load();
        $revision = $this->version();
        $footer = $before['footer'];
        $footer['about_heading'] = 'Our community';
        $footer['explore_links'] = [['label' => 'Practice', 'href' => '/learning']];
        $footer['payment_methods'] = [['label' => 'Bank Transfer']];
        $footer['social']['linkedin'] = '';

        $this->put('/admin/footer', ['footer' => $footer, 'version' => $revision])->assertRedirect('/admin/footer');
        $saved = PmpPublicContent::load();
        $this->assertSame('Our community', $saved['footer']['about_heading']);
        $this->assertSame('Practice', $saved['footer']['explore_links'][0]['label']);
        $this->assertSame('', $saved['footer']['social']['linkedin']);
        $this->assertSame($before['hero'], $saved['hero']);
        $this->assertSame($before['plans'], $saved['plans']);
        $this->assertSame($revision + 1, $this->version());

        $footer['about_heading'] = 'Overwritten';
        $this->put('/admin/footer', ['footer' => $footer, 'version' => $revision])
            ->assertSessionHasErrors('version');
        $this->assertSame('Our community', PmpPublicContent::load()['footer']['about_heading']);
    }

    public function test_footer_rejects_unsafe_routes_and_external_social_urls(): void
    {
        $this->actingAs($this->admin());
        $footer = PmpPublicContent::defaults()['footer'];
        $footer['legal_links'] = [['label' => 'Settings', 'href' => '/admin']];
        $this->put('/admin/footer', ['footer' => $footer, 'version' => $this->version()])
            ->assertSessionHasErrors('footer.legal_links.0.href');
        $this->assertSame(0, HomePageContent::query()->where('key', PmpPublicContent::KEY)->count());

        $footer = PmpPublicContent::defaults()['footer'];
        $footer['social']['facebook'] = 'javascript:alert(1)';
        $this->put('/admin/footer', ['footer' => $footer, 'version' => $this->version()])
            ->assertSessionHasErrors('footer.social.facebook');
    }

    public function test_footer_brand_payment_logos_and_visibility_settings_can_be_saved_without_changing_other_content(): void
    {
        $this->actingAs($this->admin());
        $before = PmpPublicContent::load();
        $footer = $before['footer'];
        $footer['brand_name'] = 'PM Circle Learning';
        $footer['brand_tagline'] = 'Learning community';
        $footer['show_newsletter'] = false;
        $footer['show_payments'] = false;
        $footer['show_explore'] = false;
        $footer['payment_methods'] = [['label' => 'bKash', 'image' => '']];

        $this->put('/admin/footer', ['footer' => $footer, 'version' => $this->version()])
            ->assertRedirect('/admin/footer');

        $saved = PmpPublicContent::load();
        $this->assertSame('PM Circle Learning', $saved['footer']['brand_name']);
        $this->assertSame('Learning community', $saved['footer']['brand_tagline']);
        $this->assertFalse($saved['footer']['show_newsletter']);
        $this->assertFalse($saved['footer']['show_payments']);
        $this->assertFalse($saved['footer']['show_explore']);
        $this->assertSame('bKash', $saved['footer']['payment_methods'][0]['label']);
        $this->assertSame($before['hero'], $saved['hero']);
    }

    public function test_footer_rejects_external_brand_and_payment_logo_urls(): void
    {
        $this->actingAs($this->admin());
        $footer = PmpPublicContent::defaults()['footer'];
        $footer['brand_logo'] = 'https://example.org/logo.png';
        $this->put('/admin/footer', ['footer' => $footer, 'version' => $this->version()])
            ->assertSessionHasErrors('footer.brand_logo');

        $footer['brand_logo'] = '';
        $footer['payment_methods'][0]['image'] = 'https://example.org/payment.png';
        $this->put('/admin/footer', ['footer' => $footer, 'version' => $this->version()])
            ->assertSessionHasErrors('footer.payment_methods.0.image');
    }

}
