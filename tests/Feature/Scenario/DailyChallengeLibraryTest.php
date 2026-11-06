<?php

namespace Tests\Feature\Scenario;

use App\Models\Scenario;
use App\Models\User;
use Database\Seeders\DemoScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DailyChallengeLibraryTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_can_browse_published_scenarios_with_real_topic_counts(): void
    {
        $this->seed(DemoScenarioSeeder::class);

        $this->get('/daily-challenge')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('scenarios/Index')
            ->has('scenarios.data', 4)
            ->where('todaySlug', 'a-late-change-a-fixed-deadline')
            ->where('statusCounts.open', 4)
            ->where('statusCounts.closed', 0)
            ->where('filters.tab', 'library')
            ->where('canInteract', false)
        );
    }

    public function test_search_topic_status_and_participation_filters_are_bounded_and_real(): void
    {
        $this->seed(DemoScenarioSeeder::class);
        $closed = Scenario::where('slug', 'your-sponsor-bypasses-change-control')->firstOrFail();
        $closed->update(['status' => 'closed']);
        Scenario::create([
            'slug' => 'unpublished-internal-challenge',
            'title' => 'Internal unpublished challenge',
            'summary' => 'Should not appear',
            'situation' => 'Internal',
            'known_facts' => [],
            'topics' => ['Internal'],
            'focus' => 'Internal',
            'status' => 'draft',
        ]);

        $this->get('/daily-challenge?search=stakeholder')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('scenarios.data', 1)
                ->where('scenarios.data.0.slug', 'a-key-stakeholder-stops-responding'));

        $this->get('/daily-challenge?topic=Governance')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('scenarios.data', 1)
                ->where('scenarios.data.0.status', 'closed'));

        $this->get('/daily-challenge?status=closed')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('scenarios.data', 1)
                ->where('statusCounts.closed', 1));

        $this->get('/daily-challenge?tab=mine')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('scenarios.data', 0));

        $this->get('/scenarios/'.$closed->slug)->assertOk();
    }

    public function test_bookmark_is_idempotent_and_participation_only_shows_own_responses(): void
    {
        $this->seed(DemoScenarioSeeder::class);
        $member = User::factory()->create(['onboarding_step' => 3]);
        $scenario = Scenario::where('slug', 'a-late-change-a-fixed-deadline')->firstOrFail();
        $other = Scenario::where('slug', 'your-sponsor-bypasses-change-control')->firstOrFail();
        $scenario->responses()->create(['user_id' => $member->id, 'body' => 'I will assess change control and document trade-offs before requesting approval.']);

        $this->actingAs($member)->get('/daily-challenge?tab=mine')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('scenarios.data', 1)
                ->where('scenarios.data.0.id', $scenario->id)
                ->where('canInteract', true));

        $this->actingAs($member)->post('/scenarios/'.$other->id.'/bookmark')->assertRedirect();
        $this->actingAs($member)->post('/scenarios/'.$other->id.'/bookmark')->assertRedirect();
        $this->assertDatabaseCount('scenario_reactions', 1);
        $this->actingAs($member)->delete('/scenarios/'.$other->id.'/bookmark')->assertRedirect();
        $this->assertDatabaseCount('scenario_reactions', 0);
    }

    public function test_invalid_filters_are_rejected_without_loading_records(): void
    {
        $this->get('/daily-challenge?tab=invalid')->assertSessionHasErrors('tab');
    }
}
