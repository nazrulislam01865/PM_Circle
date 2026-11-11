<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;
use Tests\TestCase;

final class AdminMemberSeparationTest extends TestCase
{
    use RefreshDatabase;

    private function administrator(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_admin' => true])->save();

        return $user;
    }

    public function test_unauthenticated_visitors_are_sent_to_the_correct_login_page(): void
    {
        $this->get('/admin')->assertRedirect(route('admin.login'));
        $this->get('/admin/homepage')->assertRedirect(route('admin.login'));
        $this->get('/dashboard')->assertRedirect(route('login'));
        $this->get('/settings/profile')->assertRedirect(route('login'));

        $this->get('/admin/login')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('auth/admin-login')
        );
    }

    public function test_admin_credentials_are_rejected_by_the_member_login(): void
    {
        $admin = $this->administrator();

        $this->post(route('login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_member_credentials_are_rejected_by_admin_login(): void
    {
        $member = User::factory()->create();

        $this->post(route('admin.login.store'), [
            'email' => $member->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_admin_authenticates_only_on_admin_login_and_is_redirected_to_admin_dashboard(): void
    {
        $admin = $this->administrator();

        $this->post(route('admin.login.store'), [
            'email' => $admin->email,
            'password' => 'password',
            'remember' => true, // forged remember-me is ignored for admins
        ])->assertRedirect(route('admin.dashboard'));

        $this->assertAuthenticatedAs($admin);
        $this->get('/login')->assertRedirect(route('admin.dashboard'));
        $this->get('/admin/login')->assertRedirect(route('admin.dashboard'));
        $member = User::factory()->create();
        $this->post('/login', ['email' => $member->email, 'password' => 'password'])
            ->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticatedAs($admin);
    }

    public function test_member_login_preserves_member_dashboard_destination(): void
    {
        $member = User::factory()->create();
        $this->post(route('login.store'), [
            'email' => $member->email,
            'password' => 'password',
        ])->assertRedirect(route('dashboard'));
        $this->assertAuthenticatedAs($member);
        $this->get('/admin/login')->assertRedirect(route('dashboard'));
        $admin = $this->administrator();
        $this->post('/admin/login', ['email' => $admin->email, 'password' => 'password'])
            ->assertRedirect(route('dashboard'));
        $this->assertAuthenticatedAs($member);
    }

    public function test_saved_intended_destinations_cannot_cross_the_account_boundary(): void
    {
        $admin = $this->administrator();
        $this->withSession(['url.intended' => '/dashboard'])
            ->post('/admin/login', ['email' => $admin->email, 'password' => 'password'])
            ->assertRedirect(route('admin.dashboard'));
        $this->post('/admin/logout')->assertRedirect(route('admin.login'));

        $member = User::factory()->create();
        $this->withSession(['url.intended' => '/admin'])
            ->post('/login', ['email' => $member->email, 'password' => 'password'])
            ->assertRedirect(route('dashboard'));
    }

    public function test_admin_cannot_visit_or_write_to_member_only_routes(): void
    {
        $this->actingAs($this->administrator());

        foreach ([
            '/dashboard',
            '/dashboard/features/notifications',
            '/dashboard/learning',
            '/dashboard/daily-challenge',
            '/join/step/2',
            '/join/step/3',
            '/settings',
            '/settings/profile',
            '/settings/security',
            '/interview-preparation',
            '/exams/pmp',
            '/saved-posts',
            '/membership',
        ] as $uri) {
            $this->get($uri)->assertForbidden();
        }

        $this->post('/posts', [])->assertForbidden();
        $this->post('/settings/profile/avatar', [])->assertForbidden();
        $this->put('/settings/password', [])->assertForbidden();
        $this->post('/join/step/2', [])->assertForbidden();
        $this->post('/join/step/3', [])->assertForbidden();
        $this->post('/api/auth/send-verification-code', [])->assertForbidden();
        $this->post('/api/auth/verify-code', [])->assertForbidden();
    }

    public function test_an_administrator_is_not_exposed_as_a_public_member(): void
    {
        $admin = $this->administrator();
        $admin->profile()->create(['visibility' => 'public']);
        $this->actingAs($admin);

        $this->get('/members/'.$admin->id)->assertNotFound();
        $this->get('/members')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('members/Directory')
            ->etc()
        );
    }

    public function test_member_cannot_visit_admin_pages_or_write_to_admin_routes(): void
    {
        $this->actingAs(User::factory()->create());
        $this->get('/admin')->assertForbidden();
        $this->get('/admin/homepage')->assertForbidden();
        $this->get('/admin/navigation')->assertForbidden();
        $this->get('/admin/master-data')->assertForbidden();
        $this->put('/admin/homepage', [])->assertForbidden();
        $this->post('/admin/logout')->assertForbidden();
    }

    public function test_inactive_or_unverified_admin_accounts_cannot_log_in(): void
    {
        $admin = $this->administrator();
        $admin->forceFill(['email_verified_at' => null])->save();
        $this->post('/admin/login', ['email' => $admin->email, 'password' => 'password'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();

        $admin->forceFill(['email_verified_at' => now(), 'status' => 'inactive'])->save();
        $this->post('/admin/login', ['email' => $admin->email, 'password' => 'password'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_admin_logout_ends_the_session_and_returns_to_admin_login(): void
    {
        $this->actingAs($this->administrator())
            ->post('/admin/logout')->assertRedirect(route('admin.login'));

        $this->assertGuest();
    }

    public function test_existing_member_login_and_logout_continue_working(): void
    {
        $member = User::factory()->create();
        $this->actingAs($member)->post('/logout')->assertRedirect(route('home'));
        $this->assertGuest();
    }

    public function test_admin_two_factor_challenge_still_runs_when_enabled(): void
    {
        if (! Features::enabled(Features::twoFactorAuthentication())) {
            $this->markTestSkipped('Two-factor authentication is not enabled.');
        }

        $admin = User::factory()->withTwoFactor()->create();
        $admin->forceFill(['is_admin' => true])->save();

        $this->post('/admin/login', ['email' => $admin->email, 'password' => 'password'])
            ->assertRedirect(route('two-factor.login'))
            ->assertSessionHas('login.id', $admin->id);

        $this->assertGuest();
    }
}
