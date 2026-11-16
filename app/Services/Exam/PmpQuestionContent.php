<?php

namespace App\Services\Exam;

/** Keeps workbook imports and manual question edits on the same canonical field contract. */
final class PmpQuestionContent
{
    public const WORKBOOK_HEADERS = [
        'Question ID', 'Exam Domain', 'ECO Task ID', 'ECO Task Focus', 'Difficulty',
        'Approach', 'Question', 'Option A', 'Option B', 'Option C', 'Option D',
        'Correct Option', 'Correct Answer', 'Why Correct', 'Rationale A',
        'Rationale B', 'Rationale C', 'Rationale D', 'Key Takeaway', 'Related Concepts',
        'PMBOK 8 Performance Domain', 'Legacy Knowledge Area', 'Industry',
        'Question Type', 'Reference Publication', 'Reference Section',
        'Reference Heading', 'Reference PDF Page', 'ECO Reference', 'Review Status',
    ];

    public const REVIEW_STATUSES = [
        'Editorial draft', 'In review', 'Needs revision', 'Approved', 'Rejected',
    ];

    public const APPROACHES = ['Predictive', 'Adaptive / Agile', 'Hybrid'];

    /** Build legacy review text from per-option rationales, without changing the exam UI contract. */
    public static function otherOptionRationales(array $rationales, string $correct): ?string
    {
        $parts = [];
        foreach (['A', 'B', 'C', 'D'] as $key) {
            if ($key !== $correct && filled($rationales[$key] ?? null)) {
                $parts[] = $key.': '.trim((string) $rationales[$key]);
            }
        }
        return $parts === [] ? null : implode("\n", $parts);
    }

    /** Preserve source-field boundaries for the existing structured References tab. */
    public static function referenceSummary(array $data): ?string
    {
        $citationKeys = [
            'reference_publication', 'reference_section', 'reference_heading',
            'reference_pdf_page', 'eco_reference', 'eco_task_id', 'eco_task_focus',
        ];
        $hasCitation = false;
        foreach ($citationKeys as $key) {
            if (filled($data[$key] ?? null)) {
                $hasCitation = true;
                break;
            }
        }
        $performance = trim((string) ($data['pmbok_performance_domain'] ?? ''));
        $knowledge = trim((string) ($data['legacy_knowledge_area'] ?? ''));
        if (! $hasCitation && $performance === '' && $knowledge === '') {
            return null;
        }

        $sources = $hasCitation ? [[
            'source' => (string) ($data['reference_publication'] ?? ''),
            'title' => (string) ($data['reference_heading'] ?? ''),
            'section' => (string) ($data['reference_section'] ?? ''),
            'page' => filled($data['reference_pdf_page'] ?? null) ? (string) (int) $data['reference_pdf_page'] : '',
            'pageLabel' => 'Reference PDF page',
            'examDomain' => (string) ($data['domain'] ?? ''),
            'task' => (string) ($data['eco_task_id'] ?? ''),
            'focus' => (string) ($data['eco_task_focus'] ?? ''),
            'ecoReference' => (string) ($data['eco_reference'] ?? ''),
        ]] : [];
        return json_encode([
            'sources' => $sources,
            'performanceDomain' => $performance,
            'knowledgeArea' => $knowledge,
        ], JSON_THROW_ON_ERROR);
    }

    public static function cleanAnswer(string $value): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $value));
    }

    public static function forDatabase(array $data, ?string $previousReviewStatus = null): array
    {
        $status = $data['review_status'] ?? $previousReviewStatus
            ?? (! empty($data['is_active']) ? 'Approved' : 'Editorial draft');
        $data['review_status'] = $status;
        $answer = $data['options'][$data['correct_option']] ?? null;
        if (! is_string($answer)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'correct_option' => 'The correct option must reference an existing answer.',
            ]);
        }
        if (filled($data['correct_answer_text'] ?? null)
            && self::cleanAnswer((string) $data['correct_answer_text']) !== self::cleanAnswer($answer)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'correct_answer_text' => 'Correct Answer must match the selected Option.',
            ]);
        }
        $data['correct_answer_text'] = filled($data['correct_answer_text'] ?? null)
            ? (string) $data['correct_answer_text'] : $answer;

        // Preserve the legacy text if an older request has no structured rationales.
        if (isset($data['option_rationales']) && is_array($data['option_rationales'])) {
            $rationale = self::otherOptionRationales($data['option_rationales'], (string) $data['correct_option']);
            if ($rationale !== null) {
                $data['other_options'] = $rationale;
            }
            $data['option_rationales'] = json_encode($data['option_rationales'], JSON_THROW_ON_ERROR);
        }
        $reference = self::referenceSummary($data);
        if ($reference !== null) {
            $data['references'] = $reference;
        }
        $data['options'] = json_encode($data['options'], JSON_THROW_ON_ERROR);
        $data['explanation'] ??= '';
        $data['question_type'] ??= 'Single Select';
        return $data;
    }
}
