<?php

namespace Tests\Feature\Members;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class MemberDiscoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_directory_excludes_private_profiles(): void
    {
        $public = User::factory()->create(['name' => 'Public Member', 'status' => 'active', 'onboarding_step' => 3]);
        $private = User::factory()->create(['name' => 'Private Member', 'status' => 'active']);
        $public->profile()->create(['visibility' => 'public', 'role' => 'Project Manager']);
        $private->profile()->create(['visibility' => 'private', 'role' => 'Director']);

        $this->get('/members')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('members/Directory')->has('members.data', 1)
            ->where('members.data.0.name', 'Public Member')
            ->missing('members.data.0.email'));
        $this->get('/members/'.$private->id)->assertNotFound();
        $this->actingAs($public)->post('/members/'.$private->id.'/follow')->assertNotFound();
        $this->get('/members/'.$public->id)->assertOk();
    }

    public function test_directory_filters_use_public_profile_fields_and_expose_real_counts(): void
    {
        $viewer = User::factory()->create(['status' => 'active', 'onboarding_step' => 3]);
        $first = User::factory()->create(['name' => 'Alpha Manager', 'status' => 'active', 'onboarding_step' => 3]);
        $other = User::factory()->create(['name' => 'Beta Member', 'status' => 'active', 'onboarding_step' => 3]);
        $private = User::factory()->create(['name' => 'Private Manager', 'status' => 'active', 'onboarding_step' => 3]);

        $first->profile()->create(['visibility' => 'public', 'role' => 'Project Manager', 'industry' => 'Technology', 'city' => 'Dhaka', 'country' => 'Bangladesh']);
        $other->profile()->create(['visibility' => 'public', 'role' => 'Scrum Master', 'industry' => 'Consulting', 'city' => 'Dhaka', 'country' => 'Bangladesh']);
        $private->profile()->create(['visibility' => 'private', 'role' => 'Project Manager', 'industry' => 'Technology']);
        \Illuminate\Support\Facades\DB::table('member_follows')->insert([
            'follower_id' => $viewer->id, 'followed_id' => $first->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        Post::create(['author_id' => $first->id, 'body' => 'Public contribution', 'status' => 'published', 'visibility' => 'public', 'published_at' => now(), 'is_anonymous' => false]);
        Post::create(['author_id' => $first->id, 'body' => 'Private contribution', 'status' => 'published', 'visibility' => 'private', 'published_at' => now(), 'is_anonymous' => false]);

        $this->actingAs($viewer)->get('/members?role=Project%20Manager&industry=Technology&location=Dhaka%7CBangladesh&tab=following')
            ->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('members/Directory')
                ->has('members.data', 1)
                ->where('members.data.0.id', $first->id)
                ->where('members.data.0.profile.city', 'Dhaka')
                ->where('members.data.0.followers_count', 1)
                ->where('members.data.0.contributions_count', 1)
                ->where('members.data.0.is_following', true)
                ->where('filterOptions.roles.0', 'Project Manager')
                ->missing('members.data.0.email'));
    }

    public function test_directory_guest_following_is_empty_and_invalid_filters_are_rejected(): void
    {
        $member = User::factory()->create(['status' => 'active']);
        $member->profile()->create(['visibility' => 'public', 'role' => 'Coordinator']);
        $this->get('/members?tab=following')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('members/Directory')->has('members.data', 0));
        $this->get('/members?sort=unsafe')->assertRedirect()->assertSessionHasErrors('sort');
        $this->get('/members?role='.str_repeat('x', 121))->assertRedirect()->assertSessionHasErrors('role');
    }

    public function test_authenticated_community_feed_route_is_a_real_page(): void
    {
        $member = User::factory()->create(['status' => 'active', 'onboarding_step' => 3]);
        $this->actingAs($member)->get('/community')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('community/Feed'));
    }

    public function test_member_can_preview_own_private_profile_without_exposing_it_to_others(): void
    {
        $owner = User::factory()->create(['onboarding_step' => 3, 'status' => 'active']);
        $other = User::factory()->create(['onboarding_step' => 3, 'status' => 'active']);
        $owner->profile()->create(['visibility' => 'private', 'role' => 'Private role']);

        $this->get('/members/'.$owner->id)->assertNotFound();
        $this->actingAs($other)->get('/members/'.$owner->id)->assertNotFound();
        $this->actingAs($owner)->get('/members/'.$owner->id)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('members/Show')
                ->where('isOwnProfile', true)
                ->where('member.profile.role', 'Private role'));
    }

    public function test_factory_member_state_matches_database_defaults(): void
    {
        $member = User::factory()->create();

        $this->assertSame('active', $member->status);
        $this->assertSame(1, $member->onboarding_step);
        $this->assertDatabaseHas('users', ['id' => $member->id, 'status' => 'active', 'onboarding_step' => 1]);
    }

    public function test_suspended_members_cannot_follow_or_open_saved_posts(): void
    {
        $suspended = User::factory()->create(['status' => 'suspended', 'onboarding_step' => 3]);
        $target = User::factory()->create(['onboarding_step' => 3]);
        $target->profile()->create(['visibility' => 'public']);

        $this->actingAs($suspended)->post('/members/'.$target->id.'/follow')->assertForbidden();
        $this->actingAs($suspended)->get('/saved-posts')->assertForbidden();
        $this->assertDatabaseCount('member_follows', 0);
    }

    public function test_follow_is_unique_and_self_follow_is_disallowed(): void
    {
        $first = User::factory()->create(['onboarding_step' => 3]);
        $second = User::factory()->create(['onboarding_step' => 3]);
        $second->profile()->create(['visibility' => 'public']);
        $this->post('/members/'.$second->id.'/follow')->assertRedirect('/login');
        $this->actingAs($first)->post('/members/'.$second->id.'/follow')->assertRedirect();
        $this->actingAs($first)->post('/members/'.$second->id.'/follow')->assertRedirect();
        $this->assertDatabaseCount('member_follows', 1);
        $this->actingAs($first)->post('/members/'.$first->id.'/follow')->assertStatus(422);
        $this->actingAs($first)->delete('/members/'.$second->id.'/follow')->assertRedirect();
        $this->assertDatabaseCount('member_follows', 0);
    }

    public function test_only_current_members_private_saves_are_shown(): void
    {
        $first = User::factory()->create(['onboarding_step' => 3]);
        $second = User::factory()->create(['onboarding_step' => 3]);
        $publicPost = Post::create(['author_id' => $second->id, 'body' => 'A shareable post about delivery.', 'status' => 'published', 'visibility' => 'public', 'published_at' => now()]);
        $hiddenPost = Post::create(['author_id' => $second->id, 'body' => 'A private post about a client.', 'status' => 'published', 'visibility' => 'private', 'published_at' => now()]);
        $publicPost->saves()->create(['user_id' => $first->id]);
        $hiddenPost->saves()->create(['user_id' => $first->id]);
        $this->actingAs($first)->get('/saved-posts')->assertInertia(fn (Assert $page) => $page
            ->component('community/SavedPosts')->has('posts.data', 1)->where('posts.data.0.id', $publicPost->id));
        $this->actingAs($second)->get('/saved-posts')->assertInertia(fn (Assert $page) => $page->has('posts.data', 0));
    }

    public function test_pricing_renders_comparison_page_and_preserves_catalog(): void
    {
        $this->get('/pricing')->assertOk()->assertInertia(fn (Assert $page) => $page->component('public/Pricing')->has('plans'));
    }
}
