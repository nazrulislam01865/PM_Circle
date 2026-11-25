<?php

namespace App\Services\Resume;

use App\Models\ProfileResume;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\Process\Process;
use ZipArchive;

class ResumeTextExtractor
{
    public function extract(ProfileResume $resume): string
    {
        $disk = Storage::disk('local');
        if (! $disk->exists($resume->storage_path)) {
            throw new RuntimeException('The uploaded document is no longer available.');
        }

        $path = $disk->path($resume->storage_path);
        $extension = strtolower(pathinfo($resume->original_name, PATHINFO_EXTENSION));

        $text = $this->readText($path, $extension);

        $text = preg_replace('/[ \t]+/u', ' ', str_replace("\r", '', $text));
        $text = trim(preg_replace('/\n{3,}/', "\n\n", $text));

        if (mb_strlen($text) < 40) {
            throw new RuntimeException('No readable text was found. Please upload a text-based PDF or DOCX (scanned images are not supported).');
        }

        return mb_substr($text, 0, 30000);
    }

    /** Keep layout spacing for the approved CV parser. Temporary uploads are never persisted. */
    public function extractTemplate(string $path, string $extension): string
    {
        // Require bounded archive reads for this new endpoint; do not use the legacy unzip fallback.
        if ($extension === 'docx' && ! class_exists(ZipArchive::class)) {
            throw new RuntimeException('Word extraction requires PHP ZipArchive on the server.');
        }
        $text = trim($this->readText($path, $extension));
        if (! mb_check_encoding($text, 'UTF-8') || mb_strlen($text) < 40) {
            throw new RuntimeException('No readable text was found. Choose a text-based PDF or DOCX.');
        }
        if (mb_strlen($text) > 30000) {
            throw new RuntimeException('The document contains too much text. Choose a shorter CV.');
        }
        return $text;
    }

    private function readText(string $path, string $extension): string
    {
        return match ($extension) {
            'pdf' => $this->readPdf($path),
            'docx' => $this->readDocx($path),
            default => throw new RuntimeException('Only PDF and DOCX documents can be analysed.'),
        };
    }

    private function readPdf(string $path): string
    {
        $process = new Process(['pdftotext', '-f', '1', '-l', '10', '-layout', '-nopgbrk', '-enc', 'UTF-8', $path, '-']);
        $process->setTimeout(25);
        try {
            $process->run();
        } catch (\Throwable) {
            throw new RuntimeException('PDF extraction is unavailable. Install Poppler (pdftotext) on the application server.');
        }

        if (! $process->isSuccessful()) {
            throw new RuntimeException('This PDF could not be read. Please upload a valid text-based PDF.');
        }

        return $process->getOutput();
    }

    private function readDocx(string $path): string
    {
        if (class_exists(ZipArchive::class)) {
            $archive = new ZipArchive();
            if ($archive->open($path) !== true) {
                throw new RuntimeException('This Word document could not be opened.');
            }
            try {
                $stat = $archive->statName('word/document.xml');
                if (! $stat || $stat['size'] > 3 * 1024 * 1024) {
                    throw new RuntimeException('The Word document text is too large to analyse safely.');
                }
                $xml = $archive->getFromName('word/document.xml');
            } finally {
                $archive->close();
            }
        } else {
            // This fallback supports hosts without ext-zip, without adding a Composer dependency.
            $process = new Process(['unzip', '-p', $path, 'word/document.xml']);
            $process->setTimeout(25);
            try {
                $process->run();
            } catch (\Throwable) {
                throw new RuntimeException('DOCX extraction requires PHP ZipArchive or the unzip utility.');
            }
            $xml = $process->isSuccessful() ? $process->getOutput() : false;
        }

        if (! is_string($xml) || $xml === '' || strlen($xml) > 3 * 1024 * 1024) {
            throw new RuntimeException('The Word document does not contain readable document text.');
        }

        // Preserve paragraph and table boundaries without executing document macros or external links.
        $xml = preg_replace('/<w:(?:p|tr)\b[^>]*>/i', "\n", $xml);
        $xml = preg_replace('/<w:tab\s*\/>/i', "\t", $xml);
        $xml = preg_replace('/<w:br\s*\/>/i', "\n", $xml);
        return html_entity_decode(strip_tags($xml), ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
}
