<?php

namespace App\Services\Careers;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

final class JobSpyRunner
{
    /** @return list<array<string, mixed>> */
    public function fetch(string $keyword): array
    {
        $command = (string) config('jobspy.command');
        if (! is_file($command) || ! is_executable($command)) {
            throw new RuntimeException('JobSpy CLI is not installed or executable at the configured JOBSPY_COMMAND path.');
        }

        $site = strtolower(trim((string) config('jobspy.site', 'bdjobs')));
        if (! in_array($site, ['bdjobs', 'indeed', 'linkedin', 'glassdoor', 'zip_recruiter', 'bayt', 'naukri', 'hellowork'], true)) {
            throw new RuntimeException('Unsupported JobSpy source.');
        }

        $directory = storage_path('app/private/jobspy');
        File::ensureDirectoryExists($directory);
        $output = $directory.'/'.Str::uuid().'.jsonl';

        try {
            $args = [
                $command, $keyword, '--site', $site,
                '--location', (string) config('jobspy.location', 'Dhaka'),
                '--hours-old', (string) max(1, min(720, (int) config('jobspy.hours_old', 72))),
                '-n', (string) max(1, min(25, (int) config('jobspy.results_wanted', 15))),
                '--description-format', 'plain',
                '-o', $output,
            ];
            $result = Process::timeout(55)->run($args);

            if ($result->failed()) {
                Log::warning('JobSpy CLI returned an error', [
                    'site' => $site,
                    'exit_code' => $result->exitCode(),
                    'diagnostic' => Str::limit(trim($result->errorOutput()), 500),
                ]);
                throw new RuntimeException('JobSpy could not fetch results (exit '.$result->exitCode().').');
            }
            if (! is_file($output)) {
                throw new RuntimeException('JobSpy did not write its expected JSONL result file.');
            }
            if (filesize($output) > 6 * 1024 * 1024) {
                throw new RuntimeException('JobSpy result file exceeded the safe 6 MB limit.');
            }

            $rows = [];
            $handle = fopen($output, 'rb');
            if ($handle === false) {
                throw new RuntimeException('Cannot read JobSpy result file.');
            }
            try {
                while (($line = fgets($handle, 256 * 1024)) !== false) {
                    if (! str_ends_with($line, "\n") && ! feof($handle)) {
                        throw new RuntimeException('JobSpy produced an oversized JSONL record.');
                    }
                    if (trim($line) === '') {
                        continue;
                    }
                    $row = json_decode($line, true, 16, JSON_THROW_ON_ERROR);
                    if (! is_array($row) || array_is_list($row)) {
                        throw new RuntimeException('JobSpy returned an invalid job record.');
                    }
                    $rows[] = $row;
                    if (count($rows) > 50) {
                        throw new RuntimeException('JobSpy returned more records than allowed.');
                    }
                }
            } finally {
                fclose($handle);
            }

            return $rows;
        } finally {
            File::delete($output);
        }
    }
}
