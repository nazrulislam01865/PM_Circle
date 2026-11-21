<?php

namespace Tests\Feature\Community;

use App\Domain\Community\Queries\PostCheckFeed;
use App\Domain\Community\Services\PostCheckPolicy;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class PostingRestrictionPolicyTest extends TestCase
{
    use RefreshDatabase;

    private function member(): User
    {
        return User::factory()->create([
            'onboarding_step' => 3, 'status' => 'active', 'email_verified_at' => now(),
        ]);
    }

    private function post(User $member): Post
    {
        return $member->posts()->create([
            'body' => 'A test discussion for the moderation policy.',
            'topic' => 'From my project', 'status' => 'published',
            'visibility' => 'public', 'published_at' => now(),
        ]);
    }

    private function strike(User $member, string $type = 'post'): void
    {
        $post = $this->post($member);
        if ($type === 'comment') {
            $comment = $post->comments()->create([
                'author_id' => $member->id, 'body' => 'A flagged comment',
                'check_status' => 'restricted',
            ]);
            app(PostCheckPolicy::class)->recordCommentViolation($comment->id, $member->id, 'harassment');
        } else {
            app(PostCheckPolicy::class)->recordViolation($post->id, 1, $member->id, 'harassment');
        }
    }

    public function test_fifth_combined_violation_blocks_posts_comments_replies_and_scenario_responses(): void
    {
        $member = $this->member();
        $policy = app(PostCheckPolicy::class);
        for ($i = 0; $i < 4; $i++) {
            $this->strike($member, $i % 2 ? 'comment' : 'post');
        }
        $this->assertNull($policy->restrictionUntil($member->id));
        $this->strike($member, 'comment');
        $until = $policy->restrictionUntil($member->id);
        $this->assertNotNull($until);
        $this->assertTrue(\Illuminate\Support\Carbon::parse($until)->between(
            now()->addDays(9), now()->addDays(10)->addMinute(),
        ));

        $post = $this->post($member);
        $this->actingAs($member)->postJson('/posts', [
            'body' => 'A new update', 'topic' => 'From my project',
        ])->assertUnprocessable();
        $this->actingAs($member)->postJson("/posts/{$post->id}/comments", [
            'body' => 'A response',
        ])->assertUnprocessable();
        $parent = $post->comments()->create(['author_id' => $member->id, 'body' => 'Earlier approved comment']);
        $this->actingAs($member)->postJson("/posts/{$post->id}/comments", [
            'body' => 'A reply', 'parent_id' => $parent->id,
        ])->assertUnprocessable();

        $scenario = \App\Models\Scenario::create([
            'slug' => 'posting-restriction-test', 'title' => 'Scenario', 'summary' => 'Scenario summary',
            'situation' => 'A team issue', 'known_facts' => [], 'topics' => [],
            'focus' => 'Communication', 'status' => 'published', 'published_at' => now(),
        ]);
        $this->actingAs($member)->postJson("/scenarios/{$scenario->id}/responses", [
            'body' => 'A challenge response',
        ])->assertUnprocessable();
        $this->assertSame(0, $scenario->responses()->count());
        $this->assertSame(5, app(PostCheckFeed::class)->forMember($member->id)['violation_count']);
    }

    public function test_retrying_a_violation_and_additional_strikes_do_not_extend_a_live_restriction(): void
    {
        $member = $this->member();
        for ($i = 0; $i < 5; $i++) {
            $this->strike($member);
        }
        $until = DB::table('post_check_restrictions')->where('user_id', $member->id)->value('blocked_until');
        $postId = DB::table('post_check_violations')->where('user_id', $member->id)->value('post_id');
        app(PostCheckPolicy::class)->recordViolation($postId, 1, $member->id, 'harassment');
        $this->strike($member);
        $this->assertSame($until, DB::table('post_check_restrictions')->where('user_id', $member->id)->value('blocked_until'));
        $this->assertSame(6, DB::table('post_check_violations')->where('user_id', $member->id)->count());
    }

    public function test_restriction_expires_and_requires_five_new_confirmed_strikes_for_another_block(): void
    {
        $member = $this->member();
        for ($i = 0; $i < 5; $i++) {
            $this->strike($member);
        }
        $this->travel(11)->days();
        $this->assertNull(app(PostCheckPolicy::class)->restrictionUntil($member->id));
        for ($i = 0; $i < 4; $i++) {
            $this->strike($member);
        }
        $this->assertNull(app(PostCheckPolicy::class)->restrictionUntil($member->id));
        $this->strike($member);
        $this->assertNotNull(app(PostCheckPolicy::class)->restrictionUntil($member->id));
    }

    public function test_strikes_outside_the_rolling_window_do_not_count(): void
    {
        $member = $this->member();
        for ($i = 0; $i < 4; $i++) {
            $this->strike($member);
        }
        $this->travel(31)->days();
        $this->strike($member);
        $this->assertNull(app(PostCheckPolicy::class)->restrictionUntil($member->id));
    }

    public function test_human_approval_of_ambiguous_content_does_not_count_as_a_violation(): void
    {
        $author = $this->member();
        $admin = User::factory()->create([
            'is_admin' => true, 'status' => 'active', 'onboarding_step' => 3,
            'email_verified_at' => now(),
        ]);
        $post = $this->post($author);
        $post->forceFill([
            'status' => 'pending_review', 'check_version' => 1,
            'check_category' => 'harassment',
        ])->save();
        $this->actingAs($admin)->post("/admin/post-reviews/{$post->id}", [
            'decision' => 'approve',
        ])->assertRedirect();
        $this->assertSame(0, DB::table('post_check_violations')->where('user_id', $author->id)->count());

        $comment = $post->comments()->create([
            'author_id' => $author->id, 'body' => 'Ambiguous, ultimately permitted comment',
            'check_status' => 'pending_review',
        ]);
        $this->actingAs($admin)->post("/admin/comment-reviews/{$comment->id}", [
            'decision' => 'approve',
        ])->assertRedirect();
        $this->assertSame(0, DB::table('comment_check_violations')->where('user_id', $author->id)->count());
    }

    public function test_admin_confirmed_rejection_records_one_strike_(): void
    {
        $author = $this->member();
        $admin = User::factory()->create([
            'is_admin' => true, 'status' => 'active', 'onboarding_step' => 3,
            'email_verified_at' => now(),
        ]);
        $post = $this->post($author);
        $post->forceFill(['status' => 'pending_review', 'check_version' => 1,
            'check_category' => 'harassment'])->save();
        $this->actingAs($admin)->post("/admin/post-reviews/{$post->id}", [
            'decision' => 'reject',
        ])->assertRedirect();
        $this->assertSame(1, DB::table('post_check_violations')->where('user_id', $author->id)->count());
        $comment = $post->comments()->create([
            'author_id' => $author->id, 'body' => 'A comment needing review',
            'check_status' => 'pending_review',
        ]);
        $this->actingAs($admin)->post("/admin/comment-reviews/{$comment->id}", [
            'decision' => 'reject',
        ])->assertRedirect();
        $this->assertSame(1, DB::table('comment_check_violations')->where('user_id', $author->id)->count());
    }
}
