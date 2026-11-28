<?php

namespace Tests\Feature\Activity;

use App\Domain\Activity\Queries\MemberActivityFeed;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class MemberActivityLogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function member(): User
    {
        $user = User::factory()->create(['onboarding_step' => 3]);
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        DB::table('temporary_memberships')->insert(['user_id' => $user->id, 'plan_code' => 'plus', 'created_at' => now(), 'updated_at' => now()]);
        return $user;
    }

    private function post(User $author, string $title = 'Project kickoff checklist'): Post
    {
        return Post::create([
            'author_id' => $author->id,
            'title' => $title,
            'body' => 'Scope, schedule and stakeholder mapping',
            'visibility' => 'public',
            'status' => 'published',
            'published_at' => now(),
        ]);
    }

    public function test_only_the_current_member_can_view_their_own_activity(): void
    {
        $member = $this->member();
        $other = $this->member();
        $mine = $this->post($member, 'My project');
        $this->post($other, 'Not my project');

        $this->get('/activity-log')->assertRedirect('/login');
        $this->actingAs($member)->get('/activity-log')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('account/ActivityLog')
                ->has('activity.items', 1)
                ->where('activity.items.0.id', 'post:'.$mine->id)
                ->where('activity.items.0.detail', 'My project')
                ->etc());
        $this->actingAs($other)->get('/activity-log?type=post')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('activity.items', 1)
                ->where('activity.items.0.detail', 'Not my project')
                ->etc());
    }

    public function test_filters_and_pagination_are_bounded_and_ordered(): void
    {
        $member = $this->member();
        for ($i = 1; $i <= 15; $i++) {
            $post = $this->post($member, 'Activity '.$i);
            $post->forceFill(['created_at' => now()->subMinutes($i), 'published_at' => now()->subMinutes($i)])->save();
        }
        $feed = app(MemberActivityFeed::class);
        $first = $feed->page($member->id, 'post');
        $this->assertCount(12, $first['items']);
        $this->assertNotNull($first['nextCursor']);
        $second = $feed->page($member->id, 'post', cursor: $first['nextCursor']);
        $this->assertCount(3, $second['items']);
        $this->assertNull($second['nextCursor']);
        $this->assertEmpty(array_intersect(array_column($first['items'], 'id'), array_column($second['items'], 'id')));
        $this->assertSame('Activity 1', $first['items'][0]['detail']);
        $oldest = $feed->page($member->id, 'post', sort: 'oldest');
        $this->assertSame('Activity 15', $oldest['items'][0]['detail']);
    }

    public function test_exam_and_post_activity_can_be_combined_with_text_details(): void
    {
        $member = $this->member();
        $this->post($member, 'Published update');

        $attemptId = DB::table('pmp_exam_attempts')->insertGetId([
            'user_id' => $member->id,
            'status' => 'completed',
            'mode' => 'focused',
            'question_ids' => json_encode([]),
            'total_questions' => 15,
            'correct_count' => 12,
            'started_at' => now()->subHour(),
            'expires_at' => now()->addHour(),
            'finished_at' => now()->subMinute(),
            'created_at' => now()->subHour(),
            'updated_at' => now(),
        ]);

        // The mixed feed must never return another member's exam attempts.
        $other = $this->member();
        DB::table('pmp_exam_attempts')->insert([
            'user_id' => $other->id,
            'status' => 'completed',
            'mode' => 'focused',
            'question_ids' => json_encode([]),
            'total_questions' => 10,
            'correct_count' => 9,
            'started_at' => now()->subHour(),
            'expires_at' => now()->addHour(),
            'finished_at' => now()->subMinute(),
            'created_at' => now()->subHour(),
            'updated_at' => now(),
        ]);

        $rows = app(MemberActivityFeed::class)->page($member->id)['items'];

        $this->assertCount(2, $rows);
        $this->assertContains('Published update', array_column($rows, 'detail'));
        $exam = collect($rows)->firstWhere('id', 'exam:'.$attemptId);
        $this->assertNotNull($exam);
        $this->assertSame('Focused PMP practice', $exam['detail']);
        $this->assertSame(80, $exam['score']);
        $this->assertSame('target', $exam['target']);
    }

    public function test_unknown_numeric_exam_mode_is_not_mislabelled_as_full_mock(): void
    {
        $member = $this->member();
        $attemptId = DB::table('pmp_exam_attempts')->insertGetId([
            'user_id' => $member->id,
            'status' => 'completed',
            'mode' => '1',
            'question_ids' => json_encode([]),
            'total_questions' => 10,
            'correct_count' => 8,
            'started_at' => now()->subHour(),
            'expires_at' => now()->addHour(),
            'finished_at' => now()->subMinute(),
            'created_at' => now()->subHour(),
            'updated_at' => now(),
        ]);

        $rows = app(MemberActivityFeed::class)->page($member->id, 'exam')['items'];

        $this->assertCount(1, $rows);
        $this->assertSame('exam:'.$attemptId, $rows[0]['id']);
        $this->assertSame('PMP exam attempt', $rows[0]['detail']);
    }

    public function test_clear_is_private_idempotent_and_does_not_delete_source_records(): void
    {
        $member = $this->member();
        $other = $this->member();
        $post = $this->post($member);
        $otherPost = $this->post($other);
        $this->actingAs($member)->deleteJson('/activity-log/history')->assertOk();
        $this->actingAs($member)->deleteJson('/activity-log/history')->assertOk();
        $this->assertDatabaseHas('posts', ['id' => $post->id]);
        $this->assertDatabaseHas('posts', ['id' => $otherPost->id]);
        $this->assertDatabaseCount('member_activity_visibility', 1);
        $this->assertSame([], app(MemberActivityFeed::class)->page($member->id)['items']);
        $this->assertCount(1, app(MemberActivityFeed::class)->page($other->id)['items']);
    }

    public function test_invalid_filters_and_cursor_are_rejected(): void
    {
        $member = $this->member();
        $this->actingAs($member)->get('/activity-log?type=arbitrary')->assertSessionHasErrors('type');
        $this->actingAs($member)->getJson('/activity-log/entries?cursor=malformed')->assertStatus(422);
    }
}
