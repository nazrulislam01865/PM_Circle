<?php

namespace Tests\Feature\PublicSite;

use App\Models\Post;
use App\Models\Scenario;
use App\Models\User;
use Database\Seeders\DemoScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomeEngagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_homepage_returns_bounded_previews_and_existing_member_reactions(): void
    {
        $this->seed(DemoScenarioSeeder::class);
        $scenario = Scenario::query()->where('slug', 'a-late-change-a-fixed-deadline')->firstOrFail();
        $author = User::factory()->create(['onboarding_step' => 3]);
        $viewer = User::factory()->create(['onboarding_step' => 3]);
        $response = $scenario->responses()->create(['user_id' => $author->id, 'body' => 'Our team would review the change impact carefully.']);
        $post = Post::create(['author_id' => $author->id, 'title' => 'A useful lesson', 'body' => 'Project change control matters.', 'status' => 'published', 'visibility' => 'public', 'published_at' => now()]);

        $this->actingAs($viewer)->postJson("/posts/{$post->id}/reactions", ['type' => 'haha'])->assertOk();
        $this->actingAs($viewer)->postJson("/scenarios/{$scenario->id}/reactions", ['type' => 'love'])->assertOk();
        $this->actingAs($viewer)->postJson("/scenarios/{$scenario->id}/responses/{$response->id}/reactions", ['type' => 'sad'])->assertOk();

        // This test uses ordinary published records, not the local demo-email filter.
        config(['pm-circle.demo_content_enabled' => false]);
        $this->actingAs($viewer)->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('public/Home')
            ->where('scenario.reactions_count', 1)
            ->where('scenario.viewer_reaction', 'love')
            ->where('scenarioResponses.0.reactions_count', 1)
            ->where('scenarioResponses.0.viewer_reaction', 'sad')
            ->where('posts.0.reactions_count', 1)
            ->where('posts.0.viewer_reaction', 'haha')
        );
    }

    public function test_reaction_choices_replace_existing_selection_without_creating_duplicates(): void
    {
        $this->seed(DemoScenarioSeeder::class);
        $scenario = Scenario::query()->where('slug', 'a-late-change-a-fixed-deadline')->firstOrFail();
        $member = User::factory()->create(['onboarding_step' => 3]);
        $response = $scenario->responses()->create(['user_id' => $member->id, 'body' => 'I would verify requirements before promising delivery.']);

        $this->actingAs($member)->postJson("/scenarios/{$scenario->id}/reactions", ['type' => 'like'])->assertOk()->assertJsonPath('count', 1);
        $this->actingAs($member)->postJson("/scenarios/{$scenario->id}/reactions", ['type' => 'angry'])->assertOk()->assertJsonPath('count', 1);
        $this->assertDatabaseCount('scenario_reactions', 1);
        $this->assertDatabaseHas('scenario_reactions', ['scenario_id' => $scenario->id, 'user_id' => $member->id, 'type' => 'angry']);
        $this->actingAs($member)->deleteJson("/scenarios/{$scenario->id}/reactions")->assertOk()->assertJsonPath('count', 0);

        $this->actingAs($member)->postJson("/scenarios/{$scenario->id}/responses/{$response->id}/reactions", ['type' => 'care'])->assertOk()->assertJsonPath('count', 1);
        $this->actingAs($member)->postJson("/scenarios/{$scenario->id}/responses/{$response->id}/reactions", ['type' => 'wow'])->assertOk()->assertJsonPath('count', 1);
        $this->assertDatabaseCount('scenario_response_reactions', 1);
        $this->assertDatabaseHas('scenario_response_reactions', ['scenario_response_id' => $response->id, 'user_id' => $member->id, 'type' => 'wow']);
        $this->actingAs($member)->deleteJson("/scenarios/{$scenario->id}/responses/{$response->id}/reactions")->assertOk()->assertJsonPath('count', 0);
    }

    public function test_guests_cannot_react_and_response_cannot_belong_to_another_scenario(): void
    {
        $this->seed(DemoScenarioSeeder::class);
        $scenarios = Scenario::query()->where('status', 'published')->limit(2)->get();
        $author = User::factory()->create(['onboarding_step' => 3]);
        $response = $scenarios[0]->responses()->create(['user_id' => $author->id, 'body' => 'We would check available team capacity.']);

        $this->postJson("/scenarios/{$scenarios[0]->id}/reactions", ['type' => 'like'])->assertUnauthorized();
        $this->postJson("/scenarios/{$scenarios[0]->id}/responses/{$response->id}/reactions", ['type' => 'love'])->assertUnauthorized();

        $this->actingAs($author)->postJson("/scenarios/{$scenarios[1]->id}/responses/{$response->id}/reactions", ['type' => 'like'])->assertNotFound();
        $this->actingAs($author)->postJson("/scenarios/{$scenarios[0]->id}/reactions", ['type' => 'invalid'])->assertUnprocessable();
        $this->assertDatabaseCount('scenario_response_reactions', 0);
    }
}
