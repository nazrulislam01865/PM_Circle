<?php

namespace Tests\Feature\Learning;

use App\Models\LearningCourse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class LearningCourseManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function admin(): User
    {
        return User::factory()->create([
            'is_admin' => true, 'onboarding_step' => 3, 'email_verified_at' => now(),
        ]);
    }

    private function member(): User
    {
        return User::factory()->create([
            'is_admin' => false, 'onboarding_step' => 3, 'email_verified_at' => now(),
        ]);
    }

    private function payload(array $changes = []): array
    {
        return array_merge([
            'title' => 'PM Circle Learning Fundamentals',
            'summary' => 'Introduction to practical project delivery.',
            'overview' => 'Learn planning, stakeholder communication, and project delivery principles.',
            'category' => 'Project Management',
            'level' => 'Beginner',
            'minutes' => 120,
            'thumbnail' => 2,
            'access_tier' => 'free',
            'is_published' => true,
            'objectives' => ['Plan a simple project'],
            'outline' => [['title' => 'Project foundations', 'topics' => ['Define project value']]],
            'lessons' => [['title' => 'First steps', 'body' => 'Practice documenting a short project charter.']],
        ], $changes);
    }

    public function test_existing_catalog_is_migrated_without_changing_course_slugs(): void
    {
        $this->assertDatabaseHas('learning_courses', [
            'slug' => 'agile-scrum-fundamentals', 'is_published' => true,
        ]);
        $course = LearningCourse::query()->where('slug', 'agile-scrum-fundamentals')->firstOrFail();
        $this->assertNotEmpty($course->lessons);
        $this->assertNotEmpty($course->outline);
        $this->assertNotEmpty($course->objectives);

        $member = $this->member();
        DB::table('learning_demo_course_enrollments')->insert([
            'user_id' => $member->id, 'course_slug' => 'agile-scrum-fundamentals',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($member)->get('/learning/courses/agile-scrum-fundamentals')->assertOk();
        $this->assertSame(1, DB::table('learning_demo_course_enrollments')->where('user_id', $member->id)->count());
    }

    public function test_only_admin_can_create_courses_and_member_cannot_publish(): void
    {
        $this->get('/admin/learning/courses')->assertRedirect();
        $this->actingAs($this->member())->get('/admin/learning/courses')->assertForbidden();
        $this->post('/admin/learning/courses', $this->payload())->assertForbidden();
        $this->actingAs($this->admin())->get('/admin/learning/courses')->assertOk();
        $this->post('/admin/learning/courses', $this->payload())->assertRedirect();
        $this->assertDatabaseHas('learning_courses', [
            'slug' => 'pm-circle-learning-fundamentals', 'is_published' => true,
        ]);
    }

    public function test_new_course_can_be_saved_as_draft_then_published(): void
    {
        $this->actingAs($this->admin());
        $this->post('/admin/learning/courses', $this->payload(['is_published' => false]))->assertRedirect();
        $course = LearningCourse::query()->where('slug', 'pm-circle-learning-fundamentals')->firstOrFail();
        $this->get('/learning/courses/'.$course->slug)->assertNotFound();
        $this->patch('/admin/learning/courses/'.$course->id.'/publish')->assertRedirect();
        $this->get('/learning/courses/'.$course->slug)->assertOk();
    }

    public function test_course_updates_keep_slug_and_original_enrollment(): void
    {
        $this->actingAs($this->admin());
        $course = LearningCourse::query()->where('slug', 'agile-scrum-fundamentals')->firstOrFail();
        $member = $this->member();
        DB::table('learning_demo_course_enrollments')->insert([
            'user_id' => $member->id, 'course_slug' => $course->slug,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->put('/admin/learning/courses/'.$course->id, $this->payload([
            'title' => 'Renamed Agile & Scrum Curriculum',
        ]))->assertRedirect();
        $this->assertDatabaseHas('learning_courses', [
            'id' => $course->id, 'slug' => 'agile-scrum-fundamentals',
            'title' => 'Renamed Agile & Scrum Curriculum',
        ]);
        $this->assertDatabaseHas('learning_demo_course_enrollments', [
            'course_slug' => 'agile-scrum-fundamentals', 'user_id' => $member->id,
        ]);
    }

    public function test_public_course_detail_does_not_expose_private_lesson_body(): void
    {
        $this->actingAs($this->admin())->post('/admin/learning/courses', $this->payload([
            'lessons' => [['title' => 'Private lesson', 'body' => 'PrivateLearnerNotesShouldNotLeak']],
        ]))->assertRedirect();

        auth()->logout();
        $this->get('/learning/courses/pm-circle-learning-fundamentals')
            ->assertOk()
            ->assertDontSee('PrivateLearnerNotesShouldNotLeak');
    }

    public function test_invalid_course_data_does_not_create_records(): void
    {
        $this->actingAs($this->admin());
        $before = LearningCourse::query()->count();
        $this->post('/admin/learning/courses', $this->payload([
            'title' => 'Invalid course',
            'objectives' => [],
            'lessons' => [['title' => 'Incomplete', 'body' => '']],
        ]))->assertSessionHasErrors(['objectives', 'lessons.0.body']);
        $this->assertSame($before, LearningCourse::query()->count());
    }
}
