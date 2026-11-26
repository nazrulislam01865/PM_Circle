<?php

namespace Tests\Feature\Learning;

use App\Models\LearningCourse;
use App\Models\User;
use App\Services\Learning\CatalogSettings;
use App\Services\Learning\CourseLessonProgress;
use App\Services\Learning\CourseQuestionImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class LessonQuestionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function user(bool $admin = false): User
    {
        return User::factory()->create(['is_admin' => $admin, 'onboarding_step' => 3, 'email_verified_at' => now()]);
    }

    private function course(): LearningCourse
    {
        return LearningCourse::query()->create([
            'slug' => 'lesson-check-test', 'title' => 'Course', 'summary' => 'Summary', 'overview' => 'Overview',
            'category' => 'Project Management', 'level' => 'Beginner', 'minutes' => 30, 'thumbnail' => 1,
            'access_tier' => 'free', 'is_published' => true, 'practice_enabled' => false,
            'objectives' => ['Understand planning'], 'outline' => [['title' => 'Introduction', 'topics' => ['Planning']]],
            'lessons' => [
                ['uid' => (string) Str::uuid(), 'section_title' => 'Introduction', 'topic_title' => 'Planning', 'title' => 'First', 'body' => 'First private lesson', 'faq' => [['question' => 'Why plan?', 'answer' => 'To coordinate.']]],
                ['uid' => (string) Str::uuid(), 'section_title' => 'Introduction', 'topic_title' => 'Planning', 'title' => 'Second', 'body' => 'Second private lesson'],
            ],
        ]);
    }

    private function question(LearningCourse $course, int $lesson, string $code): array
    {
        return [
            'code' => $code, 'section_title' => 'Introduction', 'topic_title' => 'Planning',
            'lesson_uid' => $course->lessons[$lesson]['uid'], 'kind' => 'scenario', 'difficulty' => 'Easy',
            'scenario_text' => 'A new project starts.', 'scenario_video_url' => 'https://example.com/scenario.mp4',
            'prompt' => 'What should you do?', 'options' => ['A' => 'Plan', 'B' => 'Ignore', 'C' => 'Wait', 'D' => 'Cancel'],
            'correct_option' => 'A', 'explanation' => 'Plan the work.', 'is_published' => true,
        ];
    }

    public function test_admin_can_create_lesson_question_and_reject_invalid_targets_and_answers(): void
    {
        $course = $this->course();
        $url = "/admin/learning/courses/{$course->id}/questions";
        $data = $this->question($course, 0, 'LESSON-1');
        $this->actingAs($this->user())->post($url, $data)->assertForbidden();
        $this->actingAs($this->user(true))->post($url, $data)->assertRedirect();
        $this->assertDatabaseHas('learning_course_questions', ['code' => 'LESSON-1', 'lesson_uid' => $data['lesson_uid']]);
        $this->post($url, [...$data, 'code' => 'INVALID-UID', 'lesson_uid' => (string) Str::uuid()])->assertSessionHasErrors('lesson_uid');
        $this->post($url, [...$data, 'code' => 'INVALID-ANSWER', 'correct_option' => 'E'])->assertSessionHasErrors('correct_option');
        $this->post($url, [...$data, 'code' => 'INVALID-VIDEO', 'scenario_video_url' => 'http://example.com/scenario.mp4'])->assertSessionHasErrors('scenario_video_url');
        $this->assertDatabaseCount('learning_course_questions', 1);
    }

    public function test_selected_lesson_import_is_atomic_and_saves_scenario(): void
    {
        $course = $this->course();
        $url = "/admin/learning/courses/{$course->id}/questions/import";
        $header = implode(',', CourseQuestionImporter::LESSON_HEADERS);
        $row = 'MCQ-1,,,scenario,Easy,What now?,Plan,Ignore,Wait,Cancel,A,Plan the work.,Yes,Project starts.,https://example.com/scenario.mp4';
        $bad = 'MCQ-2,Introduction,Unknown,scenario,Easy,What now?,Plan,Ignore,Wait,Cancel,A,Plan.,Yes,Project starts.,';
        $this->actingAs($this->user(true));
        $payload = ['lesson_uid' => $course->lessons[0]['uid'], 'publish_all' => false];
        $this->post($url, [...$payload, 'file' => UploadedFile::fake()->createWithContent('questions.csv', "$header\n$row\n$bad\n")])->assertSessionHasErrors('file');
        $this->assertDatabaseCount('learning_course_questions', 0);
        $this->post($url, [...$payload, 'file' => UploadedFile::fake()->createWithContent('questions.csv', "$header\n$row\n")])->assertRedirect();
        $this->assertDatabaseHas('learning_course_questions', ['code' => 'MCQ-1', 'lesson_uid' => $payload['lesson_uid'], 'scenario_text' => 'Project starts.', 'scenario_video_url' => 'https://example.com/scenario.mp4']);
    }

    public function test_lesson_checks_are_scoped_and_do_not_require_timed_practice(): void
    {
        $course = $this->course();
        $first = $course->questions()->create($this->question($course, 0, 'FIRST'));
        $second = $course->questions()->create($this->question($course, 0, 'SECOND'));
        $other = $course->questions()->create($this->question($course, 1, 'OTHER'));
        $course->questions()->create([...$this->question($course, 0, 'DRAFT'), 'is_published' => false]);
        $url = '/learning/courses/'.$course->slug.'/lessons/';
        $this->get($url.'1')->assertInertia(fn (Assert $page) => $page->where('canRead', false)->has('questions', 0)->missing('lesson.faq'));
        $member = $this->user();
        DB::table('learning_demo_course_enrollments')->insert(['user_id' => $member->id, 'course_slug' => $course->slug, 'created_at' => now(), 'updated_at' => now()]);
        $this->actingAs($member)->get($url.'1')->assertInertia(fn (Assert $page) => $page->has('questions', 2)->where('questions.0.id', $first->id)->where('questions.1.id', $second->id)->missing('questions.0.correctOption')->missing('questions.0.correct_option')->missing('questions.0.explanation')->where('lesson.faq.0.question', 'Why plan?'));
        $keys = array_column(app(CourseLessonProgress::class)->lessons($course), 'key');
        $this->postJson($url.'1/check', ['lessonKey' => $keys[0], 'question' => $first->id, 'option' => 'B'])->assertOk()->assertJsonPath('correct', false)->assertJsonPath('correctOption', 'A');
        $this->postJson($url.'1/check', ['lessonKey' => $keys[0], 'question' => $other->id, 'option' => 'A'])->assertNotFound();
        $this->postJson($url.'2/check', ['lessonKey' => $keys[1], 'question' => $first->id, 'option' => 'A'])->assertNotFound();
    }

    public function test_catalog_settings_are_admin_only_and_reach_both_catalogs(): void
    {
        $url = '/admin/learning/courses/catalog-settings';
        $settings = [...CatalogSettings::DEFAULTS, 'title' => 'Browse professional courses', 'starting_enabled' => false, 'topics_enabled' => false];
        $member = $this->user();
        $this->actingAs($member)->put($url, $settings)->assertForbidden();
        $this->actingAs($this->user(true))->put($url, $settings)->assertRedirect();
        $this->get('/learning')->assertInertia(fn (Assert $page) => $page->where('catalogSettings.title', $settings['title'])->where('catalogSettings.starting_enabled', false));
        $this->actingAs($member)->get('/dashboard/learning')->assertInertia(fn (Assert $page) => $page->where('catalogSettings.topics_enabled', false));
    }
}
