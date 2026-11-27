<?php

namespace App\Domain\Interview;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Starter catalog and database-backed interview question selection; no AI call at session start. */
final class QuestionCatalog
{
    public const INDUSTRIES = [
        'software' => 'Software & IT', 'construction' => 'Construction',
        'architecture' => 'Architecture', 'manufacturing' => 'Manufacturing',
        'finance' => 'Finance & BFSI', 'healthcare' => 'Healthcare', 'other' => 'Other',
    ];

    private const SCENARIOS = [
        'software' => 'a software release', 'construction' => 'a construction handover',
        'architecture' => 'an architectural design review', 'manufacturing' => 'a production line upgrade',
        'finance' => 'a banking compliance rollout', 'healthcare' => 'a hospital service implementation',
        'other' => 'a cross-functional project',
    ];

    public const ROLES = [
        'Project Coordinator', 'Senior Project Coordinator', 'Scrum Master',
        'Project Manager', 'Senior Project Manager', 'Program Manager',
    ];

    public const EXPERIENCE = [
        'entry' => 'Entry (0–1 year)', 'junior' => 'Junior (1–3 years)',
        'mid' => 'Mid-Level (3–5 years)', 'senior' => 'Senior (5–10 years)',
        'leadership' => 'Leadership (10+ years)',
    ];

    private const BANK = [
        'General' => [
            'Tell me about yourself and what interests you about the {role} position.',
            'How would you describe your project management approach?',
            'What has been your most meaningful professional achievement?',
            'Why do you want to work in {industry}?',
            'What skills make you effective as a {role}?',
            'How do you organize your work when several priorities compete?',
            'What is an important lesson you learned from a project that did not go as planned?',
            'How do you keep your project knowledge current?',
            'How do you define a successful project beyond schedule and budget?',
            'What would you focus on during your first 90 days as a {role}?',
        ],
        'Behavioral' => [
            'Tell me about a time you resolved conflict between project stakeholders.',
            'Describe a challenging {industry} project and how you overcame the main obstacle.',
            'Give an example of how you influenced a decision without direct authority.',
            'Tell me about a project mistake you made and how you handled it.',
            'Describe a time you had to deliver difficult news to a client.',
            'Tell me about a time your team missed a milestone. What did you do?',
            'Describe how you motivated a team during a stressful delivery period.',
            'Give an example of a decision you made with incomplete information.',
            'Tell me about a time you improved a project process.',
            'Describe a situation where you had to adapt your leadership style.',
        ],
        'Technical' => [
            'How do you handle scope changes in a {industry} project?',
            'How do you create and manage a project schedule?',
            'How do you identify, assess, and mitigate risks on {scenario}?',
            'How do you manage project dependencies across multiple teams?',
            'Which metrics do you use to monitor project performance?',
            'How do you build a realistic project budget and control costs?',
            'Explain how you would conduct stakeholder analysis and map influence.',
            'How do you establish a change control and approval process?',
            'When would you choose agile, predictive, or hybrid delivery?',
            'How do you manage quality assurance and acceptance criteria on {scenario}?',
        ],
        'Situational' => [
            'A sponsor requests a major change one week before launch. What do you do?',
            'A key team member leaves during {scenario}. How do you respond?',
            'Two departments disagree on priorities and deadlines. How would you resolve it?',
            '{scenario} is behind schedule and over budget. What are your first steps?',
            'A high-priority risk becomes an active issue. How would you manage it?',
            'Your client repeatedly changes requirements but refuses a timeline extension. What do you do?',
            'A vendor fails to deliver a critical component. How would you protect the deadline?',
            'A team member raises an ethical concern about reporting. How do you respond?',
            'You discover project reporting is inaccurate before a steering committee meeting. What next?',
            'You are asked to manage two projects with conflicting resource needs. How would you prioritize?',
        ],
    ];

    /** Starter bank is copied into the database once by the catalog migration. */
    public static function starterQuestions(): array
    {
        $questions = [];
        foreach (self::BANK as $type => $items) {
            foreach ($items as $position => $text) {
                $questions[] = ['type' => $type, 'text' => $text, 'sort_order' => $position + 1];
            }
        }

        return $questions;
    }

    /** Six option groups in one query; no per-control database lookups. */
    public function choices(): array
    {
        $rows = DB::table('master_data_options')->whereIn('category', array_keys(\App\Support\Admin\InterviewMasterData::GROUPS))->where('is_active', true)
            ->orderBy('sort_order')->orderBy('id')->get(['category', 'value', 'label']);
        $choices = ['industry' => [], 'role' => [], 'experience' => [], 'type' => [], 'count' => [], 'mode' => []];
        foreach ($rows as $row) {
            $choices[substr($row->category, strlen('interview_'))][$row->value] = $row->label;
        }

        return $choices;
    }

    public function publishedSets(): array
    {
        return DB::table('interview_question_sets')->where('is_active', true)
            ->orderBy('sort_order')->orderBy('id')->get(['id', 'title', 'industry', 'role', 'experience'])->all();
    }

    public function minutesPerQuestion(): int
    {
        return (int) (DB::table('interview_configuration')->where('id', 1)->value('minutes_per_question')
            ?? config('pm-interview.minutes_per_question', 2));
    }

    public function select(string $industry, string $role, string $experience, array $types, int $count, ?int $setId = null, array $options = [], ?array $settings = null, array $labels = []): array
    {
        $query = DB::table('interview_questions as q')
            ->join('interview_question_sets as s', 's.id', '=', 'q.set_id')
            ->where('q.is_active', true)->where('s.is_active', true)
            ->whereIn('q.type', $types)
            ->where(fn ($q) => $q->whereNull('s.industry')->orWhere('s.industry', $industry))
            ->where(fn ($q) => $q->whereNull('s.role')->orWhere('s.role', $role))
            ->where(fn ($q) => $q->whereNull('s.experience')->orWhere('s.experience', $experience));
        if ($setId !== null) {
            $query->where('s.id', $setId);
        }
        if (($options['mix'] ?? null) === 'common') {
            $query->whereNull('s.industry')->whereNull('s.role')->whereNull('s.experience')
                ->where('q.text', 'not like', '%{industry}%')->where('q.text', 'not like', '%{scenario}%');
        }
        // Rank per type in SQL; the optional preview uses a bounded candidate pool.
        // The old start endpoint retains the original deterministic catalog order.
        $ranked = $query->select(['q.id', 'q.type', 'q.text', 'q.topic', 'q.difficulty', 'q.answer_guidance', 's.industry', 's.role', 's.experience'])
            ->selectRaw('ROW_NUMBER() OVER (PARTITION BY q.type ORDER BY
                CASE WHEN s.industry IS NOT NULL THEN 0 ELSE 1 END,
                CASE WHEN s.role IS NOT NULL THEN 0 ELSE 1 END,
                CASE WHEN s.experience IS NOT NULL THEN 0 ELSE 1 END,
                s.sort_order, q.sort_order, q.id) as question_rank');
        $rows = DB::query()->fromSub($ranked, 'eligible')
            ->where('question_rank', '<=', $options ? min(200, $count * 4) : $count)->orderBy('question_rank')
            ->get(['id', 'type', 'text', 'topic', 'difficulty', 'answer_guidance', 'industry', 'role', 'experience']);

        $industryLabel = $labels['industry'] ?? $options['industry_label'] ?? DB::table('master_data_options')->where('category', 'interview_industry')->where('value', $industry)->value('label') ?? $industry;
        $roleLabel = $labels['role'] ?? $options['role_label'] ?? $role;
        $groups = $rows->groupBy('type');
        if ($options) {
            $terms = PracticeRubric::keywords(implode(' ', $options['focus'] ?? []).' '.($options['jd'] ?? ''));
            $groups = $groups->map(function ($group) use ($terms) {
                // Only the bounded candidate pool is shuffled; keyword matches take precedence.
                return $group->shuffle()->sortByDesc(fn ($q) => 100 * ((int) ($q->industry !== null) + (int) ($q->role !== null) + (int) ($q->experience !== null)) + min(99, count(array_intersect($terms, PracticeRubric::keywords($q->text.' '.($q->topic ?? ''))))))->values();
            });
        }
        $selected = [];
        $used = [];
        for ($index = 0; count($selected) < ($options ? min(200, $count * 4) : $count); $index++) {
            $added = false;
            foreach ($types as $type) {
                $question = $groups->get($type, collect())->get($index);
                if (! $question) continue;
                $added = true;
                // Persist an immutable copy: subsequent admin edits never modify a live session.
                $prompt = strtr($question->text, [
                    '{industry}' => $industryLabel,
                    '{role}' => $roleLabel,
                    '{scenario}' => self::SCENARIOS[$industry] ?? ('a '.strtolower($industryLabel).' project'),
                ]);
                if ($type !== 'General' && in_array($experience, ['senior', 'leadership'], true)) {
                    $prompt .= ' Include leadership decisions and key trade-offs.';
                } elseif ($type === 'Situational' && in_array($experience, ['entry', 'junior'], true)) {
                    $prompt .= ' Explain your initial steps.';
                }
                if (isset($used[$question->id])) continue;
                $used[$question->id] = true;
                $selected[] = ['id' => 'bank-'.$question->id, 'type' => $type, 'text' => $prompt];
                if (isset($labels['types'][$type])) $selected[array_key_last($selected)]['type_label'] = $labels['types'][$type];
                foreach (['topic', 'difficulty', 'answer_guidance'] as $field) {
                    if (filled($question->{$field})) $selected[array_key_last($selected)][$field] = $question->{$field};
                }
                if ($options) {
                    $selected[array_key_last($selected)]['contextual'] = $question->industry !== null || $question->role !== null || $question->experience !== null
                        || str_contains($question->text, '{industry}') || str_contains($question->text, '{scenario}');
                }
                if (count($selected) === ($options ? min(200, $count * 4) : $count)) break;
            }
            if (! $added) break;
        }
        if ($options) {
            $focusTerms = PracticeRubric::keywords(implode(' ', $options['focus'] ?? []));
            $mix = $options['mix'] ?? 'recommended';
            $common = fn ($q) => ! $q['contextual'];
            $focus = fn ($q) => (bool) array_intersect($focusTerms, PracticeRubric::keywords($q['text'].' '.($q['topic'] ?? '')));
            $buckets = ['Common questions' => [], 'Role & industry scenarios' => [], 'Focus-area questions' => []];
            foreach ($selected as $q) {
                $bucket = $mix === 'focus' && $focus($q) ? 'Focus-area questions' : ($common($q) ? 'Common questions' : 'Role & industry scenarios');
                $buckets[$bucket][] = $q + ['bucket' => $bucket];
            }
            if ($mix === 'focus' && empty($buckets['Focus-area questions'])) {
                throw ValidationException::withMessages(['focus' => 'No published questions match those focus areas. Choose another focus area or question mix.']);
            }
            $quotas = PracticeSettings::quotas($settings ?? PracticeSettings::load(), $mix, $count);
            $selected = [];
            foreach ($quotas as $bucket => $quota) {
                $selected = array_merge($selected, array_splice($buckets[$bucket], 0, $quota));
            }
            // A sparse administrator catalog may not meet the requested mix. Report actual counts; do not invent questions.
            if ($mix !== 'common') {
                foreach ($buckets as $bucket => $remaining) {
                    $selected = array_merge($selected, array_slice($remaining, 0, max(0, $count - count($selected))));
                }
            }
            foreach ($selected as &$q) {
                unset($q['contextual']);
                $q['difficulty'] ??= in_array($experience, ['senior', 'leadership'], true) ? ($q['type'] === 'Situational' ? 'Hard' : 'Medium') : ($q['type'] === 'Situational' || $q['type'] === 'Technical' ? 'Medium' : 'Easy');
                $topics = ['risk' => 'Risk and issue management', 'scope' => 'Scope change', 'stakeholder' => 'Stakeholder communication', 'dependenc' => 'Dependency management', 'schedule' => 'Delivery planning', 'milestone' => 'Delivery planning', 'release' => 'Release planning', 'budget' => 'Budget control', 'quality' => 'Quality management', 'conflict' => 'Team conflict', 'agile' => 'Agile delivery', 'requirements' => 'Requirements management', 'leadership' => 'Leadership'];
                foreach ($topics as $term => $label) {
                    if (! isset($q['topic']) && str_contains(strtolower($q['text']), $term)) { $q['topic'] = $label; break; }
                }
                if ($q['bucket'] === 'Role & industry scenarios') {
                    $q['text'] .= ' Frame your answer for '.$industryLabel.' and the '.$roleLabel.' role.';
                }
            }
            unset($q);
        }
        if (count($selected) < $count) {
            throw ValidationException::withMessages(['count' => 'This question selection has only '.count($selected).' available questions. Choose fewer questions, more types, or another set.']);
        }

        return $selected;
    }
}
