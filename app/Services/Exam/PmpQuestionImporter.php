<?php

namespace App\Services\Exam;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Strict, atomic CSV/XLSX import; no macros or spreadsheet formulas are executed. */
final class PmpQuestionImporter
{
    public const HEADERS = PmpQuestionContent::WORKBOOK_HEADERS;

    public function import(UploadedFile $file, bool $activateAll = false): int
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $rows = match ($extension) {
            'csv' => $this->csv($file->getRealPath()),
            'xlsx' => $this->xlsx($file->getRealPath()),
            default => throw ValidationException::withMessages(['file' => 'Upload an Excel (.xlsx) or CSV (.csv) file.']),
        };

        if (count($rows) < 2) {
            throw ValidationException::withMessages(['file' => 'Include a heading row and at least one question.']);
        }
        if (count($rows) > 1001) {
            throw ValidationException::withMessages(['file' => 'Import at most 1,000 questions per file.']);
        }
        $headers = array_map(fn ($value) => strtolower(trim(preg_replace('/[^a-z0-9]+/i', '_', (string) $value), '_')), $rows[0]);
        if (count(array_unique($headers)) !== count($headers)) {
            throw ValidationException::withMessages(['file' => 'The header row contains duplicate column names.']);
        }
        $headerLookup = array_flip($headers);
        $isWorkbook = array_key_exists('question_id', $headerLookup);
        if ($isWorkbook) {
            $expected = array_map(static fn (string $header): string => strtolower(trim(
                preg_replace('/[^a-z0-9]+/i', '_', $header), '_'
            )), PmpQuestionContent::WORKBOOK_HEADERS);
            if ($headers !== $expected) {
                throw ValidationException::withMessages([
                    'file' => 'The Question Bank must contain exactly the original 30 columns in their original order, with no renamed, missing, or extra columns.',
                ]);
            }
        }
        $required = $isWorkbook
            ? array_map(static fn (string $header): string => strtolower(trim(preg_replace('/[^a-z0-9]+/i', '_', $header), '_')),
                PmpQuestionContent::WORKBOOK_HEADERS)
            : ['domain', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct'];
        foreach ($required as $header) {
            if (! array_key_exists($header, $headerLookup)) {
                throw ValidationException::withMessages(['file' => "Missing required column: {$header}. Download the Excel template for the exact headings."]);
            }
        }

        $prepared = [];
        $errors = [];
        $seen = [];
        foreach (array_slice($rows, 1) as $index => $row) {
            $line = $index + 2;
            if (trim(implode('', $row)) === '') {
                continue;
            }
            foreach ($row as $cell) {
                if (! preg_match('//u', (string) $cell)) {
                    $errors[] = "Row {$line}: text must be UTF-8. Save Excel exports as CSV UTF-8.";
                    break;
                }
            }
            $value = static fn (string $key): string => trim((string) ($row[$headerLookup[$key] ?? -1] ?? ''));
            $correct = strtoupper($value($isWorkbook ? 'correct_option' : 'correct'));
            $options = [
                'A' => $value('option_a'), 'B' => $value('option_b'),
                'C' => $value('option_c'), 'D' => $value('option_d'),
            ];
            $prompt = $value('question');
            $code = $isWorkbook ? $value('question_id') : ($value('code') ?: 'pmp-'.substr(hash('sha256', $prompt), 0, 24));
            $data = [
                'code' => $code,
                'domain' => $value($isWorkbook ? 'exam_domain' : 'domain'),
                'difficulty' => $value('difficulty') ?: 'Moderate',
                'prompt' => $prompt,
                'options' => $options,
                'correct_option' => $correct,
                'correct_answer_text' => $isWorkbook ? $value('correct_answer') : ($options[$correct] ?? null),
                'explanation' => $value($isWorkbook ? 'why_correct' : 'explanation'),
                'other_options' => $isWorkbook ? null : ($value('other_options') ?: null),
                'takeaway' => $value($isWorkbook ? 'key_takeaway' : 'takeaway') ?: null,
                'concepts' => $value($isWorkbook ? 'related_concepts' : 'concepts') ?: null,
                'references' => $isWorkbook ? null : ($value('references') ?: null),
                'is_active' => false,
            ];
            if ($isWorkbook) {
                $rationales = [
                    'A' => $value('rationale_a'), 'B' => $value('rationale_b'),
                    'C' => $value('rationale_c'), 'D' => $value('rationale_d'),
                ];
                $data += [
                    'eco_task_id' => $value('eco_task_id') ?: null,
                    'eco_task_focus' => $value('eco_task_focus') ?: null,
                    'approach' => $value('approach') ?: null,
                    'option_rationales' => $rationales,
                    'pmbok_performance_domain' => $value('pmbok_8_performance_domain') ?: null,
                    'legacy_knowledge_area' => $value('legacy_knowledge_area') ?: null,
                    'industry' => $value('industry') ?: null,
                    'question_type' => $value('question_type'),
                    'reference_publication' => $value('reference_publication') ?: null,
                    'reference_section' => $value('reference_section') ?: null,
                    'reference_heading' => $value('reference_heading') ?: null,
                    'reference_pdf_page' => $value('reference_pdf_page') ?: null,
                    'eco_reference' => $value('eco_reference') ?: null,
                    'review_status' => $value('review_status'),
                ];
                // Explicit admin import option approves new rows before activation.
                // Without it, retain the source review state and current publication rules.
                $data['review_status'] = $activateAll ? 'Approved' : $data['review_status'];
                $data['is_active'] = $data['review_status'] === 'Approved';
                $data['other_options'] = PmpQuestionContent::otherOptionRationales($rationales, $correct);
                $data['references'] = PmpQuestionContent::referenceSummary($data);
                if (isset($options[$correct]) && PmpQuestionContent::cleanAnswer($value('correct_answer'))
                    !== PmpQuestionContent::cleanAnswer($options[$correct])) {
                    $errors[] = "Row {$line}: Correct Answer must match Option {$correct}.";
                }
            } else {
                $active = strtolower($value('active') ?: '0');
                if (! in_array($active, ['1', '0', 'yes', 'no', 'true', 'false'], true)) {
                    $errors[] = "Row {$line}: active must be yes/no or 1/0.";
                }
                $data['is_active'] = $activateAll || in_array($active, ['1', 'yes', 'true'], true);
                $data['review_status'] = $data['is_active'] ? 'Approved' : 'Editorial draft';
            }

            $rules = [
                'code' => ['required', 'regex:/^[a-zA-Z0-9_-]+$/', 'max:70'],
                'domain' => ['required', Rule::in(['People', 'Process', 'Business Environment'])],
                'difficulty' => ['required', Rule::in(['Easy', 'Moderate', 'Hard'])],
                'prompt' => ['required', 'string', 'max:10000'],
                'options.*' => ['required', 'string', 'max:3000'],
                'correct_option' => ['required', Rule::in(['A', 'B', 'C', 'D'])],
                'correct_answer_text' => ['required', 'string', 'max:3000'],
                'explanation' => ['nullable', 'string', 'max:20000'],
            ];
            if ($isWorkbook) {
                $rules += [
                    'eco_task_id' => ['nullable', 'string', 'max:24'],
                    'eco_task_focus' => ['nullable', 'string', 'max:255'],
                    'approach' => ['required', Rule::in(PmpQuestionContent::APPROACHES)],
                    'option_rationales.*' => ['nullable', 'string', 'max:3000'],
                    'pmbok_performance_domain' => ['nullable', 'string', 'max:150'],
                    'legacy_knowledge_area' => ['nullable', 'string', 'max:150'],
                    'industry' => ['nullable', 'string', 'max:120'],
                    'question_type' => ['required', Rule::in(['Single Select'])],
                    'reference_publication' => ['nullable', 'string', 'max:255'],
                    'reference_section' => ['nullable', 'string', 'max:100'],
                    'reference_heading' => ['nullable', 'string', 'max:255'],
                    'reference_pdf_page' => ['nullable', 'integer', 'between:1,32767'],
                    'eco_reference' => ['nullable', 'string', 'max:350'],
                    'review_status' => ['required', Rule::in(PmpQuestionContent::REVIEW_STATUSES)],
                ];
            }
            $validator = Validator::make($data, $rules);
            if ($validator->fails()) {
                $errors[] = "Row {$line}: ".$validator->errors()->first();
            }
            if (isset($seen[$code])) {
                $errors[] = "Row {$line}: duplicate question code {$code}.";
            }
            $seen[$code] = true;
            $prepared[] = $data;
            if (count($errors) >= 12) {
                break;
            }
        }
        if ($errors !== []) {
            throw ValidationException::withMessages(['file' => implode(' ', array_slice($errors, 0, 12))]);
        }
        if ($prepared === []) {
            throw ValidationException::withMessages(['file' => 'No valid question rows were found.']);
        }

        try {
            return DB::transaction(function () use ($prepared): int {
            // Never overwrite an answer key from a previously issued exam, even on a retry.
            $codes = array_column($prepared, 'code');
            $existing = DB::table('pmp_exam_questions')->whereIn('code', $codes)->pluck('code')->all();
            if ($existing !== []) {
                throw ValidationException::withMessages(['file' => 'Question codes already exist: '.implode(', ', array_slice($existing, 0, 8)).'. Use new codes; existing attempted questions cannot be overwritten.']);
            }
            $now = now();
            foreach (array_chunk($prepared, 200) as $chunk) {
                DB::table('pmp_exam_questions')->insert(array_map(fn ($data) => [
                    ...$data, 'options' => json_encode($data['options'], JSON_THROW_ON_ERROR),
                    'option_rationales' => isset($data['option_rationales']) ? json_encode($data['option_rationales'], JSON_THROW_ON_ERROR) : null,
                    'created_at' => $now, 'updated_at' => $now,
                ], $chunk));
            }
            return count($prepared);
            }, 3);
        } catch (\Illuminate\Database\QueryException $exception) {
            if (in_array((string) $exception->getCode(), ['23000', '23505'], true)) {
                throw ValidationException::withMessages(['file' => 'An imported question code already exists. Please refresh the bank and use a new code.']);
            }
            throw $exception;
        }
    }

    private function csv(string $path): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw ValidationException::withMessages(['file' => 'Unable to read the CSV file.']);
        }
        try {
            $rows = [];
            while (($row = fgetcsv($handle, 0, ',', '"', '')) !== false) {
                if (count($rows) === 0 && isset($row[0])) {
                    $row[0] = preg_replace('/^\xEF\xBB\xBF/', '', $row[0]);
                }
                $rows[] = $row;
                if (count($rows) > 1001) {
                    break;
                }
            }
            return $rows;
        } finally {
            fclose($handle);
        }
    }

    private function zip(string $path, string $file, bool $optional = false): string
    {
        if (! class_exists(\ZipArchive::class) || ! class_exists(\DOMDocument::class)) {
            throw ValidationException::withMessages(['file' => 'The server requires PHP zip and DOM extensions to read XLSX files.']);
        }
        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            throw ValidationException::withMessages(['file' => 'The uploaded Office file is not a valid ZIP-based document.']);
        }
        try {
            $meta = $zip->statName($file);
            if (! $meta && $optional) {
                return '';
            }
            if (! $meta || $meta['size'] > 8 * 1024 * 1024) {
                throw ValidationException::withMessages(['file' => 'Office document is missing its expected content or its XML is too large.']);
            }
            $xml = $zip->getFromName($file);
            if ($xml === false) {
                throw ValidationException::withMessages(['file' => 'Could not read the Office document content.']);
            }
            return $xml;
        } finally {
            $zip->close();
        }
    }

    private function document(string $xml): \DOMXPath
    {
        $document = new \DOMDocument();
        if (! $document->loadXML($xml, LIBXML_NONET)) {
            throw ValidationException::withMessages(['file' => 'Invalid Office XML content.']);
        }
        return new \DOMXPath($document);
    }

    private function xlsx(string $path): array
    {
        // First worksheet, conventional template format. No formulas/macros are evaluated.
        $shared = [];
        $sharedXml = $this->zip($path, 'xl/sharedStrings.xml', true);
        if ($sharedXml !== '') {
            $xpath = $this->document($sharedXml);
            foreach ($xpath->query('//*[local-name()="si"]') as $element) {
                $text = '';
                foreach ($xpath->query('.//*[local-name()="t"]', $element) as $node) {
                    $text .= $node->textContent;
                }
                $shared[] = $text;
            }
        }
        $sheetPath = 'xl/worksheets/sheet1.xml';
        $workbook = $this->zip($path, 'xl/workbook.xml', true);
        $relationships = $this->zip($path, 'xl/_rels/workbook.xml.rels', true);
        if ($workbook !== '' && $relationships !== '') {
            $bookPath = $this->document($workbook);
            $sheets = $bookPath->query('//*[local-name()="sheets"]/*[local-name()="sheet"]');
            $questionSheet = null;
            foreach ($sheets as $sheet) {
                if ($sheet->getAttribute('name') === 'Question Bank') {
                    $questionSheet = $sheet;
                    break;
                }
            }
            // Older single-sheet CSV-export workbooks remain supported.
            $questionSheet ??= $sheets->item(0);
            $relationId = $questionSheet?->getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
            if ($relationId) {
                $relationsPath = $this->document($relationships);
                foreach ($relationsPath->query('//*[local-name()="Relationship"]') as $relation) {
                    if ($relation->getAttribute('Id') !== $relationId) {
                        continue;
                    }
                    $target = ltrim($relation->getAttribute('Target'), '/');
                    if (str_starts_with($target, './')) {
                        $target = substr($target, 2);
                    }
                    $candidate = str_starts_with($target, 'xl/') ? $target : 'xl/'.$target;
                    if (! str_starts_with($candidate, 'xl/worksheets/') || str_contains($candidate, '..')) {
                        throw ValidationException::withMessages(['file' => 'Invalid worksheet path in Excel workbook.']);
                    }
                    $sheetPath = $candidate;
                    break;
                }
            }
        }
        $xpath = $this->document($this->zip($path, $sheetPath));
        $rows = [];
        foreach ($xpath->query('//*[local-name()="sheetData"]/*[local-name()="row"]') as $row) {
            $cells = [];
            foreach ($xpath->query('./*[local-name()="c"]', $row) as $cell) {
                // Question content must be literal. Do not trust calculated or formula-backed answer keys.
                if ($xpath->query('./*[local-name()="f"]', $cell)->length > 0) {
                    throw ValidationException::withMessages(['file' => 'Question Bank values must be plain text or numbers, not spreadsheet formulas.']);
                }
                preg_match('/^[A-Z]+/', $cell->getAttribute('r'), $match);
                $letters = $match[0] ?? '';
                $position = 0;
                foreach (str_split($letters) as $letter) {
                    $position = $position * 26 + ord($letter) - 64;
                }
                if ($position < 1 || $position > 40) {
                    continue;
                }
                $type = $cell->getAttribute('t');
                if ($type === 'inlineStr') {
                    $text = '';
                    foreach ($xpath->query('.//*[local-name()="t"]', $cell) as $node) {
                        $text .= $node->textContent;
                    }
                } else {
                    $node = $xpath->query('./*[local-name()="v"]', $cell)->item(0);
                    $text = $node?->textContent ?? '';
                    if ($type === 's') {
                        $text = $shared[(int) $text] ?? '';
                    }
                }
                $cells[$position - 1] = $text;
            }
            if ($cells) {
                $rows[] = array_replace(array_fill(0, max(array_keys($cells)) + 1, ''), $cells);
            }
            if (count($rows) > 1001) {
                break;
            }
        }
        return $rows;
    }

}
