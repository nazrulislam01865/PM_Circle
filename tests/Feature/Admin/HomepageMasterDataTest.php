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
use Illuminate\Support\Facades\Cache;
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
        $user = User::factory()->create();
        $user->forceFill(['is_admin' => true])->save();

        return $user;
    }

    public function test_regular_members_and_guests_cannot_manage_master_data(): void
    {
        $option = MasterDataOption::query()->firstOrFail();
        $this->get('/admin/master-data')->assertRedirect();
        $this->post('/admin/master-data', [])->assertRedirect();
        $this->actingAs(User::factory()->create());
        $this->get('/admin/master-data')->assertForbidden();
        $this->get('/admin/navigation')->assertForbidden();
        $this->post('/admin/master-data', [])->assertForbidden();
        $this->post('/admin/navigation', [])->assertForbidden();
        $this->patch("/admin/master-data/{$option->id}", [])->assertForbidden();
        $this->patch("/admin/navigation/{$option->id}", [])->assertForbidden();
    }

    public function test_editor_reads_options_from_master_data_and_supports_deep_link_to_section(): void
    {
        $this->actingAs($this->administrator());
        $this->get('/admin/homepage?section=careers')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/Homepage')
            ->where('selectedSection', 'careers')
            ->has('masterOptions.careers_location', 3)
        );
        $this->get('/admin/master-data')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/MasterData')
            ->has('categories', 7)
        );
    }

    public function test_options_are_shared_and_seeding_preserves_admin_edits(): void
    {
        $this->actingAs($this->administrator());
        $option = MasterDataOption::query()->where('category', 'skills_icon')->where('value', 'practice')->firstOrFail();
        $this->patch("/admin/master-data/{$option->id}", [
            'label' => 'Practice questions', 'sort_order' => 5, 'is_active' => true,
        ])->assertRedirect('/admin/master-data?category=skills_icon');
        $this->seed(HomepageMasterDataSeeder::class);
        $this->assertSame('Practice questions', $option->fresh()->label);
        $this->get('/admin/homepage')->assertInertia(fn (Assert $page) => $page
            ->where('masterOptions.skills_icon.0.label', 'Practice questions')
        );
    }

    public function test_currently_used_option_cannot_be_retired(): void
    {
        $this->actingAs($this->administrator());
        $option = MasterDataOption::query()->where('category', 'hero_primary_url')->where('value', '/register')->firstOrFail();
        $this->patch("/admin/navigation/{$option->id}", [
            'label' => 'Register', 'sort_order' => 10, 'is_active' => false,
        ])->assertSessionHasErrors('is_active');
        $this->assertTrue($option->fresh()->is_active);
    }

    public function test_admin_can_add_safe_option_and_cannot_add_external_destination_or_unsupported_icon(): void
    {
        $this->actingAs($this->administrator());
        $this->post('/admin/navigation', [
            'category' => 'hero_primary_url', 'value' => '/daily-challenge', 'label' => 'Daily challenge',
        ])->assertRedirect('/admin/navigation?category=hero_primary_url');
        $this->assertDatabaseHas('master_data_options', ['category' => 'hero_primary_url', 'value' => '/daily-challenge']);

        $this->post('/admin/navigation', [
            'category' => 'hero_primary_url', 'value' => 'https://evil.example', 'label' => 'Bad',
        ])->assertSessionHasErrors('value');
        $this->post('/admin/master-data', [
            'category' => 'pathway_step_icon', 'value' => 'unimplemented-icon', 'label' => 'Unknown',
        ])->assertSessionHasErrors('value');
    }

    public function test_inactive_options_are_excluded_from_editor_choices(): void
    {
        $this->actingAs($this->administrator());
        $option = MasterDataOption::query()->where('category', 'careers_type')->where('value', 'Contract')->firstOrFail();
        $this->patch("/admin/master-data/{$option->id}", [
            'label' => 'Contract', 'sort_order' => 30, 'is_active' => false,
        ])->assertRedirect('/admin/master-data?category=careers_type');
        $this->assertFalse($option->fresh()->is_active);
        $this->get('/admin/homepage')->assertInertia(fn (Assert $page) => $page
            ->has('masterOptions.careers_type', 2)
        );
    }
    public function test_sidebar_catalogs_are_separated_and_validated_by_section(): void
    {
        $this->actingAs($this->administrator());
        $this->get('/admin/master-data?category=careers_type')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/MasterData')->where('selectedCategory', 'careers_type')
            ->where('navigation', false)->has('categories', 7));
        $this->get('/admin/navigation?category=skills_url')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/MasterData')->where('selectedCategory', 'skills_url')
            ->where('navigation', true)->has('categories', 4));
        $this->post('/admin/master-data', [
            'category' => 'hero_primary_url', 'value' => '/learning', 'label' => 'Learning',
        ])->assertSessionHasErrors('category');
        $this->post('/admin/navigation', [
            'category' => 'skills_icon', 'value' => 'practice', 'label' => 'Practice',
        ])->assertSessionHasErrors('category');
        $icon = MasterDataOption::query()->where('category', 'skills_icon')->firstOrFail();
        $this->patch("/admin/navigation/{$icon->id}", ['label' => 'Ignored', 'sort_order' => 1, 'is_active' => true])->assertNotFound();
    }

    public function test_admin_icon_upload_is_safe_and_public_homepage_receives_asset(): void
    {
        Storage::fake('public');
        Cache::forget('pm-circle:homepage-icon-assets');
        $this->actingAs($this->administrator());
        $icon = MasterDataOption::query()->where('category', 'skills_icon')->firstOrFail();
        $this->post("/admin/master-data/{$icon->id}/icon", [
            'icon' => UploadedFile::fake()->createWithContent('practice.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8GzHYAAAAASUVORK5CYII=')),
        ])->assertRedirect('/admin/master-data?category=skills_icon');
        $path = $icon->fresh()->icon_path;
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);
        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('public/Home')
            ->where('iconAssets.skills_icon.'.$icon->value, Storage::disk('public')->url($path)));
        $this->delete("/admin/master-data/{$icon->id}/icon")
            ->assertRedirect('/admin/master-data?category=skills_icon');
        $this->assertNull($icon->fresh()->icon_path);
    }

    public function test_icon_upload_rejects_svg_and_navigation_options_and_guests(): void
    {
        Storage::fake('public');
        $icon = MasterDataOption::query()->where('category', 'skills_icon')->firstOrFail();
        $navigation = MasterDataOption::query()->where('category', 'hero_primary_url')->firstOrFail();
        $this->post("/admin/master-data/{$icon->id}/icon", [])->assertRedirect();
        $this->actingAs($this->administrator());
        $this->post("/admin/master-data/{$icon->id}/icon", [
            'icon' => UploadedFile::fake()->create('unsafe.svg', 1, 'image/svg+xml'),
        ])->assertSessionHasErrors('icon');
        $this->post("/admin/master-data/{$navigation->id}/icon", [
            'icon' => UploadedFile::fake()->createWithContent('bad.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8GzHYAAAAASUVORK5CYII=')),
        ])->assertNotFound();
    }

}
