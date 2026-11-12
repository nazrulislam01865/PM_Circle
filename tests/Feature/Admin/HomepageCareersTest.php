<?php

namespace Tests\Feature\Admin;

use App\Models\CareerJob;
use App\Models\HomePageContent;
use Database\Seeders\HomePageContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomepageCareersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(HomePageContentSeeder::class);
    }

    private function job(int $number, int $lastSeenDaysAgo = 0): void
    {
        CareerJob::query()->create([
            'slug' => "career-preview-{$number}",
            'fingerprint' => hash('sha256', "career-preview-{$number}"),
            'source' => 'bdjobs',
            'title' => "Project role {$number}",
            'company' => "Company {$number}",
            'location' => 'Dhaka',
            'job_type' => 'Full time',
            'posted_at' => today()->subDays(10 - $number),
            'source_url' => "https://example.test/jobs/{$number}",
            'first_seen_at' => now()->subDays(12),
            'last_seen_at' => now()->subDays($lastSeenDaysAgo),
        ]);
    }

    public function test_homepage_uses_at_most_three_latest_current_career_jobs(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            $this->job($i);
        }
        $this->job(6, 90); // Stale listing must be excluded even if it has a newer post date.

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('public/Home')
            ->has('jobs', 3)
            ->where('jobs.0.slug', 'career-preview-5')
            ->where('jobs.1.slug', 'career-preview-4')
            ->where('jobs.2.slug', 'career-preview-3')
            ->where('jobs.0.title', 'Project role 5')
        );
    }

    public function test_homepage_career_query_is_skipped_when_opportunities_are_hidden(): void
    {
        $this->job(1);
        $homepage = HomePageContent::query()->where('key', 'home')->firstOrFail();
        $content = $homepage->content;
        $content['sections']['careers'] = false;
        $homepage->update(['content' => $content]);

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('jobs', 0)
        );
    }

    public function test_legacy_sample_job_cards_are_never_used_as_live_opportunities(): void
    {
        config(['pm-circle.demo_content_enabled' => true]);
        $homepage = HomePageContent::query()->where('key', 'home')->firstOrFail();
        $content = $homepage->content;
        $content['careers']['show_sample_opportunities'] = true;
        $homepage->update(['content' => $content]);

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('jobs', 0)
        );
    }
}
