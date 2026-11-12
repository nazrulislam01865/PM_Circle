<?php

namespace Tests\Feature\Auth;

use App\Models\MasterDataOption;
use App\Models\User;
use Database\Seeders\SignupMasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SignupMasterDataTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SignupMasterDataSeeder::class);
    }

    private function administrator(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_admin' => true])->save();

        return $user;
    }

    private function startRegistration(): void
    {
        config()->set('pm-circle.signup_verification_mode', 'off');
        $this->post('/join/email', ['email' => 'member@example.com'])->assertRedirect(route('join.profile'));
    }

    public function test_signup_options_are_loaded_from_active_master_data_in_admin_order(): void
    {
        $option = MasterDataOption::query()->where('category', 'signup_role')->where('value', 'Scrum Master')->firstOrFail();
        $option->update(['label' => 'Scrum Team Facilitator', 'sort_order' => 1]);
        MasterDataOption::query()->where('category', 'signup_certification')->where('value', 'PMP')->update(['is_active' => false]);
        $this->startRegistration();

        $this->get(route('join.profile'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('auth/RegisterStep2')
            ->where('signupOptions.signup_role.0.value', 'Scrum Master')
            ->where('signupOptions.signup_role.0.label', 'Scrum Team Facilitator')
            ->has('signupOptions.signup_experience', 13)
            ->has('signupOptions.signup_certification', 7)
            ->etc());
    }

    public function test_admin_manages_signup_choices_through_existing_master_data_editor(): void
    {
        $this->actingAs($this->administrator());
        $this->get('/admin/master-data?category=signup_role')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/MasterData')->where('selectedCategory', 'signup_role')
            ->has('categories', 10));
        $this->post('/admin/master-data', [
            'category' => 'signup_role', 'value' => 'Delivery Lead', 'label' => 'Delivery Lead',
        ])->assertRedirect('/admin/master-data?category=signup_role');
        $this->post('/admin/master-data', [
            'category' => 'signup_experience', 'value' => '11', 'label' => '11 years',
        ])->assertRedirect('/admin/master-data?category=signup_experience');
        $this->post('/admin/master-data', [
            'category' => 'signup_experience', 'value' => '999', 'label' => '999 years',
        ])->assertSessionHasErrors('value');
        $this->post('/admin/master-data', [
            'category' => 'signup_role', 'value' => '<script>', 'label' => 'Unsafe',
        ])->assertSessionHasErrors('value');
        $this->assertDatabaseHas('master_data_options', [
            'category' => 'signup_role', 'value' => 'Delivery Lead', 'is_active' => true,
        ]);
    }

    public function test_server_rejects_unconfigured_or_disabled_dropdown_values(): void
    {
        MasterDataOption::query()->where('category', 'signup_role')->where('value', 'Project Manager')->update(['is_active' => false]);
        $this->startRegistration();

        $validAccount = [
            'name' => 'New Member', 'password' => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!', 'legal_acceptance' => true,
        ];
        $this->post(route('join.profile.save'), $validAccount + [
            'role' => 'Project Manager', 'years_experience' => 3,
            'certifications' => [['name' => 'PMP', 'credential_number' => '12345']],
        ])->assertSessionHasErrors('role');
        $this->post(route('join.profile.save'), $validAccount + [
            'role' => 'Not configured', 'years_experience' => 11,
            'certifications' => [['name' => 'Not configured', 'credential_number' => '12345']],
        ])->assertSessionHasErrors(['role', 'years_experience', 'certifications.0.name']);
        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'member@example.com']);
    }

    public function test_signup_seeder_preserves_admin_changes_when_repeated(): void
    {
        $option = MasterDataOption::query()->where('category', 'signup_role')->where('value', 'Project Manager')->firstOrFail();
        $option->update(['label' => 'PM Professional', 'sort_order' => 3, 'is_active' => false]);
        $this->seed(SignupMasterDataSeeder::class);
        $this->assertDatabaseHas('master_data_options', [
            'id' => $option->id, 'label' => 'PM Professional', 'sort_order' => 3, 'is_active' => false,
        ]);
    }
}
