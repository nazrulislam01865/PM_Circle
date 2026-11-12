<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommunityCommentReactionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_comment_reactions_share_post_palette_and_preserve_single_reaction_per_member(): void
    {
        $author = User::factory()->create(['onboarding_step' => 3]);
        $post = Post::create([
            'author_id' => $author->id,
            'body' => 'Test post.',
            'status' => 'published',
            'visibility' => 'public',
            'published_at' => now(),
        ]);
        $comment = $post->comments()->create(['author_id' => $author->id, 'body' => 'Test comment.']);

        $this->actingAs($author)
            ->postJson(route('comments.reactions', [$post, $comment]), ['type' => 'like'])
            ->assertOk()->assertJsonPath('reaction', 'like')->assertJsonPath('count', 1);
        $this->actingAs($author)
            ->postJson(route('comments.reactions', [$post, $comment]), ['type' => 'love'])
            ->assertOk()->assertJsonPath('reaction', 'love')->assertJsonPath('count', 1);

        $this->assertDatabaseHas('comment_likes', [
            'user_id' => $author->id, 'comment_id' => $comment->id, 'type' => 'love',
        ]);
        $this->actingAs($author)->getJson(route('posts.comments.preview', $post))
            ->assertOk()->assertJsonPath('data.0.viewer_reaction', 'love');

        $this->actingAs($author)
            ->deleteJson(route('comments.reactions.remove', [$post, $comment]))
            ->assertOk()->assertJsonPath('reaction', null)->assertJsonPath('count', 0);
    }

    public function test_invalid_comment_reaction_and_comments_from_other_posts_are_rejected(): void
    {
        $author = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $post = Post::create([
            'author_id' => $author->id, 'body' => 'A published post.',
            'status' => 'published', 'visibility' => 'public', 'published_at' => now(),
        ]);
        $otherPost = Post::create([
            'author_id' => $other->id, 'body' => 'Another post.',
            'status' => 'published', 'visibility' => 'public', 'published_at' => now(),
        ]);
        $comment = $otherPost->comments()->create(['author_id' => $other->id, 'body' => 'A response.']);

        $this->actingAs($author)
            ->postJson(route('comments.reactions', [$otherPost, $comment]), ['type' => 'invalid'])
            ->assertUnprocessable();
        $this->actingAs($author)
            ->postJson(route('comments.reactions', [$post, $comment]), ['type' => 'love'])
            ->assertNotFound();
    }
}
