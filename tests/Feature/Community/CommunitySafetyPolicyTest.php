<?php

namespace Tests\Feature\Community;

use App\Domain\AI\Jobs\CheckCommunityComment;
use App\Domain\AI\Jobs\CheckCommunityPost;
use App\Domain\AI\Services\CommunitySafetySignals;
use App\Domain\AI\Services\PostContentCheckService;
use App\Domain\Community\Actions\PublishPost;
use App\Domain\Community\Services\PostCheckPolicy;
use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class CommunitySafetyPolicyTest extends TestCase
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
        config()->set('pm-ai.post_check_external_moderation', false);
        config()->set('pm-ai.post_check_provider', 'responses');
        config()->set('pm-ai.post_check_api_key', 'post-check-test-key');
        config()->set('pm-ai.post_check_daily_budget_usd', 5);
        config()->set('pm-ai.allowed_models', ['gpt-5-nano']);
    }

    private function member(): User
    {
        return User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);
    }

    private function approvedPost(User $author): Post
    {
        // Existing published posts remain public without retroactive moderation.
        return $author->posts()->create([
            'body' => 'What should our team do about the delivery delay?',
            'topic' => 'Questions', 'status' => 'published',
            'visibility' => 'public', 'published_at' => now(),
        ]);
    }

    private function fakeResult(bool $violation, bool $uncertain = false, string $target = 'text'): void
    {
        Http::fake(['https://api.openai.com/v1/responses' => Http::response([
            'status' => 'completed',
            'output' => [['type' => 'message', 'content' => [[
                'type' => 'output_text', 'text' => json_encode([
                    'violates' => $violation,
                    'needs_review' => $uncertain,
                    'category' => ($violation || $uncertain) ? 'harassment' : 'none',
                    'target' => ($violation || $uncertain) ? $target : 'none',
                    'reason' => ($violation || $uncertain) ? 'Targeted harassment.' : '',
                ]),
            ]]]],
            'usage' => ['input_tokens' => 90, 'output_tokens' => 30],
        ])]);
    }

    public function test_lone_link_and_phone_number_are_only_review_signals_not_strikes(): void
    {
        $signals = app(CommunitySafetySignals::class)->forText('Find information at https://example.com; call +8801700000000.', 0);
        $this->assertSame(1, $signals['link_count']);
        $this->assertTrue($signals['contains_contact_number']);
        $this->assertFalse($signals['mentions_otp_or_credentials']);
        $this->fakeResult(false);
        $result = app(PostContentCheckService::class)->inspect('Find information at https://example.com.', null, null, [
            'signals' => $signals,
        ]);
        $this->assertFalse($result['violates']);
        $this->assertFalse($result['needs_review']);
        Http::assertSentCount(1);
    }

    public function test_banglish_disguised_insult_is_a_signal_not_automatic_guilt(): void
    {
        $signals = app(CommunitySafetySignals::class)->forText('He quoted h.a.r.a.m.i in a training slide.', 0);
        $this->assertTrue($signals['possible_disguised_insult']);
        $this->fakeResult(false);
        $this->assertFalse(app(PostContentCheckService::class)->inspect(
            'He quoted h.a.r.a.m.i in a training slide.', null, null,
            ['signals' => $signals],
        )['violates']);
    }

    public function test_comment_is_private_until_ai_approves_it(): void
    {
        $author = $this->member();
        $other = $this->member();
        $post = $this->approvedPost($author);
        $response = $this->actingAs($author)->postJson('/posts/'.$post->id.'/comments', [
            'body' => 'I would assess the critical path and update the risk register.',
        ])->assertAccepted()->assertJsonPath('check_status', 'pending_check');
        $commentId = $response->json('comment.id');
        $comment = Comment::findOrFail($commentId);
        Queue::assertPushed(CheckCommunityComment::class);
        $this->assertNull($comment->media_url);
        $this->assertSame(0, $post->comments()->visible()->count());
        $this->actingAs($other)->getJson('/posts/'.$post->id.'/comments/'.$commentId.'/check-status')->assertNotFound();
        $this->fakeResult(false);
        (new CheckCommunityComment($commentId))->handle(app(PostContentCheckService::class), app(PostCheckPolicy::class));
        $this->assertSame('approved', $comment->fresh()->check_status);
        $this->assertSame(1, $post->comments()->visible()->count());
        $this->actingAs($author)->getJson('/posts/'.$post->id.'/comments/'.$commentId.'/check-status')
            ->assertOk()->assertJsonPath('status', 'approved');
    }

    public function test_reply_classifier_sees_parent_context_but_does_not_block_parent_words(): void
    {
        $author = $this->member();
        $post = $this->approvedPost($author);
        $parent = $post->comments()->create(['author_id' => $author->id, 'body' => 'This dispute includes a quoted threat.']);
        $reply = $this->actingAs($author)->postJson('/posts/'.$post->id.'/comments', [
            'body' => 'Please report the threatening message and de-escalate.',
            'parent_id' => $parent->id,
        ])->assertAccepted();
        $this->fakeResult(false);
        (new CheckCommunityComment($reply->json('comment.id')))->handle(
            app(PostContentCheckService::class), app(PostCheckPolicy::class),
        );
        Http::assertSent(function ($request): bool {
            $input = $request->data()['input'][0]['content'][0]['text'] ?? '';
            return str_contains($input, 'This dispute includes a quoted threat.')
                && str_contains($input, 'Please report the threatening message');
        });
    }

    public function test_restricted_comment_never_enters_public_reply_lists(): void
    {
        $author = $this->member();
        $post = $this->approvedPost($author);
        $response = $this->actingAs($author)->postJson('/posts/'.$post->id.'/comments', [
            'body' => 'A targeted insulting remark for this test.',
        ])->assertAccepted();
        $this->fakeResult(true);
        (new CheckCommunityComment($response->json('comment.id')))->handle(
            app(PostContentCheckService::class), app(PostCheckPolicy::class),
        );
        $this->assertSame('restricted', Comment::findOrFail($response->json('comment.id'))->check_status);
        $this->assertSame(0, $post->comments()->visible()->count());
        $this->assertSame(1, DB::table('comment_check_violations')->where('user_id', $author->id)->count());
        $this->actingAs($author)->getJson('/posts/'.$post->id.'/comments/'.$response->json('comment.id').'/check-status')
            ->assertOk()->assertJsonPath('status', 'restricted');
    }

    public function test_uncertain_post_requires_human_review_without_recording_strike(): void
    {
        $author = $this->member();
        $post = app(PublishPost::class)->execute($author, [
            'body' => 'A difficult discussion about project conflicts.', 'topic' => 'From my project',
        ]);
        $this->fakeResult(false, true);
        (new CheckCommunityPost($post->id, 1))->handle(
            app(PostContentCheckService::class), app(\App\Domain\Community\Services\PostCheckMedia::class),
            app(PostCheckPolicy::class),
        );
        $this->assertSame('pending_review', $post->fresh()->status);
        $this->assertSame(0, DB::table('post_check_violations')->count());
        Http::assertSentCount(2); // Ambiguous content received a second GPT-5-nano opinion.
    }

    public function test_optional_multimodal_moderation_is_fail_closed_if_key_lacks_permission(): void
    {
        config()->set('pm-ai.post_check_external_moderation', true);
        Http::fake(['https://api.openai.com/v1/moderations' => Http::response([
            'error' => ['type' => 'permission_denied'],
        ], 403)]);
        $this->expectExceptionMessage('POST_CHECK_MODERATION_DENIED');
        app(PostContentCheckService::class)->inspect('A test post.', null, null);
    }

    public function test_upstream_failure_keeps_a_comment_invisible(): void
    {
        $author = $this->member();
        $post = $this->approvedPost($author);
        $response = $this->actingAs($author)->postJson('/posts/'.$post->id.'/comments', [
            'body' => 'The comment must not appear if AI is unavailable.',
        ])->assertAccepted();
        Http::fake(['https://api.openai.com/v1/responses' => Http::response(['error' => 'unavailable'], 503)]);
        $job = new CheckCommunityComment($response->json('comment.id'));
        try {
            $job->handle(app(PostContentCheckService::class), app(PostCheckPolicy::class));
            $this->fail('A provider failure must not publish the comment.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('POST_CHECK_PROVIDER_UNAVAILABLE', $exception->getMessage());
        }
        $job->failed(new \RuntimeException('Retries exhausted'));
        $this->assertSame('check_error', Comment::find($response->json('comment.id'))->check_status);
        $this->assertSame(0, $post->comments()->visible()->count());
    }
}
