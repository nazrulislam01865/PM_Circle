<?php

namespace Tests\Feature\Admin;

use App\Models\HomePageContent;
use App\Models\MasterDataOption;
use App\Models\User;
use Database\Seeders\HomePageContentSeeder;
use Database\Seeders\HomepageMasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomepageMasterDataTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['pm-circle.email_verification_required' => false]);
        $this->seed(HomePageContentSeeder::class);
        $this->seed(HomepageMasterDataSeeder::class);
    }

    private function administrator(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    private function payload(): array
    {
        $page = HomePageContent::query()->where('key', 'home')->firstOrFail();
        $content = $page->content;
        unset($content['demo_scenario_engagement']);
        unset($content['scenario']['demo_response_emails'], $content['community']['demo_post_emails'], $content['members']['demo_emails']);
        $content['scenario']['featured_id'] = null;
        $content['community']['featured_ids'] = [];
        $content['members']['featured_ids'] = [];

        return ['version' => (int) $page->revision, 'content' => $content];
    }

    public function test_members_and_guests_cannot_access_admin_catalogs(): void
    {
        $option = MasterDataOption::query()->firstOrFail();
        $this->get('/admin/master-data')->assertRedirect();
        $this->get('/admin/navigation')->assertRedirect();
        $this->actingAs(User::factory()->create());
        $this->get('/admin/master-data')->assertForbidden();
        $this->get('/admin/navigation')->assertForbidden();
        $this->patch("/admin/navigation/{$option->id}", [])->assertForbidden();
    }

    public function test_navigation_control_has_only_header_and_footer_categories(): void
    {
        $this->actingAs($this->administrator());
        $this->get('/admin/navigation')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/MasterData')
            ->where('navigation', true)
            ->where('selectedCategory', 'header_menu')
            ->has('categories', 2)
            ->has('options.header_menu', 6)
            ->has('options.footer_menu', 4)
        );
        $this->get('/admin/navigation?category=skills_icon')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('selectedCategory', 'header_menu')
        );
    }

    public function test_master_data_excludes_icon_uploads_but_preserves_signup_categories(): void
    {
        $this->actingAs($this->administrator());
        $this->get('/admin/master-data')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/MasterData')
            ->where('navigation', false)
            ->has('categories', 5)
        );
        $this->post('/admin/master-data', [
            'category' => 'skills_icon', 'value' => 'custom-image', 'label' => 'Icon',
        ])->assertSessionHasErrors('category');
        $this->get('/admin/homepage')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('masterOptions.skills_icon', 3)
        );
    }

    public function test_editing_header_link_updates_public_navigation(): void
    {
        $this->actingAs($this->administrator());
        $option = MasterDataOption::query()->where('category', 'header_menu')->where('value', '/careers')->firstOrFail();
        $this->patch("/admin/navigation/{$option->id}", [
            'value' => '/discover-pm', 'label' => 'Explore PM', 'sort_order' => 1, 'is_active' => true,
        ])->assertRedirect('/admin/navigation?category=header_menu');
        $this->assertSame('/discover-pm', $option->fresh()->value);
        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('siteNavigation.header.0.href', '/discover-pm')
            ->where('siteNavigation.header.0.label', 'Explore PM')
        );
        $this->seed(HomepageMasterDataSeeder::class);
        $this->assertSame(6, MasterDataOption::query()->where('category', 'header_menu')->count());
        $this->assertDatabaseMissing('master_data_options', ['category' => 'header_menu', 'value' => '/careers']);
    }

    public function test_footer_controls_support_order_and_deactivation(): void
    {
        $this->actingAs($this->administrator());
        $option = MasterDataOption::query()->where('category', 'footer_menu')->where('value', '/community')->firstOrFail();
        $this->patch("/admin/navigation/{$option->id}", [
            'value' => '/community', 'label' => 'Community', 'sort_order' => 2, 'is_active' => true,
        ])->assertRedirect();
        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('siteNavigation.footer.0.href', '/community')
        );
        $this->patch("/admin/navigation/{$option->id}", [
            'value' => '/community', 'label' => 'Community', 'sort_order' => 2, 'is_active' => false,
        ])->assertRedirect();
        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->has('siteNavigation.footer', 3)
        );
    }

    public function test_navigation_rejects_external_admin_and_duplicate_destinations(): void
    {
        $this->actingAs($this->administrator());
        $this->post('/admin/navigation', [
            'category' => 'header_menu', 'value' => 'https://malicious.test', 'label' => 'Outside',
        ])->assertSessionHasErrors('value');
        $this->post('/admin/navigation', [
            'category' => 'footer_menu', 'value' => '/admin', 'label' => 'Admin',
        ])->assertSessionHasErrors('value');
        $menu = MasterDataOption::query()->where('category', 'header_menu')->where('value', '/careers')->firstOrFail();
        $this->patch("/admin/navigation/{$menu->id}", [
            'value' => '/community', 'label' => 'Wrong', 'sort_order' => 10, 'is_active' => true,
        ])->assertSessionHasErrors('value');
        $this->patch("/admin/navigation/{$menu->id}", [
            'value' => 'javascript:alert(1)', 'label' => 'Wrong', 'sort_order' => 10, 'is_active' => true,
        ])->assertSessionHasErrors('value');
    }

    public function test_navigation_and_master_data_cannot_be_mixed(): void
    {
        $this->actingAs($this->administrator());
        $this->post('/admin/navigation', [
            'category' => 'signup_role', 'value' => 'Assistant', 'label' => 'Assistant',
        ])->assertSessionHasErrors('category');
        $this->post('/admin/master-data', [
            'category' => 'header_menu', 'value' => '/about', 'label' => 'About',
        ])->assertSessionHasErrors('category');
    }

    public function test_individual_homepage_icon_upload_works_without_master_data_icons(): void
    {
        Storage::fake('public');
        $this->actingAs($this->administrator());
        $icon = UploadedFile::fake()->createWithContent('skill.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=='));
        $url = $this->postJson('/admin/homepage/images', ['image' => $icon])->assertOk()->json('url');
        $payload = $this->payload();
        $payload['content']['skills']['items'][0]['icon_image'] = $url;
        $this->put('/admin/homepage', $payload)->assertRedirect();
        $this->assertSame($url, HomePageContent::query()->where('key', 'home')->firstOrFail()->content['skills']['items'][0]['icon_image']);
        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('content.skills.items.0.icon_image', $url)
            ->missing('iconAssets')
        );
    }

    public function test_global_master_data_icon_upload_endpoints_are_not_available(): void
    {
        $this->actingAs($this->administrator());
        $oldIcon = MasterDataOption::query()->firstOrFail();
        $this->post("/admin/master-data/{$oldIcon->id}/icon", [])->assertNotFound();
        $this->delete("/admin/master-data/{$oldIcon->id}/icon")->assertNotFound();
    }
}
