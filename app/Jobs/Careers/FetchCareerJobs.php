<?php

namespace App\Jobs\Careers;

use App\Services\Careers\JobImportService;
use App\Services\Careers\JobSpyRunner;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

final class FetchCareerJobs implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    public int $tries = 1;
    public int $timeout = 75;
    public int $uniqueFor = 900;

    public function __construct(public readonly string $keyword) {}

    public function uniqueId(): string
    {
        return 'jobspy:'.hash('sha256', $this->keyword);
    }

    public function handle(JobSpyRunner $runner, JobImportService $importer): void
    {
        $result = $importer->import($runner->fetch($this->keyword));

        Log::info('Career job fetch completed', [
            'keyword' => $this->keyword,
            'accepted' => $result['accepted'],
            'rejected' => $result['rejected'],
        ]);
    }

    public function failed(?Throwable $exception): void
    {
        Log::warning('Career job fetch failed; existing listings preserved', [
            'keyword' => $this->keyword,
            'error_type' => $exception ? $exception::class : 'Unknown',
        ]);
    }
}
