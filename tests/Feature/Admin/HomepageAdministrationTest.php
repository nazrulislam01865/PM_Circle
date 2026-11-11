<?php

namespace Tests\Feature\Admin;

use App\Models\HomePageContent;
use App\Models\User;
use Database\Seeders\HomePageContentSeeder;
use Database\Seeders\HomepageMasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomepageAdministrationTest extends TestCase
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

    public function test_guests_are_redirected_and_members_cannot_access_any_administration_route(): void
    {
        $this->get('/admin')->assertRedirect();
        $this->get('/admin/homepage')->assertRedirect();

        $this->actingAs(User::factory()->create());
        $this->get('/admin')->assertForbidden();
        $this->get('/admin/homepage')->assertForbidden();
        $this->put('/admin/homepage', $this->payload())->assertForbidden();
        $this->post('/admin/homepage/images', [])->assertForbidden();
    }

    public function test_administrator_sees_a_separate_dashboard_and_homepage_editor(): void
    {
        $this->actingAs($this->administrator());
        $this->get('/admin')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/Dashboard')
            ->where('homepage.configured', true)
            ->has('stats.publishedScenarios')
            ->has('stats.publicPosts')
        );
        $this->get('/admin/homepage')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/Homepage')
            ->where('content.sections.hero', true)
            ->has('content.pathway.steps.items', 5)
            ->missing('content.community.demo_post_emails')
            ->missing('content.members.demo_emails')
        );
    }

    public function test_unverified_or_inactive_administrator_is_blocked(): void
    {
        $user = $this->administrator();
        $user->forceFill(['email_verified_at' => null])->save();
        $this->actingAs($user)->get('/admin')->assertForbidden();

        $user->forceFill(['email_verified_at' => now(), 'status' => 'inactive'])->save();
        $this->actingAs($user)->get('/admin')->assertForbidden();
    }

    public function test_admin_can_update_content_and_section_visibility_without_erasing_demo_settings(): void
    {
        $admin = $this->administrator();
        $this->actingAs($admin);
        $payload = $this->payload();
        $payload['content']['hero']['title'] = 'Welcome to the managed homepage';
        $payload['content']['sections']['scenario'] = false;
        $payload['content']['skills']['items'] = [];

        $this->put('/admin/homepage', $payload)->assertRedirect('/admin/homepage');

        $page = HomePageContent::query()->where('key', 'home')->firstOrFail();
        $this->assertSame('Welcome to the managed homepage', $page->content['hero']['title']);
        $this->assertFalse($page->content['sections']['scenario']);
        $this->assertSame([], $page->content['skills']['items']);
        $this->assertSame($admin->id, $page->updated_by);
        $this->assertNotEmpty($page->content['community']['demo_post_emails']);
        $this->get('/')->assertOk()->assertInertia(fn (Assert $response) => $response
            ->component('public/Home')
            ->where('content.hero.title', 'Welcome to the managed homepage')
            ->where('content.sections.scenario', false)
            ->has('scenarioResponses', 0)
        );
    }

    public function test_invalid_field_values_are_rejected_and_original_content_is_preserved(): void
    {
        $this->actingAs($this->administrator());
        $original = HomePageContent::query()->where('key', 'home')->firstOrFail()->content;
        $payload = $this->payload();
        $payload['content']['hero']['primary_url'] = 'javascript:alert(1)';

        $this->put('/admin/homepage', $payload)->assertSessionHasErrors('content.hero.primary_url');
        $this->assertEquals($original, HomePageContent::query()->where('key', 'home')->firstOrFail()->content);
    }

    public function test_hidden_internal_demo_filters_cannot_be_overwritten_through_editor(): void
    {
        $this->actingAs($this->administrator());
        $payload = $this->payload();
        $payload['content']['community']['demo_post_emails'] = ['other@example.com'];

        $this->put('/admin/homepage', $payload)->assertSessionHasErrors('content.community');
    }

    public function test_stale_editor_version_cannot_overwrite_newer_changes(): void
    {
        $this->actingAs($this->administrator());
        $payload = $this->payload();
        $payload['version'] = 999999;

        $this->put('/admin/homepage', $payload)->assertSessionHasErrors('version');
    }

    public function test_image_upload_accepts_safe_types_only(): void
    {
        Storage::fake('public');
        $this->actingAs($this->administrator());

        $this->postJson('/admin/homepage/images', ['image' => UploadedFile::fake()->create('evil.svg', 2, 'image/svg+xml')])
            ->assertUnprocessable();
        $this->postJson('/admin/homepage/images', ['image' => UploadedFile::fake()->createWithContent('image.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=='))])
            ->assertOk()->assertJsonStructure(['url']);
        $this->assertCount(1, Storage::disk('public')->allFiles('homepage'));
    }

    public function test_homepage_seeding_does_not_revert_edited_fields(): void
    {
        $this->actingAs($this->administrator());
        $payload = $this->payload();
        $payload['content']['hero']['title'] = 'Our approved text';
        $this->put('/admin/homepage', $payload)->assertRedirect();

        $this->seed(HomePageContentSeeder::class);
        $this->assertSame('Our approved text', HomePageContent::query()->where('key', 'home')->firstOrFail()->content['hero']['title']);
    }
}
