<?php

namespace App\Domain\Interview;

/** Versioned, curated interview prompts: no AI call on the page or session start. */
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

    public function select(string $industry, string $role, string $experience, array $types, int $count): array
    {
        $rows = collect(self::BANK)->only($types)->flatMap(function (array $questions, string $type) use ($industry, $role, $experience) {
            return collect($questions)->map(function (string $text, int $index) use ($industry, $role, $experience, $type) {
                $prompt = strtr($text, [
                    '{industry}' => self::INDUSTRIES[$industry], '{role}' => $role,
                    '{scenario}' => self::SCENARIOS[$industry],
                ]);
                // Calibrate expectations while keeping the first general introduction natural.
                if ($type !== 'General' && in_array($experience, ['senior', 'leadership'], true)) {
                    $prompt .= ' Include leadership decisions and key trade-offs.';
                } elseif ($type === 'Situational' && in_array($experience, ['entry', 'junior'], true)) {
                    $prompt .= ' Explain your initial steps.';
                }

                return ['id' => "$type-".($index + 1), 'type' => $type, 'text' => $prompt];
            });
        })->values();

        // Mix categories in a stable order, with no repeat or query per question.
        $groups = $rows->groupBy('type');
        $selected = collect();
        for ($index = 0; $selected->count() < $count; $index++) {
            $added = false;
            foreach ($types as $type) {
                if ($question = $groups->get($type, collect())->get($index)) {
                    $selected->push($question);
                    $added = true;
                    if ($selected->count() === $count) break;
                }
            }
            if (! $added) break;
        }

        return $selected->values()->all();
    }
}
