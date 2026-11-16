<?php

namespace Tests\Feature\Community;

use App\Models\Scenario;
use App\Models\ScenarioResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ScenarioDiscussionReplyTest extends TestCase
{
    use RefreshDatabase;

    private function scenario(string $status = 'published'): Scenario
    {
        return Scenario::create([
            'slug' => 'reply-test-'.str_replace('.', '', (string) microtime(true)),
            'title' => 'Scenario discussion',
            'summary' => 'Example',
            'situation' => 'A stakeholder requests a change',
            'known_facts' => [],
            'topics' => [],
            'focus' => 'Change control',
            'status' => $status,
            'published_at' => now(),
        ]);
    }

    private function member(): User
    {
        return User::factory()->create(['onboarding_step' => 3, 'status' => 'active']);
    }

    public function test_json_reply_uses_existing_root_thread_and_returns_safe_public_user_fields(): void
    {
        $author = $this->member();
        $author->profile()->create(['visibility' => 'private', 'role' => 'Private role', 'avatar_path' => 'private.png']);
        $scenario = $this->scenario();
        $parent = ScenarioResponse::create([
            'scenario_id' => $scenario->id, 'user_id' => $author->id,
            'body' => 'Top-level discussion answer',
        ]);

        $this->actingAs($author)->postJson("/scenarios/{$scenario->id}/responses", [
            'parent_id' => $parent->id,
            'body' => 'Here is a thoughtful reply',
        ])->assertCreated()
            ->assertJsonPath('reply.body', 'Here is a thoughtful reply')
            ->assertJsonPath('reply.user.id', $author->id)
            ->assertJsonPath('reply.user.profile', null)
            ->assertJsonPath('reply.reactions_count', 0);

        $this->assertDatabaseHas('scenario_responses', [
            'scenario_id' => $scenario->id, 'parent_id' => $parent->id,
            'user_id' => $author->id, 'body' => 'Here is a thoughtful reply',
        ]);
    }

    public function test_nested_reply_receives_its_own_reaction_and_is_visible_on_discussion_page(): void
    {
        $author = $this->member();
        $scenario = $this->scenario();
        $parent = $scenario->responses()->create(['user_id' => $author->id, 'body' => 'A main response']);
        $reply = $scenario->responses()->create([
            'user_id' => $author->id, 'parent_id' => $parent->id, 'body' => 'A reply',
        ]);

        $this->actingAs($author)->postJson("/scenarios/{$scenario->id}/responses/{$reply->id}/reactions", [
            'type' => 'love',
        ])->assertOk()->assertJsonPath('reaction', 'love')->assertJsonPath('count', 1);

        $this->actingAs($author)->get("/scenarios/{$scenario->slug}")->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('responses.data.0.replies.0.reactions_count', 1)
                ->where('responses.data.0.replies.0.reactions.0.type', 'love'));
    }

    public function test_cannot_reply_to_a_reply_or_a_closed_discussion(): void
    {
        $author = $this->member();
        $scenario = $this->scenario();
        $parent = $scenario->responses()->create(['user_id' => $author->id, 'body' => 'A main response']);
        $reply = $scenario->responses()->create([
            'user_id' => $author->id, 'parent_id' => $parent->id, 'body' => 'A reply',
        ]);

        $this->actingAs($author)->postJson("/scenarios/{$scenario->id}/responses", [
            'parent_id' => $reply->id, 'body' => 'Third level is not permitted',
        ])->assertUnprocessable();

        $scenario->update(['status' => 'closed']);
        $this->actingAs($author)->postJson("/scenarios/{$scenario->id}/responses", [
            'parent_id' => $parent->id, 'body' => 'Too late',
        ])->assertNotFound();
    }
}
