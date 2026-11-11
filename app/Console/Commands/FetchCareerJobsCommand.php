<?php

namespace App\Console\Commands;

use App\Jobs\Careers\FetchCareerJobs;
use Illuminate\Console\Command;
use Throwable;

final class FetchCareerJobsCommand extends Command
{
    protected $signature = 'careers:fetch {--now : Run locally instead of dispatching to the queue}';

    protected $description = 'Fetch external career listings through JobSpy and publish valid jobs automatically';

    public function handle(): int
    {
        $keywords = array_values(array_unique(array_filter(array_map('trim',
            explode(',', (string) config('jobspy.keywords', '')),
        ))));
        $keywords = array_slice($keywords, 0, 5);
        if ($keywords === []) {
            $this->error('No JobSpy keywords configured.');

            return self::FAILURE;
        }

        foreach ($keywords as $keyword) {
            if ($this->option('now')) {
                try {
                    app()->call([new FetchCareerJobs($keyword), 'handle']);
                    $this->info("Completed: {$keyword}");
                } catch (Throwable $exception) {
                    $this->error("Unable to fetch [{$keyword}]: {$exception->getMessage()}");

                    return self::FAILURE;
                }
            } else {
                FetchCareerJobs::dispatch($keyword);
                $this->info("Queued: {$keyword}");
            }
        }

        return self::SUCCESS;
    }
}
