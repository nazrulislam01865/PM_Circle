<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CommunityInlineCommentsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_comment_preview_is_bounded_and_replies_are_eager_loaded(): void
    {
        $author = User::factory()->create(['onboarding_step' => 3]);
        $post = Post::create([
            'author_id' => $author->id, 'body' => 'A community discussion for testing.',
            'status' => 'published', 'visibility' => 'public', 'published_at' => now(),
        ]);
        foreach (range(1, 8) as $n) {
            $root = $post->comments()->create(['body' => 'Example comment '.$n, 'author_id' => $author->id]);
            foreach (range(1, 3) as $index) {
                $post->comments()->create(['body' => 'Reply '.$index, 'author_id' => $author->id, 'parent_id' => $root->id]);
            }
        }

        DB::connection()->enableQueryLog();
        DB::connection()->flushQueryLog();
        $response = $this->getJson(route('posts.comments.preview', $post));
        $queries = count(DB::connection()->getQueryLog());
        DB::connection()->disableQueryLog();

        $response->assertOk()->assertJsonCount(5, 'data')->assertJsonPath('has_more', true)
            ->assertJsonPath('data.0.author.name', $author->name);
        $this->assertLessThanOrEqual(12, $queries, 'Preview should load comments without per-comment queries.');
        foreach ($response->json('data') as $comment) {
            $this->assertLessThanOrEqual(2, count($comment['replies']));
        }
    }

    public function test_inline_comment_and_reply_return_persisted_json_without_full_page_redirect(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $post = Post::create(['author_id' => $member->id, 'body' => 'A published public discussion.',
            'status' => 'published', 'visibility' => 'public', 'published_at' => now()]);

        $root = $this->actingAs($member)->postJson(route('posts.comments', $post), ['body' => 'A constructive response.'])
            ->assertCreated()->assertJsonPath('comment.author.name', $member->name)->json('comment.id');
        $reply = $this->actingAs($member)->postJson(route('posts.comments', $post), [
            'body' => 'Following up on that point.', 'parent_id' => $root,
        ])->assertCreated()->json('comment.id');
        $this->assertDatabaseHas('comments', ['id' => $root, 'post_id' => $post->id, 'parent_id' => null]);
        $this->assertDatabaseHas('comments', ['id' => $reply, 'post_id' => $post->id, 'parent_id' => $root]);
        $this->actingAs($member)->postJson(route('comments.like', [$post, $root]))
            ->assertOk()->assertJsonPath('liked', true)->assertJsonPath('count', 1);
        $this->actingAs($member)->postJson(route('comments.like', [$post, $root]))
            ->assertOk()->assertJsonPath('liked', false)->assertJsonPath('count', 0);
    }

    public function test_comment_preview_and_new_comment_use_the_uploaded_avatar_without_per_comment_queries(): void
    {
        $author = User::factory()->create(['onboarding_step' => 3]);
        $author->profile()->create([
            'avatar_path' => '/storage/profile-avatars/saved-photo.jpg',
            'visibility' => 'public',
        ]);
        $post = Post::create([
            'author_id' => $author->id, 'body' => 'A published community post.',
            'status' => 'published', 'visibility' => 'public', 'published_at' => now(),
        ]);
        $post->comments()->create(['body' => 'One existing comment.', 'author_id' => $author->id]);

        $this->getJson(route('posts.comments.preview', $post))
            ->assertOk()->assertJsonPath('data.0.author.avatar_path', '/profile-media/avatar/saved-photo.jpg');
        $this->actingAs($author)->postJson(route('posts.comments', $post), ['body' => 'My new comment.'])
            ->assertCreated()->assertJsonPath('comment.author.avatar_path', '/profile-media/avatar/saved-photo.jpg');
    }

    public function test_private_comment_author_photo_is_not_shared_with_guests(): void
    {
        $author = User::factory()->create(['onboarding_step' => 3]);
        $author->profile()->create([
            'avatar_path' => '/storage/profile-avatars/private-photo.jpg',
            'visibility' => 'private',
        ]);
        $post = Post::create([
            'author_id' => $author->id, 'body' => 'A published community post.',
            'status' => 'published', 'visibility' => 'public', 'published_at' => now(),
        ]);
        $post->comments()->create(['body' => 'This comment is public.', 'author_id' => $author->id]);

        $this->getJson(route('posts.comments.preview', $post))
            ->assertOk()->assertJsonPath('data.0.author.avatar_path', null);
        $this->actingAs($author)->getJson(route('posts.comments.preview', $post))
            ->assertOk()->assertJsonPath('data.0.author.avatar_path', '/profile-media/avatar/private-photo.jpg');
    }

    public function test_unpublished_posts_do_not_expose_comments_and_guests_cannot_post(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $post = Post::create(['author_id' => $member->id, 'body' => 'Private post data.',
            'status' => 'draft', 'visibility' => 'public', 'published_at' => now()]);
        $this->getJson(route('posts.comments.preview', $post))->assertNotFound();
        $this->postJson(route('posts.comments', $post), ['body' => 'Guest should not post.'])->assertUnauthorized();
    }
}
