<?php

namespace App\Services\Learning;

use App\Models\LearningCourse;
use App\Support\Admin\CourseMasterData;
use Illuminate\Http\UploadedFile;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Small, strict, atomic course-specific importer; no formulas or macros are evaluated. */
final class CourseQuestionImporter
{
    public const HEADERS = [
        'Question ID', 'Curriculum Section', 'Curriculum Topic', 'Type', 'Difficulty',
        'Scenario / Question', 'Option A', 'Option B', 'Option C', 'Option D',
        'Correct Option', 'Explanation', 'Publish',
    ];

    public function import(LearningCourse $course, UploadedFile $file, bool $publishAll): int
    {
        $rows = match (strtolower($file->getClientOriginalExtension())) {
            'csv' => $this->csv($file->getRealPath()),
            'xlsx' => $this->xlsx($file->getRealPath()),
            default => throw ValidationException::withMessages(['file' => 'Choose a .xlsx or .csv question file.']),
        };
        if (count($rows) < 2 || count($rows) > 501) {
            throw ValidationException::withMessages(['file' => 'Include a header and 1 to 500 questions.']);
        }
        if (array_map('trim', $rows[0]) !== self::HEADERS) {
            throw ValidationException::withMessages(['file' => 'Use the exact 13-column course question template.']);
        }
        $curriculum = collect($course->outline ?? [])
            ->mapWithKeys(fn (array $section) => [$section['title'] => $section['topics'] ?? []])->all();
        $choices = CourseMasterData::values();
        $prepared = [];
        $codes = [];
        foreach (array_slice($rows, 1) as $index => $row) {
            $line = $index + 2;
            $row = array_pad($row, 13, '');
            if (count($row) !== 13) {
                throw ValidationException::withMessages(['file' => "Row {$line}: expected 13 columns."]);
            }
            $row = array_map(static fn ($cell): string => trim((string) $cell), $row);
            if (implode('', $row) === '') {
                continue;
            }
            foreach ($row as $cell) {
                if (! preg_match('//u', $cell)) {
                    throw ValidationException::withMessages(['file' => "Row {$line}: invalid UTF-8 text."]);
                }
            }
            [$code, $section, $topic, $kind, $difficulty, $prompt, $a, $b, $c, $d, $correct, $explanation, $publish] = $row;
            $publish = strtolower($publish);
            $data = [
                'course_id' => $course->id,
                'code' => $code,
                'section_title' => $section,
                'topic_title' => $topic,
                'kind' => strtolower($kind),
                'difficulty' => $difficulty,
                'prompt' => $prompt,
                'options' => ['A' => $a, 'B' => $b, 'C' => $c, 'D' => $d],
                'correct_option' => strtoupper($correct),
                'explanation' => $explanation ?: null,
                'is_published' => $publishAll || in_array($publish, ['yes', '1'], true),
            ];
            $validation = Validator::make($data, [
                'code' => ['required', 'regex:/^[a-zA-Z0-9_-]+$/', 'max:70'],
                'section_title' => ['required', 'string', 'max:200', Rule::in(array_keys($curriculum))],
                'topic_title' => ['required', 'string', 'max:200', Rule::in($curriculum[$section] ?? [])],
                'kind' => ['required', Rule::in(array_intersect($choices['course_question_kind'], ['question', 'scenario']))],
                'difficulty' => ['required', Rule::in(array_intersect($choices['course_question_difficulty'], ['Easy', 'Moderate', 'Hard']))],
                'prompt' => ['required', 'string', 'max:10000'],
                'options.*' => ['required', 'string', 'max:3000'],
                'correct_option' => ['required', Rule::in(['A', 'B', 'C', 'D'])],
                'explanation' => ['nullable', 'string', 'max:20000'],
            ]);
            if ($validation->fails() || ! in_array($publish, ['', 'yes', 'no', '1', '0'], true)) {
                throw ValidationException::withMessages([
                    'file' => "Row {$line}: ".($validation->errors()->first() ?: 'Publish must be Yes or No.'),
                ]);
            }
            if (isset($codes[$code])) {
                throw ValidationException::withMessages(['file' => "Row {$line}: duplicate Question ID {$code}."]);
            }
            $codes[$code] = true;
            $prepared[] = $data;
        }
        if ($prepared === []) {
            throw ValidationException::withMessages(['file' => 'No question rows found.']);
        }
        try {
            return DB::transaction(function () use ($course, $codes, $prepared): int {
            $existing = DB::table('learning_course_questions')->where('course_id', $course->id)
                ->whereIn('code', array_keys($codes))->pluck('code');
            if ($existing->isNotEmpty()) {
                throw ValidationException::withMessages(['file' => 'Question IDs already exist: '.$existing->take(5)->implode(', ').'.']);
            }
            $now = now();
            foreach (array_chunk($prepared, 100) as $batch) {
                DB::table('learning_course_questions')->insert(array_map(static fn (array $row): array => [
                    ...$row, 'options' => json_encode($row['options'], JSON_THROW_ON_ERROR),
                    'created_at' => $now, 'updated_at' => $now,
                ], $batch));
            }
            return count($prepared);
            }, 3);
        } catch (QueryException $exception) {
            if (in_array((string) $exception->getCode(), ['23000', '23505'], true)) {
                throw ValidationException::withMessages(['file' => 'One or more Question IDs already exist. Use new IDs.']);
            }
            throw $exception;
        }
    }

    private function csv(string $path): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw ValidationException::withMessages(['file' => 'Unable to read CSV file.']);
        }
        try {
            $rows = [];
            while (($row = fgetcsv($handle, 0, ',', '"', '')) !== false) {
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
            fclose($handle);
        }
    }

    private function xlsx(string $path): array
    {
        if (! class_exists(\ZipArchive::class) || ! class_exists(\DOMDocument::class)) {
            throw ValidationException::withMessages(['file' => 'PHP zip and DOM extensions are needed for Excel import.']);
        }
        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            throw ValidationException::withMessages(['file' => 'Invalid Excel workbook.']);
        }
        try {
            $read = static function (string $name) use ($zip): string {
                $meta = $zip->statName($name);
                if (! $meta || $meta['size'] > 8 * 1024 * 1024) {
                    throw ValidationException::withMessages(['file' => 'Missing or oversized Excel worksheet.']);
                }
                return $zip->getFromName($name) ?: '';
            };
            $shared = [];
            $sharedXml = $zip->locateName('xl/sharedStrings.xml');
            if ($sharedXml !== false) {
                $xpath = $this->xpath($read('xl/sharedStrings.xml'));
                foreach ($xpath->query('//*[local-name()="si"]') as $item) {
                    $text = '';
                    foreach ($xpath->query('.//*[local-name()="t"]', $item) as $node) {
                        $text .= $node->textContent;
                    }
                    $shared[] = $text;
                }
            }
            $xpath = $this->xpath($read('xl/worksheets/sheet1.xml'));
            $rows = [];
            foreach ($xpath->query('//*[local-name()="sheetData"]/*[local-name()="row"]') as $row) {
                $cells = [];
                foreach ($xpath->query('./*[local-name()="c"]', $row) as $cell) {
                    if ($xpath->query('./*[local-name()="f"]', $cell)->length) {
                        throw ValidationException::withMessages(['file' => 'Excel formulas are not allowed in question cells.']);
                    }
                    preg_match('/^[A-Z]+/', $cell->getAttribute('r'), $match);
                    $column = 0;
                    foreach (str_split($match[0] ?? '') as $letter) {
                        $column = $column * 26 + ord($letter) - 64;
                    }
                    if ($column < 1 || $column > 13) {
                        if ($column > 13) {
                            throw ValidationException::withMessages(['file' => 'Excel file contains columns beyond the template.']);
                        }
                        continue;
                    }
                    $type = $cell->getAttribute('t');
                    if ($type === 'inlineStr') {
                        $value = '';
                        foreach ($xpath->query('.//*[local-name()="t"]', $cell) as $node) {
                            $value .= $node->textContent;
                        }
                    } else {
                        $value = $xpath->query('./*[local-name()="v"]', $cell)->item(0)?->textContent ?? '';
                        if ($type === 's') {
                            $value = $shared[(int) $value] ?? '';
                        }
                    }
                    $cells[$column - 1] = $value;
                }
                if ($cells !== []) {
                    $rows[] = array_replace(array_fill(0, 13, ''), $cells);
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

    private function xpath(string $xml): \DOMXPath
    {
        $document = new \DOMDocument();
        if ($xml === '' || ! $document->loadXML($xml, LIBXML_NONET)) {
            throw ValidationException::withMessages(['file' => 'Invalid Excel worksheet XML.']);
        }
        return new \DOMXPath($document);
    }
}
