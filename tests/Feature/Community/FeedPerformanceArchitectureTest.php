<?php

namespace Tests\Feature\Community;

use App\Domain\Community\Queries\FeedQuery;
use App\Domain\Community\Services\EngagementStats;
use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class FeedPerformanceArchitectureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['community.engagement_stats_reads' => false, 'community.engagement_stats_writes' => false,
            'community.engagement_write_gate' => false]);
    }

    public function test_progressive_dashboard_and_partial_feed_do_not_run_history_queries(): void
    {
        config(['community.progressive_dashboard_enabled' => true]);
        $user = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($user);
        $history = [];
        DB::listen(function ($query) use (&$history): void {
            if (preg_match('/learning_activity_completions|pmp_exam_attempts|member_profile_views|learning_course_certificates|interview_sessions/i', $query->sql)) {
                $history[] = $query->sql;
            }
        });
        $this->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page
            ->component('account/Dashboard')->has('dashboard.member')->has('feed.posts')
            ->has('postChecks')->has('feedScopeCounts')->missing('statistics')->missing('planUsage'));
        $this->assertSame([], $history);
        $this->get('/dashboard?tab=mine', [
            'X-Inertia' => 'true', 'X-Inertia-Partial-Component' => 'account/Dashboard',
            'X-Inertia-Partial-Data' => 'feed,postChecks,feedScopeCounts',
        ])->assertOk()->assertJsonPath('props.feed.feedTab', 'mine')
            ->assertJsonMissingPath('props.statistics')->assertJsonMissingPath('props.planUsage');
        $this->assertSame([], $history);
        $this->get('/dashboard', [
            'X-Inertia' => 'true', 'X-Inertia-Partial-Component' => 'account/Dashboard',
            'X-Inertia-Partial-Data' => 'statistics,planUsage',
        ])->assertOk()->assertJsonStructure(['props' => ['statistics' => ['learning', 'overview'], 'planUsage']]);
        $this->assertNotEmpty($history);
    }

    public function test_cursor_context_and_viewer_binding_reverse_seek_and_anchor(): void
    {
        $viewer = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $published = now()->subHour();
        for ($i = 0; $i < 45; $i++) Post::create(['author_id' => $other->id, 'body' => "Fixture {$i}",
            'status' => 'published', 'visibility' => 'members', 'published_at' => $published]);
        $query = app(FeedQuery::class);
        $first = $query->page('all', 'All', null, $viewer, null, true);
        $this->assertCount(20, $first['data']);
        $cursor = $first['next_cursor'];
        $new = Post::create(['author_id' => $other->id, 'body' => 'New publication', 'status' => 'published', 'visibility' => 'members', 'published_at' => now()]);
        $second = $query->page('all', 'All', null, $viewer, $cursor, true);
        $this->assertCount(12, $second['data']);
        $firstIds = array_column($first['data'], 'id');
        $secondIds = array_column($second['data'], 'id');
        $this->assertSame([], array_intersect($firstIds, $secondIds));
        $reverse = $query->page('all', 'All', null, $viewer, $second['previous_cursor'], true);
        $this->assertSame(array_slice($firstIds, -12), array_column($reverse['data'], 'id'));
        $this->assertNotContains($new->id, array_column($reverse['data'], 'id'));
        $url = '/community/feed-page?'.http_build_query(['tab' => 'all', 'topic' => 'All', 'context' => 'community', 'cursor' => $cursor]);
        $this->actingAs($viewer)->getJson($url)->assertStatus(422);
        $dashboardUrl = str_replace('context=community', 'context=dashboard', $url);
        $this->actingAs($other)->getJson($dashboardUrl)->assertStatus(422);
        $response = $this->actingAs($viewer)->getJson($dashboardUrl)->assertOk();
        $this->assertStringContainsString('private', $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertSame([], $query->page('all', 'All', null, null)['data']);
    }

    public function test_visible_counter_backfill_and_moderation_transitions_match_oracle(): void
    {
        $owner = User::factory()->create();
        $author = User::factory()->create();
        $post = Post::create(['author_id' => $owner->id, 'body' => 'Counter fixture', 'published_at' => now()]);
        $make = fn ($status) => Comment::create(['post_id' => $post->id, 'author_id' => $author->id,
            'body' => 'Counter test', 'check_status' => $status]);
        $legacy = $make(null); $approved = $make('approved'); $pending = $make('pending_check');
        $make('restricted'); $make('approved')->delete();
        config(['community.engagement_write_gate' => true]);
        $this->artisan('community:backfill-engagement-stats')->assertExitCode(0);
        $this->artisan('community:backfill-engagement-stats', ['--verify' => true])->assertExitCode(0);
        $count = fn () => (int) DB::table('post_engagement_stats')->where('post_id', $post->id)->value('comments_count');
        $this->assertSame(2, $count());
        config(['community.engagement_write_gate' => false, 'community.engagement_stats_writes' => true, 'community.engagement_stats_reads' => true]);
        DB::transaction(function () use ($author, $pending, $approved, $legacy): void {
            EngagementStats::lockMember($author->id);
            $pending->update(['check_status' => 'approved']);
            $pending->update(['check_status' => 'approved']);
            $approved->update(['check_status' => 'restricted']);
            $legacy->delete(); $legacy->restore();
        });
        $this->assertSame(2, $count());
        $this->assertSame($post->comments()->visible()->count(), $count());
        $this->artisan('community:backfill-engagement-stats', ['--verify' => true])->assertExitCode(0);
        DB::transaction(function () use ($author): void {
            EngagementStats::lockMember($author->id);
            EngagementStats::beforeMemberDeletion($author->id);
            $author->delete();
        });
        $this->assertSame(0, $count());
        $this->artisan('community:backfill-engagement-stats', ['--verify' => true])->assertExitCode(0);
    }
}
