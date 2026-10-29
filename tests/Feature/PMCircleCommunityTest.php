<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PMCircleCommunityTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_read_public_feed_but_cannot_publish(): void
    {
        $this->get('/community')->assertOk();
        $this->post('/posts', ['body' => 'A sample lesson learned', 'topic' => 'I learned'])->assertRedirect('/login');
    }

    public function test_repeated_likes_do_not_duplicate_reaction(): void
    {
        $author = User::factory()->create(['onboarding_step' => 3]);
        $post = Post::create(['author_id' => $author->id, 'body' => 'A legitimate sample community post.', 'topic' => 'I learned', 'published_at' => now()]);
        $user = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($user)->post("/posts/{$post->id}/reactions", ['type' => 'like'])->assertRedirect();
        $this->actingAs($user)->post("/posts/{$post->id}/reactions", ['type' => 'love'])->assertRedirect();
        $this->assertDatabaseCount('post_reactions', 1);
        $this->assertDatabaseHas('post_reactions', ['post_id' => $post->id, 'user_id' => $user->id, 'type' => 'love']);
    }

    public function test_comment_like_toggles_once_and_cannot_target_a_different_post(): void
    {
        $author = User::factory()->create(['onboarding_step' => 3]);
        $post = Post::create(['author_id' => $author->id, 'body' => 'A public example post.', 'published_at' => now()]);
        $another = Post::create(['author_id' => $author->id, 'body' => 'A different public post.', 'published_at' => now()]);
        $comment = $post->comments()->create(['author_id' => $author->id, 'body' => 'Useful insight']);
        $member = User::factory()->create(['onboarding_step' => 3]);

        $this->actingAs($member)->post("/posts/{$post->id}/comments/{$comment->id}/like")->assertRedirect();
        $this->assertDatabaseHas('comment_likes', ['comment_id' => $comment->id, 'user_id' => $member->id]);
        $this->actingAs($member)->post("/posts/{$post->id}/comments/{$comment->id}/like")->assertRedirect();
        $this->assertDatabaseMissing('comment_likes', ['comment_id' => $comment->id, 'user_id' => $member->id]);
        $this->actingAs($member)->post("/posts/{$another->id}/comments/{$comment->id}/like")->assertNotFound();
    }

    public function test_nested_reply_parent_must_belong_to_same_post(): void
    {
        $user = User::factory()->create(['onboarding_step' => 3]);
        $a = Post::create(['author_id' => $user->id, 'body' => 'Post A is a longer example.', 'published_at' => now()]);
        $b = Post::create(['author_id' => $user->id, 'body' => 'Post B is a longer example.', 'published_at' => now()]);
        $comment = $a->comments()->create(['author_id' => $user->id, 'body' => 'A root comment']);
        $this->actingAs($user)->post("/posts/{$b->id}/comments", ['body' => 'Not allowed', 'parent_id' => $comment->id])->assertSessionHasErrors('parent_id');
    }
}
