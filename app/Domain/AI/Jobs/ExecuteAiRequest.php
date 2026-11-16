<?php

namespace App\Domain\AI\Jobs;

use App\Domain\AI\Services\AiExecutionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

final class ExecuteAiRequest implements ShouldQueue
{
    use Queueable;

    public int $tries = 1; // Ambiguous provider timeouts must never cause blind retries.
    public int $timeout = 65;

    public function __construct(public readonly int $requestId) {}

    public function handle(AiExecutionService $service): void
    {
        $service->execute($this->requestId);
    }

    public function failed(Throwable $e): void
    {
        // This is a terminal queue failure; exception contents are not exposed to members.
        app(AiExecutionService::class)->fail($this->requestId, 'QUEUE_JOB_FAILED');
    }
}
