<?php

namespace App\Jobs;

use App\Models\ProfileImportSession;
use App\Services\Resume\ResumeImportAnalyzer;
use App\Services\Resume\ResumeTextExtractor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class AnalyzeProfileResume implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;
    public int $timeout = 90;

    public function __construct(public readonly int $importId) {}

    public function handle(ResumeTextExtractor $reader, ResumeImportAnalyzer $analyzer): void
    {
        $import = ProfileImportSession::with('resume')->find($this->importId);
        if (! $import || $import->status !== 'processing' || ! $import->resume || $import->resume->user_id !== $import->user_id) {
            return;
        }

        $result = $analyzer->analyze($reader->extract($import->resume));
        // The member may have removed this file while the queued job was running.
        $fresh = $import->fresh();
        if ($fresh && $fresh->status === 'processing' && $fresh->profile_resume_id === $import->profile_resume_id) {
            $fresh->update(['extracted_data' => $result, 'status' => 'ready']);
        }
    }

    public function failed(Throwable $error): void
    {
        $import = ProfileImportSession::find($this->importId);
        if ($import && $import->status === 'processing') {
            $import->update([
                'status' => 'failed',
                'extracted_data' => ['fields' => [], 'warnings' => [mb_substr($error->getMessage(), 0, 220)]],
            ]);
        }
    }
}
