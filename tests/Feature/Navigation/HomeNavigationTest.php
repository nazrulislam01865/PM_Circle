<?php

namespace Tests\Feature\Navigation;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class HomeNavigationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_homepage_remains_public(): void
    {
        $this->withoutVite();

        $this->get('/')->assertOk()->assertInertia(fn ($page) => $page
            ->component('public/Home'));
    }

    public function test_authenticated_member_home_links_resolve_to_member_dashboard(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);

        $this->actingAs($member)->get('/')->assertRedirect(route('dashboard'));
    }

    public function test_authenticated_administrator_can_still_preview_public_homepage(): void
    {
        $this->withoutVite();
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->get('/')->assertOk()->assertInertia(fn ($page) => $page
            ->component('public/Home'));
    }

    public function test_incomplete_member_uses_existing_dashboard_onboarding_redirect(): void
    {
        $member = User::factory()->create(['onboarding_step' => 2]);

        $this->actingAs($member)->get('/')->assertRedirect(route('dashboard'));
        $this->get('/dashboard')->assertRedirect(route('join.profile'));
    }
}
