<?php

namespace Tests\Feature\Careers;

use App\Services\Careers\JobSpyRunner;
use Illuminate\Support\Facades\File;
use JsonException;
use Tests\TestCase;

class JobSpyRunnerTest extends TestCase
{
    private function fakeExecutable(string $output): string
    {
        $file = storage_path('framework/jobspy-fixture-'.bin2hex(random_bytes(8)));
        File::ensureDirectoryExists(dirname($file));
        File::put($file, '#!/bin/sh' . "\n" . 'for arg do output="$arg"; done' . "\n"
            . 'printf %s '.escapeshellarg($output).' > "$output"' . "\n");
        chmod($file, 0755);

        return $file;
    }

    public function test_runner_reads_valid_jsonl_from_a_local_cli_fixture(): void
    {
        $bin = $this->fakeExecutable('{"site":"bdjobs","id":"1","title":"PM"}'."\n");
        try {
            config()->set('jobspy.command', $bin);
            $rows = app(JobSpyRunner::class)->fetch('Project Manager');
            $this->assertCount(1, $rows);
            $this->assertSame('PM', $rows[0]['title']);
        } finally {
            File::delete($bin);
        }
    }

    public function test_runner_rejects_malformed_jsonl(): void
    {
        $bin = $this->fakeExecutable('{invalid-json}' . "\n");
        try {
            config()->set('jobspy.command', $bin);
            $this->expectException(JsonException::class);
            app(JobSpyRunner::class)->fetch('Project Manager');
        } finally {
            File::delete($bin);
        }
    }
}
