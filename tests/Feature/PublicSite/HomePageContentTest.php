<?php

namespace Tests\Feature\PublicSite;

use App\Models\HomePageContent;
use App\Models\Post;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use Database\Seeders\DemoHomePageSeeder;
use Database\Seeders\DemoScenarioSeeder;
use Database\Seeders\HomePageContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomePageContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_homepage_reads_career_pathway_and_exam_cards_from_the_database(): void
    {
        $this->seed(HomePageContentSeeder::class);

        $page = HomePageContent::query()->where('key', 'home')->firstOrFail();
        $content = $page->content;
        $content['hero']['title'] = 'A database-backed homepage title';
        $content['pathway']['steps']['heading'] = 'A database-backed career pathway';
        $page->update(['content' => $content]);

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('public/Home')
            ->where('content.hero.title', 'A database-backed homepage title')
            ->where('content.pathway.steps.heading', 'A database-backed career pathway')
            ->has('content.pathway.steps.items', 5)
            ->has('content.pathway.exams.items', 3)
            ->missing('statistics')
            ->where('isDemo', true)
            ->has('content.careers.features', 4)
        );
    }

    public function test_demo_seed_is_idempotent_and_homepage_shows_real_seeded_records(): void
    {
        // The public homepage must work with verification required.
        config(['pm-circle.email_verification_required' => true]);

        $this->seed([HomePageContentSeeder::class, DemoScenarioSeeder::class, DemoHomePageSeeder::class]);
        $this->seed(DemoHomePageSeeder::class);

        $this->assertSame(1, User::query()->where('email', 'demo-alex@example.invalid')->count());
        $this->assertSame(1, Post::query()->where('author_id', User::query()->where('email', 'demo-alex@example.invalid')->value('id'))->count());

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('public/Home')
            ->has('members', 3)
            ->has('posts', 2)
            ->where('posts.0.author.name', 'Nadia Rahman')
            ->where('posts.0.comments_count', 12)
            ->where('posts.0.likes_count', 1)
            ->where('posts.1.author.name', 'Alex Rivera')
            ->has('scenarioResponses', 2)
            ->where('scenarioResponses.0.user.name', 'Priya Nair')
            ->where('members.0.name', 'Sara Ahmed')
            ->where('scenario.slug', 'a-late-change-a-fixed-deadline')
        );
    }

    public function test_homepage_preview_queries_are_bounded_and_relationships_are_eager_loaded(): void
    {
        // The public homepage must work with verification required.
        config(['pm-circle.email_verification_required' => true]);

        $this->seed([HomePageContentSeeder::class, DemoScenarioSeeder::class, DemoHomePageSeeder::class]);

        $selects = 0;
        DB::listen(function ($query) use (&$selects): void {
            if (str_starts_with(strtolower(ltrim($query->sql)), 'select')) {
                $selects++;
            }
        });

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('public/Home')
            ->has('posts', 2)
            ->has('scenarioResponses', 2)
            ->has('members', 3)
            ->where('content.scenario.responses_heading', 'Community responses')
            ->has('content.community.topics', 4)
        );

        // Preview counts are SQL aggregates, not per-post queries. Both author
        // and profile relations are eager-loaded for the two bounded lists.
        $this->assertLessThanOrEqual(15, $selects);
    }

    public function test_reseeding_adds_new_pathway_without_overwriting_existing_homepage_edits(): void
    {
        $this->seed(HomePageContentSeeder::class);

        $page = HomePageContent::query()->where('key', 'home')->firstOrFail();
        $content = $page->content;
        unset($content['pathway']);
        $content['hero']['title'] = 'Our custom homepage heading';
        $page->update(['content' => $content]);

        $this->seed(HomePageContentSeeder::class);
        $this->seed(HomePageContentSeeder::class);

        $page->refresh();
        $this->assertSame('Our custom homepage heading', $page->content['hero']['title']);
        $this->assertCount(5, $page->content['pathway']['steps']['items']);
        $this->assertCount(3, $page->content['pathway']['exams']['items']);
        $this->assertSame(1, HomePageContent::query()->where('key', 'home')->count());
    }

    public function test_disabling_demo_mode_prevents_demo_seeding_and_preserves_public_pathway(): void
    {
        config(['pm-circle.demo_content_enabled' => false]);
        $this->seed([HomePageContentSeeder::class, DemoHomePageSeeder::class]);

        $this->assertSame(0, User::query()->where('email', 'demo-alex@example.invalid')->count());
        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('public/Home')
            ->where('isDemo', false)
            ->where('content.pathway.banner.heading', 'Good technical skills need clear communication.')
            ->missing('statistics')
            ->has('posts', 0)
        );
    }
}
