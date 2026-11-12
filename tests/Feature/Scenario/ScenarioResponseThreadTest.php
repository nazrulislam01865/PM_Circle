<?php

namespace Tests\Feature\Scenario;

use App\Models\Profile;
use App\Models\Scenario;
use App\Models\User;
use Database\Seeders\DemoScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ScenarioResponseThreadTest extends TestCase
{
    use RefreshDatabase;

    public function test_two_and_three_character_responses_and_replies_are_allowed_but_one_character_is_not(): void
    {
        $this->seed(DemoScenarioSeeder::class);
        $member = User::factory()->create(['onboarding_step' => 3]);
        $scenario = Scenario::where('slug', 'a-late-change-a-fixed-deadline')->firstOrFail();

        $this->actingAs($member)->post("/scenarios/{$scenario->id}/responses", ['body' => 'x'])
            ->assertSessionHasErrors('body');
        $this->actingAs($member)->post("/scenarios/{$scenario->id}/responses", ['body' => 'OK'])
            ->assertSessionHasNoErrors();

        $parent = $scenario->responses()->whereNull('parent_id')->sole();
        $this->actingAs($member)->post("/scenarios/{$scenario->id}/responses", [
            'body' => 'Yes', 'parent_id' => $parent->id,
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('scenario_responses', [
            'scenario_id' => $scenario->id, 'parent_id' => null, 'body' => 'OK',
        ]);
        $this->assertDatabaseHas('scenario_responses', [
            'scenario_id' => $scenario->id, 'parent_id' => $parent->id, 'body' => 'Yes',
        ]);
    }

    public function test_replies_must_belong_to_a_top_level_response_in_the_same_scenario(): void
    {
        $this->seed(DemoScenarioSeeder::class);
        $member = User::factory()->create(['onboarding_step' => 3]);
        $scenario = Scenario::where('slug', 'a-late-change-a-fixed-deadline')->firstOrFail();
        $other = Scenario::where('slug', 'your-sponsor-bypasses-change-control')->firstOrFail();
        $foreign = $other->responses()->create(['user_id' => $member->id, 'body' => 'Foreign']);
        $parent = $scenario->responses()->create(['user_id' => $member->id, 'body' => 'Parent']);
        $reply = $scenario->responses()->create([
            'user_id' => $member->id, 'body' => 'Nested', 'parent_id' => $parent->id,
        ]);

        foreach ([$foreign->id, $reply->id] as $invalidParentId) {
            $this->actingAs($member)->post("/scenarios/{$scenario->id}/responses", [
                'body' => 'Hi', 'parent_id' => $invalidParentId,
            ])->assertSessionHasErrors('parent_id');
        }

        $this->assertSame(2, $scenario->responses()->count());
    }

    public function test_scenario_detail_returns_public_profile_avatars_and_actual_direct_replies(): void
    {
        $this->seed(DemoScenarioSeeder::class);
        $author = User::factory()->create(['onboarding_step' => 3]);
        $scenario = Scenario::where('slug', 'a-late-change-a-fixed-deadline')->firstOrFail();
        $profile = new Profile([
            'visibility' => 'public',
            'avatar_path' => '/storage/profile-avatars/author.png',
        ]);
        $profile->user_id = $author->id;
        $profile->save();
        $parent = $scenario->responses()->create(['user_id' => $author->id, 'body' => 'Initial']);
        $scenario->responses()->create([
            'user_id' => $author->id, 'body' => 'Follow-up', 'parent_id' => $parent->id,
        ]);

        $this->get("/scenarios/{$scenario->slug}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('scenarios/Show')
            ->has('responses.data', 1)
            ->has('responses.data.0.replies', 1)
            ->where('responses.data.0.user.profile.avatar_path', '/profile-media/avatar/author.png')
            ->where('responses.data.0.replies.0.user.profile.avatar_path', '/profile-media/avatar/author.png')
            ->where('responses.data.0.replies.0.parent_id', $parent->id)
            ->etc());
    }
}
