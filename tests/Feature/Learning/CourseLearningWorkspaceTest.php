<?php

namespace Tests\Feature\Learning;

use App\Models\LearningCourse;
use App\Models\LearningCourseQuestion;
use App\Models\User;
use App\Services\Learning\CourseLessonProgress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class CourseLearningWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function member(): User
    {
        return User::factory()->create(['is_admin' => false, 'onboarding_step' => 3, 'email_verified_at' => now()]);
    }

    private function course(string $tier = 'free'): LearningCourse
    {
        return LearningCourse::query()->create([
            'slug' => 'workspace-test', 'title' => 'Workspace course', 'summary' => 'Summary', 'overview' => 'Overview',
            'category' => 'Project Management', 'level' => 'Beginner', 'minutes' => 20, 'thumbnail' => 1,
            'access_tier' => $tier, 'is_published' => true, 'practice_enabled' => true, 'certificate_enabled' => true,
            'objectives' => ['Understand lessons'], 'outline' => [['title' => 'Introduction', 'topics' => ['First lesson']]],
            'lessons' => [['title' => 'First lesson', 'body' => 'Private first lesson.'], ['title' => 'Second lesson', 'body' => 'Private second lesson.']],
        ]);
    }

    private function enroll(User $member, LearningCourse $course): void
    {
        DB::table('learning_demo_course_enrollments')->insert(['user_id' => $member->id, 'course_slug' => $course->slug, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_guest_and_unenrolled_members_receive_public_outline_only(): void
    {
        $course = $this->course();
        $url = '/learning/courses/'.$course->slug.'/lessons/1';
        $this->get('/learning/my-learning')->assertInertia(fn (Assert $page) => $page->component('learning/MyLearning')->where('courses', [])->where('isMember', false));
        $this->get('/learning/certificates')->assertInertia(fn (Assert $page) => $page->component('learning/Certificates')->where('certificates', []));
        $this->get($url)->assertInertia(fn (Assert $page) => $page->component('learning/Lesson')->where('canRead', false)->where('lesson.body', '')->where('notes', '')->where('question', null));
        $this->actingAs($this->member())->get($url)->assertInertia(fn (Assert $page) => $page->where('canRead', false)->where('lesson.body', ''));
        $this->postJson($url.'/complete', ['lessonKey' => str_repeat('a', 64)])->assertForbidden();
    }

    public function test_course_details_share_payload_and_protect_lesson_bodies(): void
    {
        $course = $this->course();
        $public = '/learning/courses/'.$course->slug;
        $dashboard = '/dashboard/learning/courses/'.$course->slug;
        $this->get($public)->assertInertia(fn (Assert $page) => $page
            ->component('learning/CourseShow')->where('isMember', false)
            ->where('course.lessons.0.body', null)->where('course.outline.0.title', 'Introduction'));
        $member = $this->member();
        $this->actingAs($member)->get($dashboard)->assertInertia(fn (Assert $page) => $page
            ->component('learning/CourseShow')->where('isMember', true)
            ->where('enrolled', false)->where('course.lessons.0.body', null));
        $this->enroll($member, $course);
        foreach ([$public, $dashboard] as $url) {
            $this->get($url)->assertInertia(fn (Assert $page) => $page
                ->component('learning/CourseShow')->where('enrolled', true)
                ->where('eligible', true)->where('course.lessons.0.body', 'Private first lesson.'));
        }
        $course->update(['access_tier' => 'paid']);
        $this->get($public)->assertInertia(fn (Assert $page) => $page
            ->where('eligible', false)->where('course.lessons.0.body', null));
        $course->update(['is_published' => false]);
        $this->get($public)->assertNotFound();
        $this->get($dashboard)->assertNotFound();
    }

    public function test_completion_notes_and_certificate_are_member_scoped_and_idempotent(): void
    {
        $course = $this->course();
        $member = $this->member();
        $other = $this->member();
        $this->enroll($member, $course);
        $this->enroll($other, $course);
        $keys = array_column(app(CourseLessonProgress::class)->lessons($course), 'key');
        $url = '/learning/courses/'.$course->slug.'/lessons/';
        $this->actingAs($member)->get('/dashboard/learning?tab=my-learning')->assertInertia(fn (Assert $page) => $page->component('learning/MyLearning')->where('courses.0.completed', 0));
        $this->get($url.'1')->assertInertia(fn (Assert $page) => $page->where('canRead', true)->where('lesson.body', 'Private first lesson.'));
        $this->postJson($url.'1/notes', ['lessonKey' => $keys[0], 'notes' => 'Private note'])->assertOk();
        $this->postJson($url.'1/complete', ['lessonKey' => $keys[0]])->assertOk()->assertJsonPath('percent', 50);
        $this->assertDatabaseCount('learning_course_certificates', 0);
        $this->assertDatabaseCount('learning_course_completions', 0);
        $this->postJson($url.'2/complete', ['lessonKey' => $keys[1]])->assertOk()->assertJsonPath('percent', 100);
        $this->postJson($url.'2/complete', ['lessonKey' => $keys[1]])->assertOk()->assertJsonPath('percent', 100);
        $this->assertDatabaseCount('learning_course_certificates', 1);
        $this->assertDatabaseCount('learning_course_completions', 1);
        $this->assertDatabaseHas('learning_course_lesson_progress', ['user_id' => $member->id, 'lesson_key' => $keys[0], 'notes' => 'Private note']);
        $reference = DB::table('learning_course_certificates')->value('reference');
        $this->get('/dashboard/learning/courses/'.$course->slug)->assertInertia(fn (Assert $page) => $page
            ->where('certificate.reference', $reference)->where('certificate.memberName', $member->name)
            ->where('certificate.courseTitle', $course->title)->where('course.certificateEnabled', true));
        $this->get('/dashboard/learning/my-learning')->assertInertia(fn (Assert $page) => $page->where('courses.0.certificate', $reference));
        $this->get('/dashboard/features/achievements')->assertInertia(fn (Assert $page) => $page
            ->where('snapshot.metrics.courses', 1)->where('snapshot.metrics.certificates', 1)->where('snapshot.certificates.0.reference', $reference));
        $course->update(['certificate_enabled' => false]);
        $this->get('/dashboard/learning/courses/'.$course->slug)->assertInertia(fn (Assert $page) => $page
            ->where('certificate.reference', $reference)->where('course.certificateEnabled', false));
        $this->get('/dashboard/learning/certificates/'.$reference)->assertInertia(fn (Assert $page) => $page->component('learning/CertificateShow')->where('certificate.reference', $reference));
        $this->actingAs($other)->get($url.'1')->assertInertia(fn (Assert $page) => $page->where('notes', '')->where('progress.completed', 0));
        $this->get('/learning/certificates/'.$reference)->assertNotFound();
        $this->get('/dashboard/learning/courses/'.$course->slug)->assertInertia(fn (Assert $page) => $page->where('certificate', null));
        $this->get('/dashboard/features/achievements')->assertInertia(fn (Assert $page) => $page->where('snapshot.certificates', []));
    }

    public function test_course_without_certificate_still_records_completion_and_badges(): void
    {
        $course = $this->course();
        $course->update(['certificate_enabled' => false]);
        $member = $this->member();
        $this->enroll($member, $course);
        $keys = array_column(app(CourseLessonProgress::class)->lessons($course), 'key');
        $url = '/learning/courses/'.$course->slug.'/lessons/';
        $this->actingAs($member)->postJson($url.'1/complete', ['lessonKey' => $keys[0]])->assertOk();
        $this->postJson($url.'2/complete', ['lessonKey' => $keys[1]])->assertOk()->assertJsonPath('percent', 100);
        $this->postJson($url.'2/complete', ['lessonKey' => $keys[1]])->assertOk();
        $this->assertDatabaseCount('learning_course_completions', 1);
        $this->assertDatabaseCount('learning_course_certificates', 0);
        $this->get('/dashboard/learning/my-learning')->assertInertia(fn (Assert $page) => $page
            ->where('courses.0.percent', 100)->where('courses.0.certificate', null));
        $this->get('/dashboard/features/achievements')->assertInertia(fn (Assert $page) => $page
            ->where('snapshot.metrics.courses', 1)->where('snapshot.metrics.certificates', 0)->where('snapshot.certificates', []));
        // Toggling on does not retroactively issue certificates from a replayed completion.
        $course->update(['certificate_enabled' => true]);
        $this->postJson($url.'2/complete', ['lessonKey' => $keys[1]])->assertOk();
        $this->assertDatabaseCount('learning_course_certificates', 0);
    }

    public function test_stale_keys_and_cross_lesson_questions_are_rejected(): void
    {
        $course = $this->course();
        $member = $this->member();
        $this->enroll($member, $course);
        $question = LearningCourseQuestion::query()->create([
            'course_id' => $course->id, 'code' => 'TEST-1', 'section_title' => 'Introduction', 'topic_title' => 'First lesson',
            'kind' => 'question', 'difficulty' => 'Easy', 'prompt' => 'Choose A', 'options' => ['A' => 'A', 'B' => 'B', 'C' => 'C', 'D' => 'D'],
            'correct_option' => 'A', 'explanation' => 'Explanation', 'is_published' => true,
        ]);
        $keys = array_column(app(CourseLessonProgress::class)->lessons($course), 'key');
        $url = '/learning/courses/'.$course->slug.'/lessons/';
        $this->actingAs($member)->get($url.'1')->assertInertia(fn (Assert $page) => $page->where('question.id', $question->id)->missing('question.correctOption')->missing('question.explanation'));
        $this->postJson($url.'1/check', ['lessonKey' => $keys[0], 'question' => $question->id, 'option' => 'A'])->assertOk()->assertJsonPath('correct', true);
        $this->postJson($url.'2/check', ['lessonKey' => $keys[1], 'question' => $question->id, 'option' => 'A'])->assertNotFound();
        $this->postJson($url.'1/complete', ['lessonKey' => str_repeat('a', 64)])->assertConflict();
        $course->update(['access_tier' => 'paid']);
        $this->get($url.'1')->assertInertia(fn (Assert $page) => $page->where('canRead', false)->where('lesson.body', ''));
        $this->postJson($url.'1/complete', ['lessonKey' => $keys[0]])->assertForbidden();
    }
}
