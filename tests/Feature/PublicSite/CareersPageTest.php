<?php

namespace Tests\Feature\PublicSite;

use App\Jobs\Careers\FetchCareerJobs;
use App\Models\CareerJob;
use App\Services\Careers\JobImportService;
use App\Services\Careers\JobSpyRunner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

class CareersPageTest extends TestCase
{
    use RefreshDatabase;

    private function externalJob(array $changes = []): array
    {
        return array_replace([
            'site' => 'bdjobs',
            'id' => '1548237',
            'title' => 'Project Manager',
            'company' => 'Example Employer',
            'location' => 'Dhaka, Bangladesh',
            'date_posted' => now()->toDateString(),
            'job_type' => 'fulltime',
            'job_url' => 'https://bdjobs.com/h/details/1548237',
            'description' => 'Coordinate project milestones.',
            'min_amount' => 50000,
            'max_amount' => 65000,
            'currency' => 'BDT',
            'interval' => 'monthly',
        ], $changes);
    }

    public function test_imported_jobs_are_public_immediately_without_review(): void
    {
        $result = app(JobImportService::class)->import([$this->externalJob()]);
        $this->assertSame(['accepted' => 1, 'rejected' => 0], $result);

        $job = CareerJob::query()->sole();
        $this->get('/careers')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('career/Jobs')
            ->has('jobs.data', 1)
            ->where('jobs.data.0.title', 'Project Manager')
            ->where('jobs.data.0.source', 'BDJobs')
        );
        $this->get('/careers/'.$job->slug)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('career/Show')
            ->where('job.description', 'Coordinate project milestones.')
            ->where('job.sourceUrl', 'https://bdjobs.com/h/details/1548237')
        );
    }

    public function test_repeated_fetches_update_without_duplicating_jobs(): void
    {
        $importer = app(JobImportService::class);
        $importer->import([$this->externalJob()]);
        $first = CareerJob::query()->sole();

        $importer->import([$this->externalJob(['title' => 'Senior Project Manager'])]);
        $this->assertSame(1, CareerJob::query()->count());
        $this->assertSame('Senior Project Manager', $first->fresh()->title);
        $this->assertSame($first->first_seen_at->toDateTimeString(), $first->fresh()->first_seen_at->toDateTimeString());
    }

    public function test_invalid_records_are_rejected_without_affecting_good_listings(): void
    {
        $importer = app(JobImportService::class);
        $importer->import([$this->externalJob()]);
        $result = $importer->import([
            $this->externalJob(['id' => '1234', 'job_url' => 'javascript:alert(1)']),
            $this->externalJob(['id' => '1235', 'company' => '']),
        ]);

        $this->assertSame(['accepted' => 0, 'rejected' => 2], $result);
        $this->assertDatabaseCount('career_jobs', 1);
    }

    public function test_search_filters_pagination_and_stale_jobs(): void
    {
        $importer = app(JobImportService::class);
        $jobs = [];
        foreach (range(1, 14) as $number) {
            $jobs[] = $this->externalJob([
                'id' => (string) $number,
                'job_url' => "https://bdjobs.com/h/details/{$number}",
                'title' => "Project Manager {$number}",
                'job_type' => $number === 14 ? 'contract' : 'fulltime',
            ]);
        }
        $importer->import($jobs);
        $this->get('/careers')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('jobs.data', 12)
            ->where('jobs.hasMore', true)
        );
        $this->get('/careers?page=2')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('jobs.data', 2)
            ->where('jobs.hasMore', false)
        );
        $this->get('/careers?type=Contract')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('jobs.data', 1)
        );
        $this->get('/careers?q=project%20manager%2014')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('jobs.data', 1)
        );

        $stale = CareerJob::query()->first();
        $stale->forceFill(['last_seen_at' => now()->subDays(50)])->save();
        $this->get('/careers/'.$stale->slug)->assertNotFound();
        $this->get('/careers/%3Cscript%3E')->assertNotFound();
    }

    public function test_missing_jobspy_executable_fails_without_removing_existing_jobs(): void
    {
        app(JobImportService::class)->import([$this->externalJob()]);
        config()->set('jobspy.command', '/nonexistent/jobspy-executable');
        config()->set('jobspy.keywords', 'Project Manager');

        $this->assertSame(1, Artisan::call('careers:fetch', ['--now' => true]));
        $this->assertDatabaseCount('career_jobs', 1);
    }

    public function test_scheduled_command_dispatches_jobs_without_running_external_processes(): void
    {
        Queue::fake();
        config()->set('jobspy.keywords', 'Project Manager,Project Coordinator');
        $this->assertSame(0, Artisan::call('careers:fetch'));
        Queue::assertPushed(FetchCareerJobs::class, 2);
    }

    public function test_missing_cli_is_reported_clearly(): void
    {
        config()->set('jobspy.command', '/nonexistent/jobspy');
        $this->expectException(RuntimeException::class);
        app(JobSpyRunner::class)->fetch('Project Manager');
    }
}
