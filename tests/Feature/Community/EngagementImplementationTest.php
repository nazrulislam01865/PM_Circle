<?php

namespace Tests\Feature\Community;

use App\Domain\Community\Actions\ReactToComment;
use App\Domain\Community\Actions\ReactToPost;
use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class EngagementImplementationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['community.engagement_write_gate' => false, 'community.engagement_stats_writes' => true,
            'community.engagement_stats_reads' => true, 'community.engagement_type_reads' => true,
            'community.engagement_comment_reads' => true, 'pm-ai.post_check_enabled' => false]);
    }

    private function fixture(): array
    {
        $owner = User::factory()->create(['onboarding_step' => 3]);
        $member = User::factory()->create(['onboarding_step' => 3]);
        $post = Post::create(['author_id' => $owner->id, 'body' => 'Engagement fixture',
            'status' => 'published', 'visibility' => 'public', 'published_at' => now()]);
        return [$owner, $member, $post];
    }

    public function test_root_visibility_and_account_deletion_preserve_projection_parity(): void
    {
        [$owner, $member, $post] = $this->fixture();
        $root = $post->comments()->create(['author_id' => $member->id, 'body' => 'Root']);
        $reply = $post->comments()->create(['author_id' => $owner->id, 'parent_id' => $root->id, 'body' => 'Reply', 'check_status' => 'pending_check']);
        $count = fn () => (int) DB::table('post_engagement_stats')->where('post_id', $post->id)->value('comments_count');
        $replies = fn () => (int) DB::table('comment_engagement_stats')->where('comment_id', $root->id)->value('replies_count');
        $this->assertSame(1, $count());
        $root->update(['check_status' => 'restricted']);
        $reply->update(['check_status' => 'approved']);
        $this->assertSame(0, $count());
        $this->assertSame(0, $replies());
        $root->update(['check_status' => 'approved']);
        $this->assertSame(2, $count());
        $this->assertSame(1, $replies());
        $root->delete();
        $this->assertSame(0, $count());
        $root->restore();
        $this->assertSame(2, $count());
        $this->artisan('community:backfill-engagement-stats', ['--verify' => true])->assertExitCode(0);
        $member->delete();
        $this->assertSame(0, $count());
        $this->assertFalse(Comment::withTrashed()->whereKey($reply->id)->exists());
        $this->artisan('community:backfill-engagement-stats', ['--verify' => true])->assertExitCode(0);
    }

    public function test_desired_state_reactions_and_versions(): void
    {
        [$owner, $member, $post] = $this->fixture();
        $action = app(ReactToPost::class);
        $first = $action->execute($member, $post, 'like', true);
        $same = $action->execute($member, $post, 'like', true);
        $this->assertSame($first, $same);
        $changed = $action->execute($member, $post, 'love', true);
        $this->assertSame(1, $changed['count']);
        $this->assertGreaterThan($same['version'], $changed['version']);
        $this->assertSame(0, $action->execute($member, $post, null, true)['count']);
        $comment = $post->comments()->create(['author_id' => $owner->id, 'body' => 'React here']);
        $react = app(ReactToComment::class);
        $first = $react->execute($member, $comment, 'like');
        $this->assertSame(1, $first['count']);
        $this->assertSame($first, $react->execute($member, $comment, 'like'));
        $this->assertSame(0, $react->execute($member, $comment, null)['count']);
        $this->artisan('community:backfill-engagement-stats', ['--verify' => true])->assertExitCode(0);
    }

    public function test_comment_submission_replay_conflict_and_deleted_state(): void
    {
        [, $member, $post] = $this->fixture();
        $url = '/posts/'.$post->id.'/comments';
        $payload = ['body' => 'Retry-safe comment', 'submission_key' => (string) Str::uuid()];
        $id = $this->actingAs($member)->postJson($url, $payload)->assertCreated()->json('comment.id');
        $this->postJson($url, $payload)->assertOk()->assertJsonPath('comment.id', $id);
        $this->postJson($url, [...$payload, 'body' => 'Changed payload'])->assertStatus(409);
        $this->assertSame(1, $post->comments()->count());
        Comment::findOrFail($id)->delete();
        $this->postJson($url, $payload)->assertStatus(410);
        $this->artisan('community:backfill-engagement-stats', ['--verify' => true])->assertExitCode(0);
    }
}
