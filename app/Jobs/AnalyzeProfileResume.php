<?php

namespace App\Jobs;

use App\Models\ProfileImportSession;
use App\Services\Resume\ResumeImportAnalyzer;
use App\Services\Resume\ResumeTextExtractor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;
use Illuminate\Support\Facades\Log;

class AnalyzeProfileResume implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;
    public int $timeout = 60;

    public function __construct(public readonly int $importId) {}

    public function handle(ResumeTextExtractor $reader, ResumeImportAnalyzer $analyzer): void
    {
        $import = ProfileImportSession::with('resume')->find($this->importId);
        if (! $import || $import->status !== 'processing' || ! $import->resume || $import->resume->user_id !== $import->user_id) {
            return;
        }

        $result = $analyzer->analyze($reader->extract($import->resume));
        // One conditional UPDATE prevents a slow previous attempt from restoring a
        // cancelled import after the member retries or removes its source file.
        ProfileImportSession::query()
            ->whereKey($import->id)
            ->where('status', 'processing')
            ->where('profile_resume_id', $import->profile_resume_id)
            ->update(['extracted_data' => $result, 'status' => 'ready']);
    }

    public function failed(Throwable $error): void
    {
        $import = ProfileImportSession::find($this->importId);
        if ($import && $import->status === 'processing') {
            // Do not disclose filesystem paths or system error details to members.
            Log::warning('Resume analysis job failed.', [
                'import_id' => $import->id,
                'exception' => $error::class,
            ]);
            $import->update([
                'status' => 'failed',
                'extracted_data' => ['fields' => [], 'warnings' => [
                    'The document could not be analysed. Check that it contains selectable text and retry, or ask support to check the processing service.',
                ]],
            ]);
        }
    }
}
