<?php

namespace Tests\Feature\Community;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PostEngagementContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_reaction_is_unique_and_counts_all_types_in_public_and_member_feeds(): void
    {
        config()->set('pm-circle.demo_content_enabled', false);
        $author = User::factory()->create(['onboarding_step' => 3]);
        $viewer = User::factory()->create(['onboarding_step' => 3]);
        $post = Post::create(['author_id' => $author->id, 'title' => 'Meeting decisions',
            'body' => 'How our team improved the weekly status meeting.', 'topic' => 'I learned',
            'status' => 'published', 'visibility' => 'public', 'published_at' => now()]);
        $this->actingAs($viewer)->postJson("/posts/{$post->id}/reactions", ['type' => 'haha'])
            ->assertOk()->assertJsonPath('count', 1);
        $this->actingAs($viewer)->postJson("/posts/{$post->id}/reactions", ['type' => 'sad'])
            ->assertOk()->assertJsonPath('count', 1);
        $this->assertDatabaseCount('post_reactions', 1);
        $this->get('/community')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('community/Feed')->where('posts.data.0.viewer_reaction', 'sad')
            ->where('posts.data.0.reactions_count', 1)->etc());
        $this->get('/dashboard')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('account/Dashboard')->where('dashboard.posts.0.reaction', 'sad')
            ->where('dashboard.posts.0.reactions', 1)->etc());
        $this->deleteJson("/posts/{$post->id}/reactions")->assertOk()->assertJsonPath('count', 0);
    }

    public function test_guest_cannot_store_reactions(): void
    {
        $user = User::factory()->create();
        $post = Post::create(['author_id' => $user->id, 'body' => 'Public project lesson',
            'status' => 'published', 'visibility' => 'public', 'published_at' => now()]);
        $this->postJson("/posts/{$post->id}/reactions", ['type' => 'love'])->assertUnauthorized();
        $this->assertDatabaseCount('post_reactions', 0);
    }
}
