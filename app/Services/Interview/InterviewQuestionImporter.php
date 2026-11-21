<?php

namespace App\Services\Interview;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Strict CSV/XLSX interview import. Every row is checked before any writes. */
final class InterviewQuestionImporter
{
    public const HEADERS = ['Question Type', 'Interview Question', 'Active', 'Display Order'];

    public function import(int $setId, UploadedFile $file): int
    {
        $rows = match (strtolower($file->getClientOriginalExtension())) {
            'csv' => $this->csv($file->getRealPath()),
            'xlsx' => $this->xlsx($file->getRealPath()),
            default => throw ValidationException::withMessages(['file' => 'Upload a CSV or XLSX question file.']),
        };
        if (count($rows) < 2 || count($rows) > 501) {
            throw ValidationException::withMessages(['file' => 'Use the template with 1 to 500 questions per upload.']);
        }
        if (array_map('trim', $rows[0]) !== self::HEADERS) {
            throw ValidationException::withMessages(['file' => 'The column headings must exactly match the downloaded template.']);
        }
        $types = DB::table('master_data_options')->where('category', 'interview_type')
            ->where('is_active', true)->pluck('value')->all();
        $prepared = [];
        $seen = [];
        foreach (array_slice($rows, 1) as $index => $row) {
            $line = $index + 2;
            if (count($row) === 1 && trim((string) $row[0]) === '') {
                continue;
            }
            if (count($row) !== 4) {
                throw ValidationException::withMessages(['file' => "Row {$line}: exactly four columns are required."]);
            }
            $cells = array_map(static fn ($v): string => trim((string) $v), $row);
            if (implode('', $cells) === '') {
                continue;
            }
            foreach ($cells as $cell) {
                if (! preg_match('//u', $cell)) {
                    throw ValidationException::withMessages(['file' => "Row {$line}: invalid UTF-8 text."]);
                }
            }
            [$type, $text, $active, $sortOrder] = $cells;
            if (! in_array($type, $types, true)) {
                throw ValidationException::withMessages(['file' => "Row {$line}: choose an active question type from Master Data."]);
            }
            if (mb_strlen($text) < 10 || mb_strlen($text) > 4000) {
                throw ValidationException::withMessages(['file' => "Row {$line}: question must be 10 to 4,000 characters."]);
            }
            if (! in_array(strtolower($active), ['yes', 'no', '1', '0'], true)) {
                throw ValidationException::withMessages(['file' => "Row {$line}: Active must be Yes or No."]);
            }
            if ($sortOrder === '' || ! ctype_digit($sortOrder) || (int) $sortOrder > 65535) {
                throw ValidationException::withMessages(['file' => "Row {$line}: Display Order must be between 0 and 65535."]);
            }
            if (isset($seen[$text])) {
                throw ValidationException::withMessages(['file' => "Row {$line}: this question is duplicated in the file."]);
            }
            $seen[$text] = true;
            $prepared[] = [
                'set_id' => $setId, 'type' => $type, 'text' => $text,
                'is_active' => in_array(strtolower($active), ['yes', '1'], true),
                'sort_order' => (int) $sortOrder,
            ];
        }
        if ($prepared === []) {
            throw ValidationException::withMessages(['file' => 'There are no question rows to import.']);
        }

        return DB::transaction(function () use ($setId, $prepared): int {
            // Serialize imports targeting the same set, and forbid deletion mid-import.
            $set = DB::table('interview_question_sets')->where('id', $setId)->lockForUpdate()->first(['id']);
            if (! $set) {
                throw ValidationException::withMessages(['set_id' => 'The selected question set no longer exists.']);
            }
            foreach (array_chunk(array_column($prepared, 'text'), 100) as $texts) {
                if (DB::table('interview_questions')->where('set_id', $setId)->whereIn('text', $texts)->exists()) {
                    throw ValidationException::withMessages(['file' => 'One or more questions already exist in this set. Import cancelled without changes.']);
                }
            }
            $now = now();
            foreach (array_chunk($prepared, 100) as $batch) {
                DB::table('interview_questions')->insert(array_map(static fn (array $item): array =>
                    $item + ['created_at' => $now, 'updated_at' => $now], $batch));
            }
            return count($prepared);
        }, 3);
    }

    private function csv(string $path): array
    {
        $file = fopen($path, 'rb');
        if ($file === false) {
            throw ValidationException::withMessages(['file' => 'Unable to read the CSV file.']);
        }
        try {
            $rows = [];
            while (($row = fgetcsv($file, 0, ',', '"', '')) !== false) {
                if ($rows === [] && isset($row[0])) {
                    $row[0] = preg_replace('/^\xEF\xBB\xBF/', '', $row[0]);
                }
                $rows[] = $row;
                if (count($rows) > 501) {
                    break;
                }
            }
            return $rows;
        } finally {
            fclose($file);
        }
    }

    private function xlsx(string $path): array
    {
        if (! class_exists(\ZipArchive::class) || ! class_exists(\DOMDocument::class)) {
            throw ValidationException::withMessages(['file' => 'PHP ZipArchive and DOM are required to import Excel.']);
        }
        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            throw ValidationException::withMessages(['file' => 'Invalid Excel workbook.']);
        }
        try {
            $read = static function (string $name) use ($zip): string {
                $meta = $zip->statName($name);
                if (! $meta || $meta['size'] > 8 * 1024 * 1024) {
                    throw ValidationException::withMessages(['file' => 'Excel worksheet is missing or oversized.']);
                }
                return $zip->getFromName($name) ?: '';
            };
            $shared = [];
            if ($zip->locateName('xl/sharedStrings.xml') !== false) {
                $xml = $this->xpath($read('xl/sharedStrings.xml'));
                foreach ($xml->query('//*[local-name()="si"]') as $item) {
                    $value = '';
                    foreach ($xml->query('.//*[local-name()="t"]', $item) as $text) {
                        $value .= $text->textContent;
                    }
                    $shared[] = $value;
                }
            }
            $xml = $this->xpath($read('xl/worksheets/sheet1.xml'));
            $rows = [];
            foreach ($xml->query('//*[local-name()="sheetData"]/*[local-name()="row"]') as $row) {
                $cells = [];
                foreach ($xml->query('./*[local-name()="c"]', $row) as $cell) {
                    if ($xml->query('./*[local-name()="f"]', $cell)->length > 0) {
                        throw ValidationException::withMessages(['file' => 'Excel formulas are not allowed in interview questions.']);
                    }
                    preg_match('/^[A-Z]+/', $cell->getAttribute('r'), $match);
                    $column = 0;
                    foreach (str_split($match[0] ?? '') as $letter) {
                        $column = $column * 26 + ord($letter) - 64;
                    }
                    if ($column < 1 || $column > 4) {
                        throw ValidationException::withMessages(['file' => 'The workbook must use only the four template columns.']);
                    }
                    $type = $cell->getAttribute('t');
                    if ($type === 'inlineStr') {
                        $value = '';
                        foreach ($xml->query('.//*[local-name()="t"]', $cell) as $text) {
                            $value .= $text->textContent;
                        }
                    } else {
                        $value = $xml->query('./*[local-name()="v"]', $cell)->item(0)?->textContent ?? '';
                        if ($type === 's') {
                            if (! isset($shared[(int) $value])) {
                                throw ValidationException::withMessages(['file' => 'Invalid Excel shared-string reference.']);
                            }
                            $value = $shared[(int) $value];
                        }
                    }
                    $cells[$column - 1] = $value;
                }
                if ($cells !== []) {
                    $rows[] = array_replace(array_fill(0, 4, ''), $cells);
                }
                if (count($rows) > 501) {
                    break;
                }
            }
            return $rows;
        } finally {
            $zip->close();
        }
    }

    private function xpath(string $source): \DOMXPath
    {
        $document = new \DOMDocument();
        if ($source === '' || ! $document->loadXML($source, LIBXML_NONET)) {
            throw ValidationException::withMessages(['file' => 'Invalid Excel worksheet XML.']);
        }
        return new \DOMXPath($document);
    }
}
