<?php

namespace Tests\Feature\Community;

use App\Domain\AI\Jobs\CheckCommunityPost;
use App\Domain\AI\Services\PostContentCheckService;
use App\Domain\Community\Actions\PublishPost;
use App\Domain\Community\Queries\FeedQuery;
use App\Domain\Community\Queries\PostCheckFeed;
use App\Domain\Community\Services\PostCheckMedia;
use App\Domain\Community\Services\PostCheckPolicy;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class PostAiCheckerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        config()->set('community.engagement_stats_reads', false);
        config()->set('community.engagement_stats_writes', false);
        config()->set('pm-ai.enabled', true);
        config()->set('pm-ai.post_check_enabled', true);
        config()->set('pm-ai.post_check_provider', 'responses');
        config()->set('pm-ai.post_check_api_key', 'test-post-check-only');
        config()->set('pm-ai.global_daily_budget_usd', 20);
        config()->set('pm-ai.post_check_daily_budget_usd', 2);
        config()->set('pm-ai.allowed_models', ['gpt-5-nano']);
    }

    private function member(): User
    {
        return User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);
    }

    private function post(User $user): Post
    {
        return app(PublishPost::class)->execute($user, [
            'body' => 'Sharing a resource for project coordinators.',
            'topic' => 'From my project', 'visibility' => 'public',
        ]);
    }

    private function reply(bool $blocked): void
    {
        Http::fake(['https://api.openai.com/v1/responses' => Http::response([
            'output' => [['type' => 'message', 'content' => [[
                'type' => 'output_text', 'text' => json_encode([
                    'violates' => $blocked,
                    'needs_review' => false,
                    'category' => $blocked ? 'harassment' : 'none',
                    'target' => $blocked ? 'text' : 'none',
                    'reason' => $blocked ? 'Personal attack or harassment.' : '',
                ]),
            ]]]],
            'usage' => ['input_tokens' => 85, 'output_tokens' => 40],
        ])]);
    }

    private function check(Post $post): void
    {
        (new CheckCommunityPost($post->id, $post->check_version))->handle(
            app(PostContentCheckService::class),
            app(PostCheckMedia::class),
            app(PostCheckPolicy::class),
        );
    }

    public function test_disabled_checker_preserves_existing_post_publication(): void
    {
        config()->set('pm-ai.post_check_enabled', false);
        $post = $this->post($this->member());
        $this->assertSame('published', $post->status);
        $this->assertNotNull($post->published_at);
        $this->assertSame(0, DB::table('post_check_runs')->where('post_id', $post->id)->count());
        Queue::assertNotPushed(CheckCommunityPost::class);
    }

    public function test_a_new_post_is_private_until_the_ai_check_completes(): void
    {
        $author = $this->member();
        $other = $this->member();
        $post = $this->post($author);
        $this->assertSame('pending_check', $post->status);
        $this->assertNull($post->published_at);
        $this->assertSame([], app(FeedQuery::class)->page('all', 'All', null, $other)['data']);
        $this->assertSame($post->id, app(PostCheckFeed::class)->forMember($author->id)['posts'][0]['id']);
        $this->assertSame([], app(PostCheckFeed::class)->forMember($other->id)['posts']);
        Queue::assertPushed(CheckCommunityPost::class);

        $this->reply(false);
        $this->check($post);
        $post->refresh();
        $this->assertSame('published', $post->status);
        $this->assertNotNull($post->published_at);
        $this->assertSame('completed', DB::table('post_check_runs')->where('post_id', $post->id)->value('status'));
        Http::assertSentCount(1); // Dedicated GPT-5-nano Responses key; no Moderations API call.
        $this->assertCount(1, app(FeedQuery::class)->page('all', 'All', null, $other)['data']);
    }

    public function test_restricted_post_can_be_corrected_but_never_visible_until_rechecked(): void
    {
        $author = $this->member();
        $other = $this->member();
        $post = $this->post($author);
        $this->reply(true);
        $this->check($post);
        $post->refresh();
        $this->assertSame('restricted', $post->status);
        $this->assertSame(1, DB::table('post_check_violations')->where('user_id', $author->id)->count());
        $this->assertSame([], app(FeedQuery::class)->page('all', 'All', null, $other)['data']);
        $this->actingAs($other)->postJson('/posts/'.$post->id.'/repost', ['body' => 'safe version'])->assertNotFound();
        $this->actingAs($author)->postJson('/posts/'.$post->id.'/repost', ['body' => $post->body])->assertUnprocessable();
        $this->actingAs($author)->postJson('/posts/'.$post->id.'/repost', ['body' => 'A revised, respectful resource for coordinators.'])->assertAccepted();
        $post->refresh();
        $this->assertSame('pending_check', $post->status);
        $this->assertSame(2, $post->check_version);
        // An old delayed worker must never publish a superseded restricted revision.
        (new CheckCommunityPost($post->id, 1))->handle(
            app(PostContentCheckService::class), app(PostCheckMedia::class), app(PostCheckPolicy::class),
        );
        $this->assertSame('pending_check', $post->fresh()->status);
        $this->reply(false);
        $this->check($post);
        $this->assertSame('published', $post->fresh()->status);
    }

    public function test_provider_failure_never_publishes_the_post(): void
    {
        $post = $this->post($this->member());
        Http::fake(['https://api.openai.com/v1/responses' => Http::response(['error' => ['type' => 'upstream_error']], 503)]);
        $job = new CheckCommunityPost($post->id, $post->check_version);
        try {
            $job->handle(app(PostContentCheckService::class), app(PostCheckMedia::class), app(PostCheckPolicy::class));
            $this->fail('Provider failure must be propagated to the queue worker.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('POST_CHECK_PROVIDER_UNAVAILABLE', $exception->getMessage());
        }
        $job->failed(new \RuntimeException('Exhausted retries'));
        $this->assertSame('check_error', $post->fresh()->status);
        $this->assertNull($post->fresh()->published_at);
    }

    public function test_editing_a_published_post_returns_it_to_private_checking(): void
    {
        $author = $this->member();
        $other = $this->member();
        $post = $this->post($author);
        $this->reply(false);
        $this->check($post);
        $this->assertSame('published', $post->fresh()->status);

        $this->actingAs($author)->patchJson('/posts/'.$post->id, [
            'body' => 'A revised update that should be checked again.',
        ])->assertOk()->assertJsonPath('status', 'pending_check');
        $post->refresh();
        $this->assertSame('pending_check', $post->status);
        $this->assertSame(2, $post->check_version);
        $this->assertNull($post->published_at);
        $this->assertSame([], app(FeedQuery::class)->page('all', 'All', null, $other)['data']);
        $this->assertSame($post->id, app(PostCheckFeed::class)->forMember($author->id)['posts'][0]['id']);

        $this->reply(false);
        $this->check($post);
        $this->assertSame('published', $post->fresh()->status);
    }

    public function test_five_confirmed_violations_block_new_posting_and_comments(): void
    {
        $author = $this->member();
        for ($i = 0; $i < 5; $i++) {
            $post = $this->post($author);
            $this->reply(true);
            $this->check($post);
        }
        $this->assertNotNull(app(PostCheckPolicy::class)->restrictionUntil($author->id));
        $this->actingAs($author)->postJson('/posts', [
            'body' => 'New post', 'topic' => 'From my project',
        ])->assertUnprocessable();
    }
}
