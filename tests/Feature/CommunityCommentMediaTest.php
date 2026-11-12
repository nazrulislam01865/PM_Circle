<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CommunityCommentMediaTest extends TestCase
{
    use RefreshDatabase;

    private function createPost(User $user, string $visibility = 'public'): Post
    {
        return Post::create([
            'author_id' => $user->id,
            'body' => 'A published community discussion.',
            'status' => 'published',
            'visibility' => $visibility,
            'published_at' => now(),
        ]);
    }

    private function gif(): UploadedFile
    {
        // A genuine one-pixel GIF; file content is checked, not just the extension.
        return UploadedFile::fake()->createWithContent(
            'reaction.gif',
            base64_decode('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==')
        );
    }

    public function test_member_can_attach_gif_to_comment_and_reply_without_exposing_storage_path(): void
    {
        Storage::fake('local');
        $member = User::factory()->create(['onboarding_step' => 3]);
        $post = $this->createPost($member);

        $id = $this->actingAs($member)->withHeaders(['Accept' => 'application/json'])
            ->post(route('posts.comments', $post), ['media' => $this->gif()])
            ->assertCreated()->assertJsonPath('comment.body', '')
            ->json('comment.id');

        $comment = $post->comments()->findOrFail($id);
        $this->assertNotNull($comment->media_path);
        Storage::disk('local')->assertExists($comment->media_path);
        $this->assertStringContainsString("/posts/{$post->id}/comments/{$id}/media/", $comment->media_url);
        $this->actingAs($member)->getJson(route('posts.comments.preview', $post))
            ->assertOk()->assertJsonPath('data.0.media_url', $comment->media_url);
        $this->get($comment->media_url)->assertOk()->assertHeader('Content-Type', 'image/gif');

        $replyId = $this->actingAs($member)->postJson(route('posts.comments', $post), [
            'body' => 'A reply in the same thread.', 'parent_id' => $comment->id,
        ])->assertCreated()->json('comment.id');
        $this->assertDatabaseHas('comments', ['id' => $replyId, 'parent_id' => $comment->id]);
    }

    public function test_members_only_attachment_cannot_be_downloaded_by_guests_or_other_post_paths(): void
    {
        Storage::fake('local');
        $member = User::factory()->create(['onboarding_step' => 3]);
        $post = $this->createPost($member, 'members');
        $other = $this->createPost($member);
        $id = $this->actingAs($member)->withHeaders(['Accept' => 'application/json'])
            ->post(route('posts.comments', $post), ['body' => 'A private attachment', 'media' => $this->gif()])
            ->assertCreated()->json('comment.id');
        $comment = $post->comments()->findOrFail($id);

        $this->actingAs($member)->get($comment->media_url)->assertOk();
        auth()->logout();
        $this->get($comment->media_url)->assertNotFound();
        $this->get(route('posts.comments.media', [$other, $comment, basename($comment->media_path)]))
            ->assertNotFound();
    }

    public function test_unsafe_attachments_and_parent_ids_are_rejected(): void
    {
        Storage::fake('local');
        $member = User::factory()->create(['onboarding_step' => 3]);
        $post = $this->createPost($member);
        $otherPost = $this->createPost($member);
        $otherComment = $otherPost->comments()->create(['author_id' => $member->id, 'body' => 'Elsewhere']);

        $this->actingAs($member)->withHeaders(['Accept' => 'application/json'])
            ->post(route('posts.comments', $post), [
                'body' => 'Unsafe file.',
                'media' => UploadedFile::fake()->createWithContent('vector.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>'),
            ])->assertUnprocessable()->assertJsonValidationErrors('media');
        $this->actingAs($member)->postJson(route('posts.comments', $post), [
            'body' => 'Wrong parent', 'parent_id' => $otherComment->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('parent_id');
    }
}
