<?php

namespace Tests\Feature\Dashboard;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class MemberDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_requires_authentication_and_onboarding(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
        $user = User::factory()->create(['onboarding_step' => 1]);
        $this->actingAs($user)->get('/dashboard')->assertRedirect(route('join.profile'));
    }

    public function test_free_member_does_not_gain_paid_access_from_demo_query(): void
    {
        config()->set('pm-circle.demo_content_enabled', false);
        $user = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($user)->get('/dashboard?demo_plan=pro')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('account/Dashboard')
                ->where('dashboard.plan', 'free')->where('dashboard.isPreview', false));
    }

    public function test_public_posts_are_only_feed_items_and_hidden_posts_do_not_leak(): void
    {
        config()->set('pm-circle.demo_content_enabled', false);
        $author = User::factory()->create(['onboarding_step' => 3]);
        Post::query()->create(['author_id' => $author->id, 'title' => 'Visible discussion', 'body' => 'Public insight', 'visibility' => 'public', 'status' => 'published', 'published_at' => now()]);
        Post::query()->create(['author_id' => $author->id, 'title' => 'Private discussion', 'body' => 'Sensitive note', 'visibility' => 'private', 'status' => 'published', 'published_at' => now()]);
        $this->actingAs($author)->get('/dashboard')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('dashboard.posts.0.title', 'Visible discussion')
                ->has('dashboard.posts', 1));
    }

    public function test_invalid_dashboard_tabs_are_rejected(): void
    {
        $user = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($user)->get('/dashboard?tab=invalid')->assertSessionHasErrors('tab');
    }
    public function test_pending_payment_cannot_show_paid_membership(): void
    {
        config()->set('pm-circle.demo_content_enabled', false);
        $member = User::factory()->create(['onboarding_step' => 3]);
        $plan = \App\Models\Plan::query()->create(['code' => 'plus', 'name' => 'Plus', 'active' => true]);
        $price = $plan->prices()->create(['months' => 1, 'amount_minor' => 39900, 'currency' => 'BDT', 'version' => 1, 'active' => true]);
        \Illuminate\Support\Facades\DB::table('subscriptions')->insert([
            'user_id' => $member->id, 'plan_price_id' => $price->id, 'status' => 'pending_payment',
            'starts_at' => now()->subDay(), 'ends_at' => now()->addMonth(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($member)->get('/dashboard')->assertInertia(
            fn (Assert $page) => $page->where('dashboard.plan', 'free')
        );
    }

    public function test_all_following_and_my_posts_only_include_authorized_public_posts(): void
    {
        config()->set('pm-circle.demo_content_enabled', false);
        $viewer = User::factory()->create(['onboarding_step' => 3]);
        $followed = User::factory()->create(['onboarding_step' => 3]);
        $follower = User::factory()->create(['onboarding_step' => 3]);
        $stranger = User::factory()->create(['onboarding_step' => 3]);

        DB::table('member_follows')->insert([
            ['follower_id' => $viewer->id, 'followed_id' => $followed->id, 'created_at' => now(), 'updated_at' => now()],
            ['follower_id' => $follower->id, 'followed_id' => $viewer->id, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $makePost = static fn (User $author, string $body, string $visibility = 'public') => Post::query()->create([
            'author_id' => $author->id, 'body' => $body, 'topic' => 'From my project',
            'visibility' => $visibility, 'status' => 'published', 'published_at' => now(),
        ]);
        $own = $makePost($viewer, 'My own post');
        $fromFollowed = $makePost($followed, 'Followed member');
        $fromFollower = $makePost($follower, 'Follower member');
        $makePost($stranger, 'Unrelated member');
        $makePost($followed, 'Private post', 'private');

        // The dashboard previews two rows per tab; use the full community endpoint
        // to assert the complete filter, independent of display bounds.
        $this->actingAs($viewer)->get('/dashboard?tab=mine')->assertInertia(
            fn (Assert $page) => $page->where('dashboard.feedTab', 'mine')
                ->has('dashboard.posts', 1)->where('dashboard.posts.0.id', $own->id)->etc()
        );
        $this->get('/dashboard?tab=following')->assertInertia(
            fn (Assert $page) => $page->where('dashboard.feedTab', 'following')
                ->has('dashboard.posts', 2)->etc()
        );
        $this->get('/community?tab=following')->assertInertia(
            fn (Assert $page) => $page->where('feedTab', 'following')
                ->has('posts.data', 2)
                ->where('posts.data.0.id', $fromFollower->id)
                ->where('posts.data.1.id', $fromFollowed->id)
                ->etc()
        );
        $this->get('/community?tab=mine')->assertInertia(
            fn (Assert $page) => $page->has('posts.data', 1)
                ->where('posts.data.0.id', $own->id)->etc()
        );
        $this->get('/community?tab=all')->assertInertia(
            fn (Assert $page) => $page->has('posts.data', 4)->etc()
        );
    }

    public function test_guest_following_or_my_posts_cannot_expose_private_feed(): void
    {
        $author = User::factory()->create(['onboarding_step' => 3]);
        Post::query()->create([
            'author_id' => $author->id, 'body' => 'Public example',
            'visibility' => 'public', 'status' => 'published', 'published_at' => now(),
        ]);
        $this->get('/community?tab=following')->assertInertia(
            fn (Assert $page) => $page->has('posts.data', 0)->etc()
        );
        $this->get('/community?tab=mine')->assertInertia(
            fn (Assert $page) => $page->has('posts.data', 0)->etc()
        );
    }

    public function test_following_tab_does_not_fabricate_followed_posts(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->get('/dashboard?tab=following')->assertInertia(
            fn (Assert $page) => $page->where('dashboard.feedTab', 'following')->has('dashboard.posts', 0)
        );
    }

}
