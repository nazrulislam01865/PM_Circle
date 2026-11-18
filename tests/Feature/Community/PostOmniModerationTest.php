<?php

namespace Tests\Feature\Community;

use App\Domain\AI\Jobs\CheckCommunityPost;
use App\Domain\AI\Services\PostContentCheckService;
use App\Domain\Community\Actions\PublishPost;
use App\Domain\Community\Services\PostCheckMedia;
use App\Domain\Community\Services\PostCheckPolicy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class PostOmniModerationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        Http::preventStrayRequests();
        config()->set('community.engagement_stats_reads', false);
        config()->set('community.engagement_stats_writes', false);
        config()->set('pm-ai.enabled', true);
        config()->set('pm-ai.post_check_enabled', true);
        config()->set('pm-ai.post_check_provider', 'omni');
        config()->set('pm-ai.post_check_api_key', 'dedicated-omni-key');
        config()->set('pm-ai.post_check_daily_budget_usd', 0);
        config()->set('pm-ai.allowed_models', []);
    }

    /** @param list<string> $categories */
    private function response(array $categories = [], string $modality = 'text'): void
    {
        $names = [
            'harassment', 'harassment/threatening', 'hate', 'hate/threatening',
            'sexual', 'sexual/minors', 'violence', 'violence/graphic',
            'illicit', 'self-harm',
        ];
        $flags = array_fill_keys($names, false);
        foreach ($categories as $category) {
            $flags[$category] = true;
        }
        $types = [];
        foreach ($categories as $category) {
            $types[$category] = [$modality];
        }
        Http::fake(['https://api.openai.com/v1/moderations' => Http::response([
            'model' => 'omni-moderation-latest',
            'results' => [[
                'flagged' => $categories !== [],
                'categories' => $flags,
                'category_applied_input_types' => $types,
            ]],
        ])]);
    }

    private function post(): \App\Models\Post
    {
        $member = User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);
        return app(PublishPost::class)->execute($member, [
            'body' => 'Sharing our weekly project update.',
            'topic' => 'From my project', 'visibility' => 'public',
        ]);
    }

    private function process(\App\Models\Post $post): void
    {
        (new CheckCommunityPost($post->id, $post->check_version))->handle(
            app(PostContentCheckService::class),
            app(PostCheckMedia::class),
            app(PostCheckPolicy::class),
        );
    }

    public function test_unflagged_post_uses_only_dedicated_moderation_key_and_becomes_public(): void
    {
        $this->response();
        $post = $this->post();
        $this->assertSame('pending_check', $post->status);
        $this->assertSame('omni-moderation-latest', DB::table('post_check_runs')
            ->where('post_id', $post->id)->value('model'));
        $this->process($post);
        $this->assertSame('published', $post->fresh()->status);
        $this->assertEquals(0, (float) DB::table('post_check_runs')
            ->where('post_id', $post->id)->value('cost_usd'));
        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => $request->url() === 'https://api.openai.com/v1/moderations'
            && $request->hasHeader('Authorization', 'Bearer dedicated-omni-key')
            && $request->data()['model'] === 'omni-moderation-latest');
    }

    public function test_flagged_post_is_restricted_without_publication(): void
    {
        $this->response(['harassment']);
        $post = $this->post();
        $this->process($post);
        $this->assertSame('restricted', $post->fresh()->status);
        $this->assertNull($post->fresh()->published_at);
        $this->assertSame(1, DB::table('post_check_violations')
            ->where('post_id', $post->id)->count());
    }

    public function test_unsupported_omni_category_goes_to_review_not_strike(): void
    {
        $this->response(['self-harm']);
        $post = $this->post();
        $this->process($post);
        $this->assertSame('pending_review', $post->fresh()->status);
        $this->assertSame(0, DB::table('post_check_violations')->count());
    }

    public function test_multimodal_request_attributes_image_signal(): void
    {
        $this->response(['violence/graphic'], 'image');
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB2cAAAAASUVORK5CYII=', true);
        $result = app(PostContentCheckService::class)->inspect('Illustration', $png, 'image/png');
        $this->assertTrue($result['violates']);
        $this->assertSame('image', $result['target']);
        $this->assertSame('violence', $result['category']);
        Http::assertSent(fn ($request) => str_starts_with(
            (string) data_get($request->data(), 'input.1.image_url.url'), 'data:image/png;base64,'
        ));
    }

    public function test_flagged_reply_with_parent_context_requires_review_not_automatic_strike(): void
    {
        $this->response(['harassment']);
        $result = app(PostContentCheckService::class)->inspect('A quote about conflict', null, null, [
            'post_excerpt' => 'An approved post with controversial discussion.',
        ]);
        $this->assertFalse($result['violates']);
        $this->assertTrue($result['needs_review']);
        $this->assertSame('harassment', $result['category']);
    }

    public function test_comment_uses_same_moderation_provider_without_responses_api(): void
    {
        $this->response();
        $post = $this->post();
        $this->process($post);
        $author = User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);
        $reply = $this->actingAs($author)->postJson('/posts/'.$post->id.'/comments', [
            'body' => 'Thanks for sharing these milestones.',
        ])->assertAccepted();
        $commentId = $reply->json('comment.id');
        $this->assertSame('omni-moderation-latest', DB::table('comment_check_runs')
            ->where('comment_id', $commentId)->value('model'));
        $this->response();
        (new \App\Domain\AI\Jobs\CheckCommunityComment($commentId))->handle(
            app(PostContentCheckService::class), app(PostCheckPolicy::class)
        );
        $this->assertSame('approved', \App\Models\Comment::findOrFail($commentId)->check_status);
    }

    public function test_invalid_permission_cannot_publish_post(): void
    {
        Http::fake(['https://api.openai.com/v1/moderations' => Http::response([
            'error' => ['type' => 'permission_denied'],
        ], 403)]);
        $post = $this->post();
        $job = new CheckCommunityPost($post->id, $post->check_version);
        try {
            $this->process($post);
            $this->fail('A denied key must never publish.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('POST_CHECK_KEY_DENIED', $exception->getMessage());
        }
        $job->failed(new \RuntimeException('Retries exhausted'));
        $this->assertSame('check_error', $post->fresh()->status);
    }

    public function test_malformed_provider_response_is_rejected(): void
    {
        Http::fake(['https://api.openai.com/v1/moderations' => Http::response([
            'results' => [['flagged' => false]],
        ])]);
        $this->expectExceptionMessage('POST_CHECK_INVALID_RESULT');
        app(PostContentCheckService::class)->inspect('Valid, ordinary post', null, null);
    }
}
