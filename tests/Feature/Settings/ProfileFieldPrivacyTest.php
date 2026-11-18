<?php

namespace Tests\Feature\Settings;

use App\Domain\Identity\Services\ProfileFieldPrivacy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ProfileFieldPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_the_signed_in_member_can_save_their_field_settings(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $member->profile()->create(['visibility' => 'public']);
        $other->profile()->create(['visibility' => 'public']);

        $choices = array_fill_keys(ProfileFieldPrivacy::keys(), 'community');
        $choices['full_name'] = 'private';
        $choices['professional_headline'] = 'public';

        $this->actingAs($member)->patch(route('profile.update'), [
            'tab' => 'privacy', 'field_visibility' => $choices,
        ])->assertSessionHasNoErrors()->assertRedirect(route('profile.edit', ['tab' => 'privacy']));

        $this->assertEqualsCanonicalizing($choices, $member->profile->fresh()->field_visibility);
        $this->assertNull($other->profile->fresh()->field_visibility);
    }

    public function test_invalid_audience_and_missing_fields_are_rejected(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $member->profile()->create(['visibility' => 'public']);
        $this->actingAs($member)->patch(route('profile.update'), [
            'tab' => 'privacy', 'field_visibility' => ['full_name' => 'anyone'],
        ])->assertSessionHasErrors(['field_visibility', 'field_visibility.full_name']);
    }

    public function test_public_member_profile_respects_field_choices_without_additional_queries(): void
    {
        $owner = User::factory()->create(['onboarding_step' => 3, 'name' => 'Visible Name']);
        $owner->profile()->create([
            'visibility' => 'public', 'headline' => 'Secret headline', 'role' => 'Manager',
            'field_visibility' => ['full_name' => 'private', 'professional_headline' => 'private', 'current_job_title' => 'public'],
        ]);
        $this->get(route('members.show', ['member' => $owner->id]))
            ->assertOk()->assertInertia(fn ($page) => $page
                ->where('member.name', 'PM Circle member')
                ->where('member.profile.headline', null)
                ->where('member.profile.role', 'Manager'));
    }

    public function test_community_only_fields_are_visible_to_signed_in_members_but_not_visitors(): void
    {
        $owner = User::factory()->create(['onboarding_step' => 3]);
        $owner->profile()->create([
            'visibility' => 'public', 'headline' => 'Member headline',
            'field_visibility' => ['professional_headline' => 'community'],
        ]);
        $this->get(route('members.show', ['member' => $owner->id]))
            ->assertOk()->assertInertia(fn ($page) => $page->where('member.profile.headline', null));
        $viewer = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($viewer)->get(route('members.show', ['member' => $owner->id]))
            ->assertOk()->assertInertia(fn ($page) => $page->where('member.profile.headline', 'Member headline'));
    }
}
