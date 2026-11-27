<?php

namespace App\Domain\Interview;

/** Educational, deterministic feedback; never calls an AI provider or spends credits. */
final class PracticeRubric
{
    public static function evaluate(string $answer, array $question): array
    {
        $words = preg_split('/\s+/u', trim($answer), -1, PREG_SPLIT_NO_EMPTY);
        $detail = count($words) >= 35;
        $action = (bool) preg_match('/\b(led|created|agreed|prioriti[sz]ed|tracked|reported|reviewed|resolved|assigned|escalated|used|mapped|communicated|would|plan|assess|clarify)\b/i', $answer);
        $outcome = (bool) preg_match('/\b(result|outcome|improved|reduced|increased|delivered|on time|agreed|learned|so that|verify|measure)\b|\d+\s*(%|days|weeks)/i', $answer);
        $terms = self::keywords($question['text']);
        $coverage = false;
        foreach ($terms as $term) {
            if (preg_match('/\b'.preg_quote($term, '/').'\b/i', $answer)) { $coverage = true; break; }
        }
        $score = trim($answer) === '' ? 0 : 2 + 2 * ((int) $detail + (int) $action + (int) $outcome + (int) $coverage);
        $outline = $question['answer_guidance'] ?? match ($question['type']) {
            'Behavioral' => 'Describe the situation and your responsibility, your own decisions and actions, and the observed result or lesson.',
            'Technical' => 'Name the relevant process, tool or metric. Explain ownership, frequency and thresholds, and how they inform decisions.',
            'Situational' => 'Validate the impact and urgency. Compare options, assign owners, communicate trade-offs, and explain how you will verify progress.',
            default => 'Describe your context and role, explain your approach and why it fits, then connect the result to the target role.',
        };
        return ['score' => $score, 'summary' => 'Rule-based practice feedback (not an AI or hiring assessment).',
            'relevance' => $coverage ? 10 : 0, 'pm_knowledge' => $coverage ? 10 : 0,
            'clarity' => $detail ? 10 : 0, 'communication' => $action ? 10 : 0,
            'leadership' => $action ? 10 : 0, 'problem_solving' => $outcome ? 10 : 0,
            'strengths' => [$action ? 'You described an action.' : 'You attempted the question.'],
            'improvements' => [!$action ? 'Name a decision or action you personally took.' : (!$coverage ? 'Connect your example directly to the question.' : (!$outcome ? 'Close with an observable outcome or verification step.' : (!$detail ? 'Add enough context to explain the situation.' : 'Keep the response concise and relevant.')))],
            'suggestions' => [$outline], 'suggested_answer' => $outline];
    }

    public static function keywords(string $text): array
    {
        $words = preg_split('/[^a-z]+/i', strtolower($text), -1, PREG_SPLIT_NO_EMPTY);
        return array_values(array_unique(array_filter($words, fn ($word) => strlen($word) >= 4 && !in_array($word, ['what','would','could','should','your','with','from','have','that','this','about','tell','describe','explain','into','when','which','were','been','their','they','project','role','answer','example','how','will','need','work','experience','management','manager'], true))));
    }
}
