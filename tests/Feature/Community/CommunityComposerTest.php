<?php

namespace Tests\Feature\Community;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CommunityComposerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config([
            'community.engagement_stats_reads' => false,
            'community.engagement_stats_writes' => false,
            'community.engagement_write_gate' => false,
            'pm-ai.post_check_enabled' => false,
            'pm-circle.email_verification_required' => true,
        ]);
    }

    public function test_community_submission_returns_to_discussions_and_home_default_is_preserved(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $data = ['body' => 'Sharing a lesson from my project.', 'topic' => 'From my project'];

        $this->actingAs($member)->post('/posts', [...$data, 'return_to' => 'community'])
            ->assertRedirect(route('community.index'));
        $this->assertDatabaseHas('posts', ['author_id' => $member->id, 'body' => $data['body'], 'status' => 'published']);
        $this->post('/posts', [...$data, 'return_to' => 'dashboard'])->assertRedirect(route('dashboard'));
        $this->post('/posts', $data)->assertRedirect(route('dashboard'));
        $this->postJson('/posts', [...$data, 'return_to' => 'https://example.com'])->assertUnprocessable()->assertJsonValidationErrors('return_to');
        $this->assertSame(3, Post::query()->where('author_id', $member->id)->count());
    }

    public function test_private_moderation_status_is_only_returned_to_eligible_owner(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $post = $member->posts()->create([
            'body' => 'A private pending discussion.', 'topic' => 'From my project',
            'visibility' => 'public', 'status' => 'pending_check',
        ]);
        $this->get('/community')->assertOk()->assertInertia(fn ($page) => $page
            ->component('community/Feed')->where('postChecks', null));
        $this->actingAs($other)->get('/community')->assertOk()->assertInertia(fn ($page) => $page
            ->has('postChecks.posts', 0));
        $this->actingAs($member)->get('/community')->assertOk()->assertInertia(fn ($page) => $page
            ->has('postChecks.posts', 1)->where('postChecks.posts.0.id', $post->id)
            ->has('posts.data', 0));
        $unverified = User::factory()->unverified()->create(['onboarding_step' => 3]);
        $this->actingAs($unverified)->get('/community')->assertOk()->assertInertia(fn ($page) => $page
            ->where('postChecks', null));
    }
}
