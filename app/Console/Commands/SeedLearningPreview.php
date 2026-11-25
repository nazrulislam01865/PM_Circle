<?php

namespace App\Console\Commands;

use App\Models\LearningCourse;
use App\Models\User;
use App\Services\Learning\CourseLessonProgress;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

final class SeedLearningPreview extends Command
{
    protected $signature = 'learning:seed-preview {email : Exact email of an existing local test member}';

    protected $description = 'Create two explicitly labeled demo courses and sample progress for one local test member.';

    public function handle(CourseLessonProgress $progress): int
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->error('Learning preview data is restricted to local and testing environments.');

            return self::FAILURE;
        }

        if (! Schema::hasTable('learning_course_lesson_progress') || ! Schema::hasTable('learning_course_certificates')) {
            $this->error('Run php artisan migrate before creating learning preview data.');

            return self::FAILURE;
        }

        $member = User::query()->where('email', trim((string) $this->argument('email')))->first();
        if (! $member || $member->is_admin || $member->status !== 'active' || $member->onboarding_step < 3 || ! $member->hasVerifiedEmail()) {
            $this->error('Choose an existing active, verified member who has finished onboarding (not an administrator).');

            return self::FAILURE;
        }

        try {
            DB::transaction(function () use ($member, $progress): void {
                foreach ($this->courses() as $index => $data) {
                    $lessons = $data['lessons'];
                    $course = LearningCourse::query()->firstOrCreate(['slug' => $data['slug']], [
                        'title' => $data['title'], 'summary' => $data['summary'], 'overview' => $data['summary'],
                        'category' => $data['category'], 'level' => 'Beginner', 'minutes' => 45,
                        'thumbnail' => $data['thumbnail'], 'access_tier' => 'free', 'is_published' => true,
                        'sort_order' => 990 + $index, 'practice_enabled' => true, 'practice_question_count' => 3,
                        'objectives' => array_column($lessons, 'title'),
                        'outline' => array_map(fn (array $lesson): array => ['title' => $lesson['title'], 'topics' => [$lesson['title']]], $lessons),
                        'lessons' => $lessons,
                    ]);
                    // Refuse to touch a conflicting or customized course, even in a development database.
                    if ($course->title !== $data['title'] || $course->access_tier !== 'free' || ! $course->is_published || ! $course->practice_enabled || $course->lessons != $lessons) {
                        throw new RuntimeException('A preview course already exists with different content or settings. No changes were made.');
                    }
                    foreach ($data['questions'] as $i => [$prompt, $options, $correct, $explanation]) {
                        $course->questions()->firstOrCreate(['code' => 'PREVIEW-'.($i + 1)], [
                            'section_title' => $lessons[$i]['title'], 'topic_title' => $lessons[$i]['title'],
                            'kind' => 'question', 'difficulty' => 'Easy', 'prompt' => $prompt,
                            'options' => $options, 'correct_option' => $correct, 'explanation' => $explanation,
                            'is_published' => true,
                        ]);
                    }
                    DB::table('learning_demo_course_enrollments')->insertOrIgnore([
                        'user_id' => $member->id, 'course_slug' => $course->slug, 'created_at' => now(), 'updated_at' => now(),
                    ]);
                    // Use the real completion service, including its certificate uniqueness guarantee.
                    // The first course starts at 1/3; the second is completed for certificate preview.
                    foreach (array_slice($progress->lessons($course), 0, $index === 0 ? 1 : count($lessons)) as $lesson) {
                        $progress->complete($member, $course, $lesson['key']);
                    }
                }
            });
        } catch (RuntimeException $exception) {
            // Database failures are reported by Laravel, not printed with query data here.
            if ($exception->getMessage() !== 'A preview course already exists with different content or settings. No changes were made.') {
                throw $exception;
            }
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info('Two demo courses are ready for the selected member. Existing progress has not been reset.');
        $this->line('My Learning: /dashboard/learning?tab=my-learning');
        $this->line('Lesson preview: /dashboard/learning/courses/preview-agile-scrum/lessons/2');
        $this->line('Certificates: /dashboard/learning/certificates');

        return self::SUCCESS;
    }

    private function courses(): array
    {
        return [
            [
                'slug' => 'preview-agile-scrum', 'title' => 'Agile & Scrum Fundamentals (Demo)',
                'summary' => 'Sample course for previewing agile lessons, knowledge checks and learning progress.',
                'category' => 'Agile & Scrum', 'thumbnail' => 2,
                'lessons' => [
                    ['title' => 'Agile thinking and incremental delivery',
                        'body' => 'Agile delivery breaks a large objective into small increments that stakeholders can inspect and give feedback on. For an internal service portal, start with submitting and tracking a request before building reports or adding integrations.',
                        'takeaway' => 'A useful first increment lets stakeholders test an outcome and give feedback.',
                        'when_to_apply' => 'When the full solution is unclear or early feedback could change what you build next.',
                        'example' => 'A service desk is replacing email requests. Let staff submit and track a request first; then use feedback to decide whether dashboards should come next.',
                        'references' => 'PM Circle demo lesson 1. Principles behind the Agile Manifesto.',
                        'application' => 'Write one outcome a stakeholder could test at the end of the first increment.'],
                    ['title' => 'Scrum roles, events and artefacts',
                        'body' => 'The Scrum Team is accountable for creating a valuable, useful increment every Sprint. The Product Owner orders the Product Backlog, the Developers plan and deliver the work, and the Scrum Master helps establish Scrum and improve team effectiveness.',
                        'takeaway' => 'Scrum uses clear accountabilities, inspection and adaptation to deliver value.',
                        'when_to_apply' => 'When a team is working on a complex product and needs regular feedback.',
                        'example' => 'A service portal team reviews the latest working increment with stakeholders and adjusts its backlog.',
                        'references' => 'PM Circle demo lesson 2. The Scrum Guide, 2020.',
                        'application' => 'Describe one way a Sprint Review could help your team adapt its next Sprint.'],
                    ['title' => 'Plan a sprint around a useful outcome',
                        'body' => 'Begin Sprint Planning with the reason the Sprint is valuable. Collaborate on a Sprint Goal and select work that supports it. Adapt the plan as you learn.',
                        'takeaway' => 'A Sprint Goal connects the selected work to a meaningful outcome.',
                        'when_to_apply' => 'At the start of a Sprint.', 'example' => 'A team prioritizes a working request submission flow over unrelated visual refinements.',
                        'references' => 'PM Circle demo lesson 3. The Scrum Guide, 2020.', 'application' => 'Write a Sprint Goal for a request submission feature.'],
                ],
                'questions' => [
                    ['What makes the first increment valuable?', ['A' => 'It contains every planned feature.', 'B' => 'Stakeholders can test a useful outcome and give feedback.', 'C' => 'It is delivered only after all reports are ready.'], 'B', 'A useful increment provides a working outcome that supports inspection and feedback.'],
                    ['Who is accountable for effective Product Backlog management?', ['A' => 'Product Owner', 'B' => 'Scrum Master', 'C' => 'Project sponsor'], 'A', 'The Product Owner is accountable for effective Product Backlog management.'],
                    ['What should guide the selection of Sprint work?', ['A' => 'The longest task list', 'B' => 'The Sprint Goal', 'C' => 'Individual preferences'], 'B', 'The Sprint Goal gives the work a shared purpose.'],
                ],
            ],
            [
                'slug' => 'preview-project-foundations', 'title' => 'Project Management Foundations (Demo)',
                'summary' => 'Sample course for previewing completed lessons and a demonstration certificate.',
                'category' => 'Project Management', 'thumbnail' => 5,
                'lessons' => [
                    ['title' => 'Define a project outcome', 'body' => 'Describe what success means and agree the intended deliverables with stakeholders.', 'takeaway' => 'Start with a clear outcome.', 'application' => 'Write a measurable outcome for a small project.'],
                    ['title' => 'Plan scope and milestones', 'body' => 'Break deliverables into manageable work and identify key dependencies and milestones.', 'takeaway' => 'A practical plan connects work to deliverables.', 'application' => 'List three milestones for your project.'],
                    ['title' => 'Review delivery and lessons learned', 'body' => 'Compare the delivered outcome with the agreed objectives, capture feedback and document lessons for future work.', 'takeaway' => 'Review outcomes, not only completed tasks.', 'application' => 'Identify one lesson to carry into your next project.'],
                ],
                'questions' => [
                    ['What should be agreed before detailed planning?', ['A' => 'The intended outcome', 'B' => 'A final report layout', 'C' => 'A celebration date'], 'A', 'An agreed outcome guides planning decisions.'],
                    ['What helps identify the correct sequence of work?', ['A' => 'Team size alone', 'B' => 'Dependencies', 'C' => 'The project name'], 'B', 'Dependencies identify which work relies on other activities.'],
                    ['What should a delivery review compare?', ['A' => 'Only hours logged', 'B' => 'Only the original budget', 'C' => 'Delivered outcomes and agreed objectives'], 'C', 'Reviewing results against objectives helps assess value and capture lessons.'],
                ],
            ],
        ];
    }
}
