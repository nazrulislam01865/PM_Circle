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
