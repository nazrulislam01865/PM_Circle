<?php

namespace App\Jobs;

use App\Models\ProfileImportSession;
use App\Domain\AI\Services\CvExtractionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;
use Illuminate\Support\Facades\Log;

class AnalyzeProfileResume implements ShouldQueue
{
    use Queueable;

    // Provider timeouts are ambiguous; require an explicit member retry to avoid duplicate charges.
    public int $tries = 1;
    public int $timeout = 80;

    public function __construct(public readonly int $importId) {}

    public function handle(CvExtractionService $extractor): void
    {
        $import = ProfileImportSession::with('resume')->find($this->importId);
        if (! $import || $import->status !== 'processing' || ! $import->resume || $import->resume->user_id !== $import->user_id) {
            return;
        }

        $consented = ($import->extracted_data['ai_consent'] ?? false) === true;
        $result = $extractor->analyze($import->resume, $consented);
        $result['ai_consent'] = $consented;
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
                'extracted_data' => ['fields' => [], 'ai_consent' => ($import->extracted_data['ai_consent'] ?? false) === true, 'warnings' => [
                    'The document could not be analysed. Check the document and AI provider configuration, then retry. Scanned files require AI extraction to be enabled.',
                ]],
            ]);
        }
    }
}
