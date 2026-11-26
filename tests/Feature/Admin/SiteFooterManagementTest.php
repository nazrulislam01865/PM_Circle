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
        $footer['description'] = 'Our community';
        $footer['columns'] = [
            ['title' => 'Our links', 'visible' => true, 'links' => [['label' => 'Practice', 'href' => '/learning']]],
            ['title' => 'Hidden', 'visible' => false, 'links' => [['label' => 'Privacy', 'href' => '/privacy']]],
        ];
        $footer['socials'] = [['label' => 'Network', 'href' => 'https://example.org/profile', 'icon' => 'globe', 'image' => '']];
        $footer['member_links'] = [['label' => 'Privacy', 'href' => '/privacy']];
        $this->put('/admin/footer', ['footer' => $footer, 'version' => $revision])->assertRedirect('/admin/footer');
        $saved = PmpPublicContent::load();
        $this->assertSame('Our community', $saved['footer']['description']);
        $this->assertSame($footer['columns'], $saved['footer']['columns']);
        $this->assertSame('Network', $saved['footer']['socials'][0]['label']);
        $this->assertSame($footer['member_links'], $saved['footer']['member_links']);
        $this->assertSame($before['hero'], $saved['hero']);
        $this->assertSame($before['plans'], $saved['plans']);
        $this->assertSame($revision + 1, $this->version());
        $footer['description'] = 'Overwritten';
        $this->put('/admin/footer', ['footer' => $footer, 'version' => $revision])->assertSessionHasErrors('version');
        $this->assertSame('Our community', PmpPublicContent::load()['footer']['description']);
    }

    public function test_footer_rejects_unsafe_routes_and_external_social_urls(): void
    {
        $this->actingAs($this->admin());
        $footer = PmpPublicContent::defaults()['footer'];
        foreach (['/admin', '//example.org', 'javascript:alert(1)', '/careers', 'http://example.org'] as $unsafe) {
            $footer['bottom_links'] = [['label' => 'Invalid', 'href' => $unsafe]];
            $this->put('/admin/footer', ['footer' => $footer, 'version' => $this->version()])->assertSessionHasErrors('footer.bottom_links.0.href');
        }
        $footer['bottom_links'] = [];
        $footer['socials'][0]['href'] = 'javascript:alert(1)';
        $this->put('/admin/footer', ['footer' => $footer, 'version' => $this->version()])->assertSessionHasErrors('footer.socials.0.href');
        $this->assertSame(0, HomePageContent::query()->where('key', PmpPublicContent::KEY)->count());
    }

    public function test_all_lists_can_be_removed_and_stay_empty(): void
    {
        $this->actingAs($this->admin());
        $footer = PmpPublicContent::defaults()['footer'];
        $footer['brand_name'] = 'PM Circle Learning';
        $footer['brand_tagline'] = 'Learning community';
        foreach (['columns', 'socials', 'bottom_links', 'member_links'] as $field) {
            $footer[$field] = [];
        }
        $footer['show_member_notice'] = false;
        $this->put('/admin/footer', ['footer' => $footer, 'version' => $this->version()])->assertRedirect('/admin/footer');
        $saved = PmpPublicContent::load()['footer'];
        $this->assertSame('PM Circle Learning', $saved['brand_name']);
        foreach (['columns', 'socials', 'bottom_links', 'member_links'] as $field) {
            $this->assertSame([], $saved[$field]);
        }
        $this->assertFalse($saved['show_member_notice']);
    }

    public function test_footer_rejects_external_logo_and_custom_icon_urls(): void
    {
        $this->actingAs($this->admin());
        $footer = PmpPublicContent::defaults()['footer'];
        $footer['brand_logo'] = 'https://example.org/logo.png';
        $this->put('/admin/footer', ['footer' => $footer, 'version' => $this->version()])->assertSessionHasErrors('footer.brand_logo');
        $footer['brand_logo'] = '';
        $footer['socials'][0]['image'] = 'https://example.org/icon.png';
        $this->put('/admin/footer', ['footer' => $footer, 'version' => $this->version()])->assertSessionHasErrors('footer.socials.0.image');
    }

    public function test_old_navigation_editor_redirects_and_cannot_create_footer_menu_options(): void
    {
        $this->actingAs($this->admin());
        $this->get('/admin/navigation?category=footer_menu')->assertRedirect('/admin/footer');
        $this->get('/admin/exam-simulator/pmp?section=footer')->assertRedirect('/admin/footer');
        $this->post('/admin/navigation', ['category' => 'footer_menu', 'label' => 'Old menu', 'value' => '/about'])->assertSessionHasErrors('category');
    }

    public function test_legacy_footer_brand_and_social_configuration_are_preserved(): void
    {
        $legacy = config('pmp-public.footer');
        $legacy['brand_name'] = 'Existing brand';
        $legacy['social']['facebook'] = 'https://example.org/existing';
        $legacy['show_trends'] = false;
        $footer = PmpPublicContent::withDefaults(['footer' => $legacy])['footer'];
        $this->assertSame('Existing brand', $footer['brand_name']);
        $this->assertSame('https://example.org/existing', $footer['socials'][0]['href']);
        $this->assertNotContains('Trends', array_column($footer['columns'][0]['links'], 'label'));
    }
}
