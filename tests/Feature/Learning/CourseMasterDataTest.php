<?php

namespace Tests\Feature\Learning;

use App\Models\LearningCourse;
use App\Models\MasterDataOption;
use App\Models\User;
use App\Support\Admin\CourseMasterData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CourseMasterDataTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->actingAs(User::factory()->create([
            'is_admin' => true, 'onboarding_step' => 3, 'email_verified_at' => now(),
        ]));
    }

    private function courseData(array $changes = []): array
    {
        return array_replace([
            'title' => 'Master Data Driven Course', 'summary' => 'Practical course summary',
            'overview' => 'Learn the essentials of planning and project delivery.',
            'category' => 'Project Management', 'level' => 'Beginner',
            'minutes' => 120, 'access_tier' => 'free', 'is_published' => false,
            'objectives' => ['Understand the process'],
            'outline' => [['title' => 'Foundations', 'topics' => ['Stakeholders']]],
            'lessons' => [['title' => 'Getting started', 'body' => 'Read and practice this lesson.']],
        ], $changes);
    }

    public function test_existing_course_dropdowns_are_initialized_without_changing_courses(): void
    {
        $this->assertDatabaseHas('master_data_options', ['category' => 'course_category', 'value' => 'Project Management']);
        $this->assertDatabaseHas('master_data_options', ['category' => 'course_access', 'value' => 'paid']);
        $this->assertDatabaseHas('master_data_options', ['category' => 'course_resource_kind', 'value' => 'file']);
        $this->assertNotEmpty(CourseMasterData::options()['course_category']);
        $this->assertDatabaseHas('learning_courses', ['slug' => 'agile-scrum-fundamentals']);
    }

    public function test_admin_can_add_course_category_and_use_it_in_course_editor(): void
    {
        $this->post('/admin/master-data', [
            'category' => 'course_category', 'value' => 'Business Analysis', 'label' => 'Business Analysis',
        ])->assertRedirect();
        $this->post('/admin/learning/courses', $this->courseData([
            'title' => 'Custom Course Category', 'category' => 'Business Analysis',
        ]))->assertRedirect();
        $this->assertDatabaseHas('learning_courses', [
            'slug' => 'custom-course-category', 'category' => 'Business Analysis',
        ]);
    }

    public function test_inactive_category_is_hidden_and_rejected_for_new_courses(): void
    {
        MasterDataOption::query()->where('category', 'course_category')
            ->where('value', 'Project Management')->update(['is_active' => false]);
        $this->assertNotContains('Project Management', CourseMasterData::values()['course_category']);
        $this->post('/admin/learning/courses', $this->courseData())->assertSessionHasErrors('category');
    }

    public function test_archived_category_is_preserved_when_updating_existing_course(): void
    {
        $course = LearningCourse::query()->firstOrFail();
        MasterDataOption::query()->where('category', 'course_category')
            ->where('value', $course->category)->update(['is_active' => false]);
        $choices = CourseMasterData::options(['course_category' => $course->category]);
        $this->assertContains($course->category, array_column($choices['course_category'], 'value'));
        $this->put('/admin/learning/courses/'.$course->id, $this->courseData([
            'title' => $course->title, 'category' => $course->category,
            'level' => $course->level, 'access_tier' => $course->access_tier,
        ]))->assertRedirect();
    }

    public function test_unsupported_access_tier_cannot_be_created_from_master_data(): void
    {
        $this->post('/admin/master-data', [
            'category' => 'course_access', 'value' => 'enterprise', 'label' => 'Enterprise',
        ])->assertSessionHasErrors('value');
        $this->assertDatabaseMissing('master_data_options', [
            'category' => 'course_access', 'value' => 'enterprise',
        ]);
    }
}
