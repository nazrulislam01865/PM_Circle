<?php

namespace Tests\Feature\Admin;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class AdminDashboardOverviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Cache::flush();
    }

    private function admin(): User
    {
        return User::factory()->create([
            'is_admin' => true, 'status' => 'active', 'onboarding_step' => 3,
            'email_verified_at' => now(),
        ]);
    }

    public function test_admin_dashboard_is_protected_and_has_a_dynamic_overview(): void
    {
        $this->get('/admin')->assertRedirect();
        $member = User::factory()->create(['is_admin' => false, 'email_verified_at' => now()]);
        $this->actingAs($member)->get('/admin')->assertForbidden();

        $this->actingAs($this->admin())->get('/admin?days=30')->assertOk()->assertInertia(
            fn (Assert $page) => $page->component('admin/Dashboard')
                ->where('days', 30)
                ->has('series', 30)
                ->has('stats.members')
                ->has('stats.learners')
                ->has('stats.questionSets')
                ->has('stats.aiRequestsToday')
                ->has('stats.posts')
                ->has('stats.enrollments')
                ->has('mix', 5)
                ->has('health')
                ->has('interview')
        );
    }

    public function test_metrics_and_pending_reviews_come_from_database_not_demo_numbers(): void
    {
        $admin = $this->admin();
        $author = User::factory()->create([
            'status' => 'active', 'is_admin' => false, 'email_verified_at' => now(),
        ]);
        $post = Post::create([
            'author_id' => $author->id, 'body' => 'Real community announcement',
            'visibility' => 'public', 'status' => 'published', 'published_at' => now(),
        ]);
        DB::table('post_reports')->insert([
            'post_id' => $post->id, 'reporter_id' => $admin->id,
            'reason' => 'other', 'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('learning_demo_course_enrollments')->insert([
            'user_id' => $author->id, 'course_slug' => 'real-learning-course',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        Cache::flush();
        $this->actingAs($admin)->get('/admin')->assertOk()->assertInertia(
            fn (Assert $page) => $page->component('admin/Dashboard')
                ->where('stats.members.value', 1)
                ->where('stats.learners.value', 1)
                ->where('stats.posts.value', 1)
                ->where('stats.enrollments.value', 1)
                ->where('pendingReviewCount', 1)
                ->where('pending.0.count', 1)
                ->where('pending.0.href', '/admin/post-reports')
        );
    }

    public function test_unexpected_query_values_use_a_safe_default(): void
    {
        $this->actingAs($this->admin())->get('/admin?days[]=90')->assertOk()->assertInertia(
            fn (Assert $page) => $page->component('admin/Dashboard')->where('days', 7)->has('series', 7)
        );
    }
}
