<?php

namespace Tests\Feature\Learning;

use App\Models\LearningCourse;
use App\Models\User;
use App\Services\Learning\CourseLessonProgress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class CourseDynamicManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function member(bool $admin = false): User
    {
        return User::factory()->create(['is_admin' => $admin, 'status' => 'active', 'onboarding_step' => 3, 'email_verified_at' => now()]);
    }

    private function payload(): array
    {
        return [
            'title' => 'Dynamic learning test', 'summary' => 'Learn delivery.', 'overview' => 'Course overview.',
            'category' => 'Project Management', 'level' => 'Beginner', 'minutes' => 90, 'access_tier' => 'free',
            'is_published' => true, 'sort_order' => 2, 'objectives' => ['Learn planning'],
            'outline' => [['title' => 'Delivery', 'topics' => ['Planning', 'Quality']]],
            'lessons' => [
                ['title' => 'Plan a delivery', 'body' => 'Private planning material', 'section_title' => 'Delivery', 'topic_title' => 'Planning'],
                ['title' => 'Review quality', 'body' => 'Private quality material', 'section_title' => 'Delivery', 'topic_title' => 'Quality'],
            ],
            'presentation' => ['type' => 'Professional development', 'tags' => ['Planning'], 'provider_name' => 'Course provider test', 'provider_description' => 'Provider description',
                'faq' => [['question' => 'What will I learn?', 'answer' => 'Planning and quality.']], 'practice_examples' => [['question' => 'What is a milestone?', 'answer' => 'A significant event.']]],
        ];
    }

    private function createCourse(): LearningCourse
    {
        $this->actingAs($this->member(true))->post('/admin/learning/courses', ['course_payload' => json_encode($this->payload(), JSON_THROW_ON_ERROR)])->assertSessionHasNoErrors()->assertRedirect();
        return LearningCourse::query()->where('slug', 'dynamic-learning-test')->firstOrFail();
    }

    private function enroll(User $member, LearningCourse $course): void
    {
        DB::table('learning_demo_course_enrollments')->insert(['user_id' => $member->id, 'course_slug' => $course->slug, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_admin_can_enable_and_disable_course_certificate(): void
    {
        $admin = $this->member(true);
        $payload = [...$this->payload(), 'certificate_enabled' => true];
        $this->actingAs($admin)->post('/admin/learning/courses', ['course_payload' => json_encode($payload, JSON_THROW_ON_ERROR)])
            ->assertSessionHasNoErrors()->assertRedirect();
        $course = LearningCourse::query()->where('slug', 'dynamic-learning-test')->firstOrFail();
        $this->assertTrue($course->certificate_enabled);
        $base = '/admin/learning/courses/'.$course->id;
        $this->get($base.'/edit')->assertInertia(fn (Assert $page) => $page->where('course.certificateEnabled', true));
        $payload['lessons'] = $course->lessons;
        $payload['certificate_enabled'] = false;
        $this->put($base, $payload)->assertSessionHasNoErrors()->assertRedirect();
        $this->assertFalse($course->fresh()->certificate_enabled);
        $this->put($base, [...$payload, 'certificate_enabled' => 'invalid'])->assertSessionHasErrors('certificate_enabled');
    }

    public function test_catalog_uses_real_enrollments_and_published_ratings(): void
    {
        $course = $this->createCourse();
        $first = $this->member();
        $second = $this->member();
        $catalog = app(\App\Domain\Learning\Queries\DemoCourseCatalog::class);
        $tile = fn () => collect($catalog->all(null))->firstWhere('slug', $course->slug);
        $this->assertSame(0, $tile()['learnerCount']);
        $this->assertNull($tile()['rating']);
        $this->enroll($first, $course);
        $this->enroll($second, $course);
        $course->reviews()->create(['user_id' => $first->id, 'rating' => 5, 'body' => 'Published review', 'is_published' => true]);
        $course->reviews()->create(['user_id' => $second->id, 'rating' => 1, 'body' => 'Pending review', 'is_published' => false]);
        $result = $tile();
        $this->assertSame(2, $result['learnerCount']);
        $this->assertSame(5.0, $result['rating']);
        $this->assertSame(1, $result['reviewCount']);
        $this->assertArrayNotHasKey('user_id', $result);
    }

    public function test_admin_creates_course_and_public_metadata_without_leaking_private_lessons(): void
    {
        $course = $this->createCourse();
        $this->assertFalse($course->certificate_enabled);
        $this->assertTrue(Str::isUuid($course->lessons[0]['uid']));
        $this->assertNotSame($course->lessons[0]['uid'], $course->lessons[1]['uid']);
        auth()->logout();
        $this->get('/learning/courses/'.$course->slug)->assertInertia(fn (Assert $page) => $page
            ->component('learning/CourseShow')->where('course.presentation.provider_name', 'Course provider test')
            ->where('course.presentation.faq.0.question', 'What will I learn?')->where('course.lessons.0.topicTitle', 'Planning')
            ->where('course.lessons.0.body', null)->where('course.reviewCount', 0));
    }

    public function test_lesson_documents_are_scoped_and_private_and_cannot_be_orphaned(): void
    {
        $course = $this->createCourse();
        $uid = $course->lessons[0]['uid'];
        $base = '/admin/learning/courses/'.$course->id;
        $data = ['title' => 'Planning document', 'section_title' => 'Delivery', 'lesson_uid' => $uid, 'kind' => 'link', 'url' => 'https://example.org/planning', 'is_published' => true];
        $this->post($base.'/resources', [...$data, 'lesson_uid' => (string) Str::uuid()])->assertSessionHasErrors('lesson_uid');
        $this->post($base.'/resources', $data)->assertSessionHasNoErrors()->assertRedirect();
        $resource = $course->resources()->firstOrFail();
        $this->get($base.'/content?tab=resources&lesson='.$uid)->assertInertia(fn (Assert $page) => $page->where('resources.total', 1));
        $payload = $this->payload();
        $payload['lessons'] = [$course->lessons[1]];
        $this->put($base, $payload)->assertSessionHasErrors('lessons');
        $member = $this->member();
        $url = '/learning/courses/'.$course->slug;
        $this->actingAs($member)->get($url.'/resources/'.$resource->id)->assertForbidden();
        $this->enroll($member, $course);
        $this->get($url.'/lessons/1')->assertInertia(fn (Assert $page) => $page->has('resources', 1)->where('resources.0.title', 'Planning document'));
        $this->get($url.'/lessons/2')->assertInertia(fn (Assert $page) => $page->has('resources', 0));
        $this->get($url.'/resources/'.$resource->id)->assertRedirect('https://example.org/planning');
        $course->update(['is_published' => false]);
        $this->get($url.'/resources/'.$resource->id)->assertForbidden();
    }

    public function test_uploaded_lecture_documents_use_private_storage_and_entitlement_gate(): void
    {
        Storage::fake('local');
        $course = $this->createCourse();
        $base = '/admin/learning/courses/'.$course->id;
        $file = UploadedFile::fake()->create('planning.pdf', 8, 'application/pdf');
        $this->post($base.'/resources', [
            'title' => 'Planning PDF', 'section_title' => 'Delivery', 'lesson_uid' => $course->lessons[0]['uid'],
            'kind' => 'file', 'file' => $file, 'is_published' => true,
        ])->assertSessionHasNoErrors()->assertRedirect();
        $resource = $course->resources()->firstOrFail();
        Storage::disk('local')->assertExists($resource->file_path);
        $learner = $this->member();
        $url = '/learning/courses/'.$course->slug.'/resources/'.$resource->id;
        $this->actingAs($learner)->get($url)->assertForbidden();
        $this->enroll($learner, $course);
        $this->get($url)->assertOk()->assertDownload('planning.pdf');
        $course->update(['access_tier' => 'paid']);
        $this->get($url)->assertForbidden();
    }

    public function test_adding_metadata_and_reordering_does_not_reset_existing_progress_keys(): void
    {
        $course = $this->createCourse();
        $service = app(CourseLessonProgress::class);
        $before = array_column($service->lessons($course), 'key');
        $lessons = $course->lessons;
        unset($lessons[0]['uid'], $lessons[0]['section_title'], $lessons[0]['topic_title']);
        $course->lessons = $lessons;
        $this->assertSame($before, array_column($service->lessons($course), 'key'));
        $course->lessons = array_reverse($lessons);
        $this->assertSame(array_reverse($before), array_column($service->lessons($course), 'key'));
    }

    public function test_reviews_require_enrollment_and_moderation_and_replacement_does_not_duplicate(): void
    {
        $course = $this->createCourse();
        $admin = auth()->user();
        $learner = $this->member();
        $url = '/learning/courses/'.$course->slug;
        $this->actingAs($learner)->post($url.'/reviews', ['rating' => 5, 'body' => 'Helpful course.'])->assertForbidden();
        $this->enroll($learner, $course);
        $this->post($url.'/reviews', ['rating' => 5, 'body' => 'Helpful course.'])->assertRedirect();
        $review = $course->reviews()->firstOrFail();
        $this->assertFalse($review->is_published);
        auth()->logout();
        $this->get($url)->assertInertia(fn (Assert $page) => $page->where('course.reviewCount', 0)->has('reviews', 0));
        $moderate = '/admin/learning/courses/'.$course->id.'/reviews/'.$review->id;
        $this->actingAs($admin)->patch($moderate, ['is_published' => true, 'revision' => hash('sha256', '5:Helpful course.')])->assertSessionHasNoErrors()->assertRedirect();
        auth()->logout();
        $this->get($url)->assertInertia(fn (Assert $page) => $page->where('course.reviewCount', 1)->where('reviews.0.body', 'Helpful course.')->missing('reviews.0.user_id'));
        $this->actingAs($learner)->post($url.'/reviews', ['rating' => 4, 'body' => 'Updated review.'])->assertRedirect();
        $this->assertSame(1, $course->reviews()->count());
        $this->assertFalse($review->fresh()->is_published);
        $this->actingAs($admin)->patch($moderate, ['is_published' => true, 'revision' => hash('sha256', '5:Helpful course.')])->assertSessionHasErrors('review');
    }
}
