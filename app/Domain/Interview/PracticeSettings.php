<?php

namespace App\Domain\Interview;

use Illuminate\Support\Facades\DB;

/** One configuration row; defaults preserve the existing member experience. */
final class PracticeSettings
{
    public static function defaults(): array
    {
        return [
            'allow_new_sessions' => true,
            'allow_job_description' => true,
            'hero_title' => "Role-focused\nInterview practice",
            'hero_description' => 'Build a question set for your role, practice your answers, and review what to improve.',
            'mix_labels' => ['recommended' => 'Recommended Mix', 'common' => 'Common Interview Questions', 'focus' => 'Focus Areas'],
            'recommended_common_percent' => 60,
            'focus_percent' => 60,
            'focus_common_percent' => 20,
            'role_profiles' => [],
        ];
    }

    public static function load(): array
    {
        $row = DB::table('interview_configuration')->where('id', 1)->first(['minutes_per_question', 'practice_settings']);
        return array_replace(self::defaults(), json_decode($row->practice_settings ?? 'null', true) ?? [], [
            'minutes_per_question' => (int) ($row->minutes_per_question ?? config('pm-interview.minutes_per_question', 2)),
        ]);
    }

    public static function roleProfiles(array $settings, array $roles): array
    {
        $profiles = array_column($settings['role_profiles'], null, 'role');
        $result = [];
        foreach ($roles as $key => $label) {
            $result[] = $profiles[$key] ?? ['role' => (string) $key, ...self::defaultRole($label)];
        }
        return $result;
    }

    private static function defaultRole(string $label): array
    {
        $profession = match (true) {
            (bool) preg_match('/scrum|agile coach/i', $label) => 'Scrum Master',
            (bool) preg_match('/business analys/i', $label) => 'Business Analysis',
            (bool) preg_match('/product (manager|owner|management)/i', $label) => 'Product Management',
            (bool) preg_match('/project|program|programme/i', $label) => 'Project Management',
            default => 'Other',
        };
        $focus = match ($profession) {
            'Project Management' => ['delivery planning', 'risk and issue management', 'scope change', 'stakeholder communication', 'dependency management', 'project governance'],
            'Business Analysis' => ['requirements elicitation', 'process mapping', 'requirements traceability', 'acceptance criteria', 'UAT coordination', 'requirements prioritisation'],
            'Scrum Master' => ['team facilitation', 'impediment removal', 'Sprint Goals', 'retrospective improvement', 'team conflict', 'stakeholder collaboration'],
            'Product Management' => ['customer discovery', 'roadmap prioritisation', 'product metrics', 'experiment design', 'product strategy', 'cross-functional alignment'],
            default => ['planning', 'communication', 'risk management', 'leadership', 'delivery', 'quality'],
        };
        return ['profession' => $profession, 'focus' => $focus];
    }

    public static function quotas(array $settings, string $mix, int $count): array
    {
        if ($mix === 'common') return ['Common questions' => $count];
        if ($mix === 'focus') {
            $focus = (int) round($count * $settings['focus_percent'] / 100);
            $common = min($count - $focus, (int) round($count * $settings['focus_common_percent'] / 100));
            return ['Focus-area questions' => $focus, 'Common questions' => $common, 'Role & industry scenarios' => $count - $focus - $common];
        }
        $common = (int) round($count * $settings['recommended_common_percent'] / 100);
        return ['Common questions' => $common, 'Role & industry scenarios' => $count - $common];
    }

    /** Guidance stays on the server until answer feedback is generated. */
    public static function publicQuestions(array $questions): array
    {
        return array_map(static function (array $question): array {
            unset($question['answer_guidance']);
            return $question;
        }, $questions);
    }
}
