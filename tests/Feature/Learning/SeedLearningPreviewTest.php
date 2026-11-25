<?php

namespace Tests\Feature\Learning;

use App\Models\LearningCourse;
use App\Models\User;
use App\Services\Learning\CourseLessonProgress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class SeedLearningPreviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_preview_is_scoped_idempotent_and_does_not_reset_progress(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3, 'is_admin' => false]);
        $other = User::factory()->create(['onboarding_step' => 3, 'is_admin' => false]);
        $this->artisan('learning:seed-preview', ['email' => $member->email])->assertSuccessful();
        $agile = LearningCourse::query()->where('slug', 'preview-agile-scrum')->firstOrFail();
        $foundations = LearningCourse::query()->where('slug', 'preview-project-foundations')->firstOrFail();
        $service = app(CourseLessonProgress::class);
        $this->assertSame(33, $service->summary($service->lessons($agile), $service->records($member, $agile->id))['percent']);
        $this->assertSame(100, $service->summary($service->lessons($foundations), $service->records($member, $foundations->id))['percent']);
        $this->assertSame(3, $agile->questions()->count());
        $this->assertSame(3, $foundations->questions()->count());
        $this->assertDatabaseHas('learning_course_certificates', ['user_id' => $member->id, 'course_id' => $foundations->id, 'course_title' => 'Project Management Foundations (Demo)']);
        $this->assertDatabaseMissing('learning_demo_course_enrollments', ['user_id' => $other->id]);
        $reference = DB::table('learning_course_certificates')->where('user_id', $member->id)->value('reference');
        $second = $service->lessons($agile)[1]['key'];
        $service->complete($member, $agile, $second);
        $service->saveNotes($member, $agile, $second, 'Keep this note');
        $this->artisan('learning:seed-preview', ['email' => $member->email])->assertSuccessful();
        $this->assertSame(66, $service->summary($service->lessons($agile), $service->records($member, $agile->id))['percent']);
        $this->assertSame($reference, DB::table('learning_course_certificates')->where('user_id', $member->id)->value('reference'));
        $this->assertDatabaseHas('learning_course_lesson_progress', ['user_id' => $member->id, 'lesson_key' => $second, 'notes' => 'Keep this note']);
        $this->assertDatabaseCount('learning_course_certificates', 1);
    }

    public function test_preview_rejects_an_admin_and_production_environment(): void
    {
        $admin = User::factory()->create(['onboarding_step' => 3, 'is_admin' => true]);
        $this->artisan('learning:seed-preview', ['email' => $admin->email])->assertFailed();
        $member = User::factory()->create(['onboarding_step' => 3, 'is_admin' => false]);
        $original = app()->environment();
        try {
            app()->instance('env', 'production');
            $this->artisan('learning:seed-preview', ['email' => $member->email])->assertFailed();
        } finally {
            app()->instance('env', $original);
        }
        $this->assertDatabaseMissing('learning_courses', ['slug' => 'preview-agile-scrum']);
    }
}
