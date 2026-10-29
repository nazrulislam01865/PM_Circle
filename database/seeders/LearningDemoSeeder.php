<?php

namespace Database\Seeders;

use App\Models\LearningPath;
use Illuminate\Database\Seeder;

/** Idempotent sample curriculum. No learners, points or achievements are fabricated. */
final class LearningDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        $paths = [
            ['student-beginner', 'Student & Beginner', 'Start your project management journey', 'Understand projects, roles, scope and simple planning.', 'Learn the basics, make your first project decisions and build confidence through practice.', ['Recognise what makes work a project.', 'Define a simple scope and plan.', 'Identify stakeholders and risks.', 'Report progress and close a small project.'], ['What is a project?', 'Define the goal and scope', 'Build a simple project plan', 'Work with people and stakeholders', 'Spot risks and track progress', 'Close the project and learn']],
            ['project-coordinator', 'Project Coordinator', 'Coordinate work with confidence', 'Track tasks, report progress and communicate with stakeholders.', 'Plan and coordinate project tasks confidently.', ['Organise project activities.', 'Report progress clearly.', 'Handle stakeholder updates.'], ['Organise project tasks', 'Track team progress', 'Communicate status', 'Manage dependencies', 'Wrap up delivery']],
            ['project-manager', 'Project Manager', 'Lead delivery and make trade-offs', 'Practise scope, budget, risk and delivery decisions.', 'Develop practical project leadership skills.', ['Manage competing constraints.', 'Make informed decisions.', 'Engage stakeholders.'], ['Establish project objectives', 'Manage scope', 'Plan the schedule', 'Budget and resources', 'Assess risks', 'Lead the team', 'Control change', 'Close the project']],
            ['senior-project-manager', 'Senior Project Manager', 'Manage complexity and lead teams', 'Navigate dependencies, escalations and difficult decisions.', 'Build advanced project leadership judgement.', ['Manage complex dependencies.', 'Handle escalations.', 'Coach high-performing teams.'], ['Lead complex projects', 'Align strategic stakeholders', 'Manage governance', 'Handle escalations', 'Develop teams', 'Control programme risks', 'Measure outcomes']],
            ['project-director', 'Project Director', 'Connect projects to business strategy', 'Practise governance, investment choices and benefits oversight.', 'Connect project delivery to business outcomes.', ['Prioritise investment choices.', 'Govern projects responsibly.', 'Measure delivery benefits.'], ['Translate strategy', 'Evaluate investments', 'Lead governance', 'Balance portfolios', 'Manage executive communication', 'Deliver benefits']],
        ];
        foreach ($paths as $index => [$slug, $level, $title, $summary, $detail, $objectives, $modules]) {
            $path = LearningPath::updateOrCreate(['slug' => $slug], [
                'level' => $level, 'title' => $title, 'summary' => $summary, 'introduction' => $detail,
                'objectives' => $objectives, 'position' => $index + 1,
                'access_tier' => 'free', 'is_published' => true,
            ]);
            foreach ($modules as $offset => $moduleTitle) {
                $module = $path->modules()->updateOrCreate(['position' => $offset + 1], [
                    'title' => $moduleTitle,
                    'summary' => $slug === 'student-beginner' && $offset === 0 ? 'Understand projects, operations and the project manager’s role.' : 'Learn practical techniques, then apply them in guided activities.',
                    'minutes' => [15, 25, 35, 30, 35, 30][$offset % 6],
                ]);
                foreach (['lesson', 'mcq', 'short_answer', 'scenario'] as $step => $type) {
                    $content = $slug === 'student-beginner' && $offset === 0
                        ? match ($type) {
                            'lesson' => 'Projects have a defined start and finish and produce a unique outcome. Ongoing, repeated work is usually operations. A project manager helps the team plan, communicate and deliver value.',
                            'mcq' => 'Key idea: A project is temporary and creates a unique result.',
                            'short_answer' => 'Describe a project you have seen at university, at work, or in your community. What made it temporary and unique?',
                            'scenario' => 'Your student club wants to organise a career fair in eight weeks with a limited budget. What would you do first?',
                        }
                        : match ($type) {
                            'lesson' => "Learn the foundations of {$moduleTitle}. Set a clear goal, identify the people involved and understand the decisions needed to succeed.",
                            'mcq' => "Key idea: Good project decisions begin with clear objectives and stakeholder needs.",
                            'short_answer' => "Explain a practical example of {$moduleTitle}. What would you do first and why?",
                            'scenario' => "Your team faces an unexpected change during {$moduleTitle}. Choose a structured approach before making a commitment.",
                        };
                    $activity = $module->activities()->updateOrCreate(['position' => $step + 1], [
                        'type' => $type, 'title' => ['Short lesson', 'MCQ check', 'Short answer', 'Mini scenario'][$step],
                        'content' => $content, 'payload' => $type === 'scenario' ? [
                            'options' => ['Assess the impact and agree priorities.', 'Promise the change immediately.', 'Ignore the request until the deadline.'],
                            'correct' => '0', 'explanation' => 'Understand the impact and involve decision makers before committing.',
                        ] : null,
                        'minutes' => [5, 5, 5, 5][$step],
                    ]);
                    if ($type !== 'mcq') continue;
                    $questions = $slug === 'student-beginner' && $offset === 0 ? [
                        ['Which of these is a project?', ['Processing the same payroll every month.', 'Organising a university career fair.', 'Answering routine support calls each day.', 'Sending a weekly attendance report.'], 'B', 'A university career fair is a temporary effort that produces a unique outcome. Routine payroll, support and attendance reporting are ongoing operations.'],
                        ['What makes project work different from ongoing operations?', ['It has no deadline.', 'It repeats indefinitely.', 'It has a defined start and finish.', 'It never needs stakeholders.'], 'C', 'Projects are temporary, with a defined start and finish.'],
                        ['Which is a unique project deliverable?', ['The same monthly report.', 'A daily helpdesk queue.', 'Routine invoice processing.', 'A newly launched community website.'], 'D', 'Creating and launching a new website produces a unique result.'],
                    ] : [
                        ["What should you clarify first when working on {$moduleTitle}?", ['Expected outcome and stakeholders.', 'Only the team’s favourite tool.', 'A fixed answer without investigation.', 'How to avoid all communication.'], 'A', 'Understand the intended result and stakeholders before choosing actions.'],
                        ['What is a useful approach when new information changes the plan?', ['Ignore the change.', 'Assess its impact and discuss options.', 'Hide it from stakeholders.', 'Promise an impossible deadline.'], 'B', 'Assess consequences and communicate possible options.'],
                        ['What helps a team improve after a learning activity?', ['Avoid reviewing decisions.', 'Focus only on speed.', 'Reflect on outcomes and lessons.', 'Record no evidence.'], 'C', 'Reviewing evidence and lessons supports improvement.'],
                    ];
                    foreach ($questions as $i => [$prompt, $choices, $answer, $explanation]) {
                        $activity->questions()->updateOrCreate(['position' => $i + 1], [
                            'prompt' => $prompt, 'choices' => array_combine(['A','B','C','D'], $choices),
                            'answer_key' => $answer, 'explanation' => $explanation,
                        ]);
                    }
                }
            }
        }
    }
}
