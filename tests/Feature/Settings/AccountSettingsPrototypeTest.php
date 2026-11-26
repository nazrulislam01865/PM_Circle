<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use App\Domain\Identity\Services\ProfileFieldPrivacy;
use App\Domain\Notifications\ActivityNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class AccountSettingsPrototypeTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_settings_and_partial_persistence(): void
    {
        $user = User::factory()->create(['onboarding_step' => 3]);
        $user->profile()->create(['visibility' => 'members_only', 'field_visibility' => ['full_name' => 'private']]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($user)->get('/settings/account')->assertOk()->assertInertia(fn ($page) => $page
            ->component('settings/account')->has('sections', 9)->where('savedValues.name', $user->name)
            ->has('privacyFieldGroups', 4)->where('savedValues.privacy_full_name', 'private')->missing('aiBalance'));
        $choices = array_fill_keys(ProfileFieldPrivacy::keys(), 'community');
        $choices['full_name'] = $choices['experience'] = 'private';
        $this->patch('/settings/account', ['name' => 'Updated Member', 'phone' => '+8801712345678', 'goal' => '5 hours', 'anon' => true, 'field_visibility' => $choices, 'visibility' => 'public', 'is_admin' => true, 'email' => 'other@example.com'])
            ->assertSessionHasNoErrors()->assertRedirect('/settings/account');
        $user->refresh();
        $this->assertSame('Updated Member', $user->name);
        $this->assertFalse((bool) $user->is_admin);
        $this->assertNotSame('other@example.com', $user->email);
        $this->assertSame('5 hours', $user->account_preferences['goal']);
        $this->assertTrue($user->account_preferences['anon']);
        $this->assertSame('public', $user->profile->visibility);
        $this->assertSame('private', $user->profile->field_visibility['experience']);
        $this->assertSame('private', $user->profile->field_visibility['full_name']);
        $this->assertNull($other->fresh()->account_preferences);
        $this->patch('/settings/account', ['speed' => '1.5×'])->assertSessionHasNoErrors();
        $this->assertSame('5 hours', $user->fresh()->account_preferences['goal']);
    }

    public function test_privacy_is_shared_in_both_directions_and_rejects_unrecognised_fields(): void
    {
        $user = User::factory()->create(['onboarding_step' => 3]);
        $user->profile()->create(['visibility' => 'public', 'headline' => 'Private headline']);
        $choices = array_fill_keys(ProfileFieldPrivacy::keys(), 'community');
        $choices['professional_headline'] = 'private';
        $this->actingAs($user)->patch('/settings/account', ['field_visibility' => $choices, 'visibility' => 'public'])->assertSessionHasNoErrors();
        $this->get('/settings/profile?tab=privacy')->assertInertia(fn ($page) => $page->where('profileData.field_visibility.professional_headline', 'private'));
        $this->app['auth']->logout();
        $this->get(route('members.show', ['member' => $user->id]))->assertInertia(fn ($page) => $page->where('member.profile.headline', null));
        $choices['professional_headline'] = 'public';
        $this->actingAs($user)->patch('/settings/profile', ['tab' => 'privacy', 'field_visibility' => $choices, 'visibility' => 'members_only'])->assertSessionHasNoErrors();
        $this->get('/settings/account')->assertInertia(fn ($page) => $page->where('savedValues.privacy_professional_headline', 'public')->where('savedValues.visibility', 'members_only'));
        $this->patch('/settings/account', ['field_visibility' => [...$choices, 'unknown_field' => 'public']])->assertSessionHasErrors('field_visibility');
        $this->patch('/settings/account', ['field_visibility' => ['full_name' => 'anyone']])->assertSessionHasErrors(['field_visibility', 'field_visibility.full_name']);
    }

    public function test_validation_and_guest_protection(): void
    {
        $this->get('/settings/account')->assertRedirect('/login');
        $user = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($user)->patch('/settings/account', ['goal' => 'invalid', 'phone' => 'abc', 'visibility' => 'Mixed', 'quietStart' => '99:99'])
            ->assertSessionHasErrors(['goal', 'phone', 'visibility', 'quietStart']);
        $this->assertNull($user->fresh()->account_preferences);
    }

    public function test_optional_notification_preference_is_enforced(): void
    {
        $recipient = User::factory()->create(['onboarding_step' => 3]);
        $actor = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($recipient)->patch('/settings/account', ['inapp' => false])->assertSessionHasNoErrors();
        app(ActivityNotifier::class)->forFollow($actor, $recipient);
        $this->assertFalse(DB::table('notifications')->where('notifiable_id', $recipient->id)->exists());
    }
}
