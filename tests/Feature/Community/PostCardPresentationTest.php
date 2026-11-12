<?php

namespace Tests\Feature\Community;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class PostCardPresentationTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_post_keeps_the_same_public_author_avatar_in_feed_and_detail(): void
    {
        config()->set('pm-circle.demo_content_enabled', false);
        $author = User::factory()->create(['onboarding_step' => 3]);
        $author->profile()->create([
            'visibility' => 'public',
            'avatar_path' => '/storage/profile-avatars/test-portrait.jpg',
        ]);
        $post = Post::query()->create([
            'author_id' => $author->id,
            'body' => 'Project communication lesson',
            'topic' => 'I learned',
            'visibility' => 'public',
            'status' => 'published',
            'published_at' => now(),
        ]);

        $avatar = '/profile-media/avatar/test-portrait.jpg';
        $this->get('/community')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('community/Feed')
            ->where('posts.data.0.author.profile.avatar_path', $avatar)
            ->etc());
        $this->get('/posts/'.$post->id)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('community/PostShow')
            ->where('post.author.profile.avatar_path', $avatar)
            ->where('post.author.id', $author->id)
            ->etc());
    }

    public function test_member_only_post_detail_is_not_exposed_to_guest(): void
    {
        $author = User::factory()->create(['onboarding_step' => 3]);
        $post = Post::query()->create([
            'author_id' => $author->id,
            'body' => 'Members only',
            'visibility' => 'members',
            'status' => 'published',
            'published_at' => now(),
        ]);

        $this->get('/posts/'.$post->id)->assertNotFound();
        $this->actingAs($author)->get('/posts/'.$post->id)->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('community/PostShow')
                ->where('post.id', $post->id)
                ->etc());
    }
}
