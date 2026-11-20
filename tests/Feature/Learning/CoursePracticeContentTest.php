<?php

namespace Tests\Feature\Learning;

use App\Models\LearningCourse;
use App\Models\LearningCoursePracticeAttempt;
use App\Models\LearningCourseQuestion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class CoursePracticeContentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function course(): LearningCourse
    {
        return LearningCourse::query()->create([
            'slug' => 'course-practice-test', 'title' => 'Course practice test',
            'summary' => 'A course with scenario questions.', 'overview' => 'Complete course.',
            'category' => 'Project Management', 'level' => 'Beginner', 'minutes' => 120,
            'access_tier' => 'free', 'objectives' => ['Understand delivery'],
            'outline' => [['title' => 'Foundations', 'topics' => ['Stakeholders', 'Planning']]],
            'lessons' => [['title' => 'Lesson', 'body' => 'Private lesson body']],
            'is_published' => true, 'practice_enabled' => true,
            'practice_question_count' => 2, 'practice_duration_minutes' => 25,
        ]);
    }

    private function user(bool $admin = false): User
    {
        return User::factory()->create([
            'is_admin' => $admin, 'onboarding_step' => 3, 'email_verified_at' => now(),
        ]);
    }

    private function enroll(LearningCourse $course, User $user): void
    {
        DB::table('learning_demo_course_enrollments')->insert([
            'course_slug' => $course->slug, 'user_id' => $user->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function question(LearningCourse $course, string $code, bool $publish = true): LearningCourseQuestion
    {
        return $course->questions()->create([
            'code' => $code, 'section_title' => 'Foundations', 'topic_title' => 'Stakeholders',
            'kind' => 'scenario', 'difficulty' => 'Moderate', 'prompt' => 'A stakeholder changes direction. What next?',
            'options' => ['A' => 'Discuss impact', 'B' => 'Ignore it', 'C' => 'Cancel project', 'D' => 'Wait'],
            'correct_option' => 'A', 'explanation' => 'CorrectAnswerSecret: discuss scope and impact.',
            'is_published' => $publish,
        ]);
    }

    public function test_admin_can_add_curriculum_question_and_wrong_topic_is_rejected(): void
    {
        $course = $this->course();
        $admin = $this->user(true);
        $payload = [
            'code' => 'my-question-1', 'section_title' => 'Foundations', 'topic_title' => 'Stakeholders',
            'kind' => 'scenario', 'difficulty' => 'Hard', 'prompt' => 'How should a risk be handled?',
            'options' => ['A' => 'Assess', 'B' => 'Ignore', 'C' => 'Delay', 'D' => 'Abandon'],
            'correct_option' => 'A', 'explanation' => 'Evaluate the risk.', 'is_published' => true,
        ];
        $this->actingAs($this->user())->post("/admin/learning/courses/{$course->id}/questions", $payload)->assertForbidden();
        $this->actingAs($admin)->post("/admin/learning/courses/{$course->id}/questions", $payload)->assertRedirect();
        $this->assertDatabaseHas('learning_course_questions', ['course_id' => $course->id, 'code' => 'my-question-1']);
        $this->post("/admin/learning/courses/{$course->id}/questions", [
            ...$payload, 'code' => 'my-question-2', 'topic_title' => 'Unrelated topic',
        ])->assertSessionHasErrors('topic_title');
        $this->assertDatabaseCount('learning_course_questions', 1);
    }

    public function test_course_csv_import_is_atomic_and_preserves_section_topic_and_publication(): void
    {
        $course = $this->course();
        $this->actingAs($this->user(true));
        $header = implode(',', \App\Services\Learning\CourseQuestionImporter::HEADERS);
        $row = 'C-001,Foundations,Stakeholders,scenario,Easy,"What should a PM do?",Assess,Ignore,Wait,Cancel,A,"Explain why",No';
        $invalid = 'C-002,Foundations,Unknown,question,Easy,"What now?",Assess,Ignore,Wait,Cancel,A,"Explain",Yes';
        $this->post("/admin/learning/courses/{$course->id}/questions/import", [
            'file' => UploadedFile::fake()->createWithContent('questions.csv', $header."\n".$row."\n".$invalid."\n"),
            'publish_all' => false,
        ])->assertSessionHasErrors('file');
        $this->assertDatabaseCount('learning_course_questions', 0);
        $this->post("/admin/learning/courses/{$course->id}/questions/import", [
            'file' => UploadedFile::fake()->createWithContent('questions.csv', $header."\n".$row."\n"),
            'publish_all' => true,
        ])->assertRedirect();
        $this->assertDatabaseHas('learning_course_questions', [
            'course_id' => $course->id, 'code' => 'C-001',
            'topic_title' => 'Stakeholders', 'is_published' => true,
        ]);
        $this->post("/admin/learning/courses/{$course->id}/questions/import", [
            'file' => UploadedFile::fake()->createWithContent('questions.csv', $header."\n".$row."\n"),
            'publish_all' => false,
        ])->assertSessionHasErrors('file');
        $this->assertDatabaseCount('learning_course_questions', 1);
    }

    public function test_member_practice_has_exact_configured_questions_and_scoring_is_server_side(): void
    {
        $course = $this->course();
        $question1 = $this->question($course, 'start-1');
        $this->question($course, 'start-2');
        $member = $this->user();
        $this->actingAs($member)->post("/learning/courses/{$course->slug}/practice/start")->assertForbidden();
        $this->enroll($course, $member);
        $this->post("/learning/courses/{$course->slug}/practice/start")->assertRedirect();
        $attempt = LearningCoursePracticeAttempt::query()->where('user_id', $member->id)->firstOrFail();
        $this->assertCount(2, $attempt->questions);
        $this->assertSame(25, (int) $attempt->started_at->diffInMinutes($attempt->expires_at));
        $this->get("/learning/courses/{$course->slug}/practice/{$attempt->id}")
            ->assertOk()->assertDontSee('CorrectAnswerSecret');
        $this->putJson("/learning/courses/{$course->slug}/practice/{$attempt->id}/answer", [
            'question_id' => $question1->id, 'option' => 'A',
        ])->assertOk()->assertJson(['saved' => true]);
        $this->post("/learning/courses/{$course->slug}/practice/{$attempt->id}/submit")->assertRedirect();
        $this->assertDatabaseHas('learning_course_practice_attempts', [
            'id' => $attempt->id, 'score' => 1, 'status' => 'submitted',
        ]);
        $this->get("/learning/courses/{$course->slug}/practice/{$attempt->id}/result")->assertOk();
        $outsider = $this->user();
        $this->actingAs($outsider)->get("/learning/courses/{$course->slug}/practice/{$attempt->id}")->assertNotFound();
    }

    public function test_saved_answers_are_scored_when_timer_expires(): void
    {
        $course = $this->course();
        $question = $this->question($course, 'expiry-1');
        $this->question($course, 'expiry-2');
        $member = $this->user();
        $this->enroll($course, $member);
        $this->actingAs($member)->post("/learning/courses/{$course->slug}/practice/start")->assertRedirect();
        $attempt = LearningCoursePracticeAttempt::query()->where('user_id', $member->id)->firstOrFail();
        $this->putJson("/learning/courses/{$course->slug}/practice/{$attempt->id}/answer", [
            'question_id' => $question->id, 'option' => 'A',
        ])->assertOk();
        $attempt->update(['expires_at' => now()->subMinute()]);
        $this->post("/learning/courses/{$course->slug}/practice/{$attempt->id}/submit")->assertRedirect();
        $this->assertDatabaseHas('learning_course_practice_attempts', [
            'id' => $attempt->id, 'status' => 'expired', 'score' => 1,
        ]);
        $this->putJson("/learning/courses/{$course->slug}/practice/{$attempt->id}/answer", [
            'question_id' => $question->id, 'option' => 'B',
        ])->assertStatus(409);
    }

    public function test_unpublished_question_is_not_available_and_attempt_does_not_shrink(): void
    {
        $course = $this->course();
        $this->question($course, 'published');
        $this->question($course, 'draft', false);
        $member = $this->user();
        $this->enroll($course, $member);
        $this->actingAs($member)->post("/learning/courses/{$course->slug}/practice/start")
            ->assertSessionHasErrors('section');
        $this->assertDatabaseCount('learning_course_practice_attempts', 0);
    }

    public function test_private_resource_requires_enrollment_and_cannot_be_accessed_from_other_course(): void
    {
        Storage::fake('local');
        $course = $this->course();
        $other = $course->replicate();
        $other->slug = 'other-course';
        $other->save();
        $admin = $this->user(true);
        $this->actingAs($admin)->post("/admin/learning/courses/{$course->id}/resources", [
            'title' => 'Study notes', 'section_title' => 'Foundations', 'description' => '',
            'kind' => 'file', 'file' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
            'is_published' => true,
        ])->assertRedirect();
        $resource = $course->resources()->firstOrFail();
        $member = $this->user();
        $this->actingAs($member)->get("/learning/courses/{$course->slug}/resources/{$resource->id}")->assertForbidden();
        $this->enroll($course, $member);
        $this->get("/learning/courses/{$course->slug}/resources/{$resource->id}")->assertOk();
        $this->get("/learning/courses/{$other->slug}/resources/{$resource->id}")->assertNotFound();
    }
}
