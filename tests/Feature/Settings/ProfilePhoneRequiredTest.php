<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ProfilePhoneRequiredTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_profile_save_rejects_missing_phone(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);

        $this->actingAs($member)->patch(route('profile.update'), [
            'tab' => 'edit', 'headline' => 'Project manager', 'phone' => '',
        ])->assertSessionHasErrors('phone');
    }

    public function test_full_profile_save_rejects_invalid_phone(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);

        $this->actingAs($member)->patch(route('profile.update'), [
            'tab' => 'edit', 'headline' => 'Project manager', 'phone' => '+880 12',
        ])->assertSessionHasErrors('phone');
    }

    public function test_full_profile_save_accepts_valid_number(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);

        $this->actingAs($member)->patch(route('profile.update'), [
            'tab' => 'edit', 'headline' => 'Project manager', 'phone' => '+880 1712 345678',
        ])->assertSessionHasNoErrors()->assertRedirect(route('profile.edit', ['tab' => 'edit']));

        $this->assertDatabaseHas('profiles', [
            'user_id' => $member->id, 'phone' => '+880 1712 345678',
        ]);
    }

    public function test_independent_privacy_patch_does_not_require_phone(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);

        $this->actingAs($member)->patch(route('profile.update'), [
            'contact_visibility' => 'private',
        ])->assertSessionHasNoErrors();
    }
}
