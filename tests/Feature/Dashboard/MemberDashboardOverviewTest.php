<?php

namespace Tests\Feature\Dashboard;

use App\Domain\Dashboard\Queries\MemberDashboardStats;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class MemberDashboardOverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_views_are_unique_per_member_per_day_and_exclude_self_visits(): void
    {
        $owner = User::factory()->create(['onboarding_step' => 3]);
        $viewer = User::factory()->create(['onboarding_step' => 3]);
        $owner->profile()->create(['visibility' => 'public']);

        $this->actingAs($viewer)->get('/members/'.$owner->id)->assertOk();
        $this->get('/members/'.$owner->id)->assertOk();
        $this->assertDatabaseCount('member_profile_views', 1);

        $this->actingAs($owner)->get('/members/'.$owner->id)->assertOk();
        $this->assertDatabaseCount('member_profile_views', 1);

        $this->get('/dashboard')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('account/Dashboard')
            ->where('dashboard.overview.insights.last30', 1)
            ->where('dashboard.overview.insights.thisWeek', 1)
            ->etc());
    }

    public function test_activity_cards_show_member_records_not_demo_numbers(): void
    {
        $user = User::factory()->create(['onboarding_step' => 3]);
        Post::query()->create(['author_id' => $user->id, 'body' => 'My first community post',
            'status' => 'published', 'visibility' => 'public', 'published_at' => now()]);
        $postId = Post::query()->value('id');
        DB::table('comments')->insert(['post_id' => $postId, 'author_id' => $user->id,
            'body' => 'My first reply', 'created_at' => now(), 'updated_at' => now()]);

        $stats = app(MemberDashboardStats::class)->forMember($user);
        $this->assertSame(1, $stats['overview']['contribution']['posts']);
        $this->assertSame(1, $stats['overview']['contribution']['replies']);
        $this->assertSame(0, $stats['overview']['contribution']['responses']);
        $this->assertSame(['first-post', 'first-reply'], array_column($stats['overview']['badges'], 'key'));
        $this->assertSame('0h 0m', $stats['learning']['time']);
        $this->assertSame('Not started', $stats['overview']['syllabus']['status']);
    }
}
