<?php

namespace App\Domain\Identity\Services;

use Illuminate\Http\Response;
use ZipArchive;

/** One private export pipeline for saved profiles and the current assistant editor. */
final class ResumeExport
{
    public const SECTIONS = [
        'education' => 'Education', 'experience' => 'Work Experience', 'research' => 'Research Work',
        'projects' => 'Projects', 'skills' => 'Skills', 'achievements' => 'Achievements',
        'interests' => 'Interests', 'languages' => 'Languages', 'certifications' => 'Certifications',
    ];

    public static function rows(array $document, string $section): array
    {
        return array_values(array_filter($document[$section] ?? [], fn ($row) => count(array_filter($row, fn ($value) => trim((string) $value) !== '')) > 0));
    }

    public static function details(array $row): array
    {
        $details = [];
        foreach (['description' => '', 'courses' => 'Courses', 'technical' => 'Technical Skills', 'soft' => 'Soft Skills', 'team' => 'Team Members'] as $key => $label) {
            foreach (preg_split('/\R/u', (string) ($row[$key] ?? '')) ?: [] as $line) {
                $line = preg_replace('/^[•\-]\s*/u', '', trim($line));
                if ($line !== '') $details[] = [$label, $line];
            }
        }
        return $details;
    }

    public function render(array $fields, array $document, string $format): Response
    {
        $headers = ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff', 'X-Frame-Options' => 'DENY'];
        if ($format === 'pdf') {
            return response()->view('profile.resume-export', compact('fields', 'document', 'format'), 200, $headers);
        }

        abort_unless(class_exists(ZipArchive::class), 503, 'Word export is temporarily unavailable.');
        $file = tempnam(sys_get_temp_dir(), 'pm-cv-');
        abort_if($file === false, 503, 'Word export is temporarily unavailable.');
        $zip = new ZipArchive();
        $opened = false;
        try {
            abort_unless($zip->open($file, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true, 503, 'Word export is temporarily unavailable.');
            $opened = true;
            foreach (ResumeWordDocument::parts($fields, $document, strtoupper(now()->format('M, Y'))) as $name => $content) {
                abort_unless($zip->addFromString($name, $content), 503, 'Word export is temporarily unavailable.');
            }
            $closed = $zip->close();
            $opened = false;
            abort_unless($closed, 503, 'Word export is temporarily unavailable.');
            $bytes = file_get_contents($file);
            abort_if($bytes === false || $bytes === '', 503, 'Word export is temporarily unavailable.');
            return response($bytes, 200, [...$headers,
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition' => 'attachment; filename="pm-circle-resume.docx"',
            ]);
        } finally {
            if ($opened) $zip->close();
            @unlink($file);
        }
    }
}
