<?php

namespace Tests\Feature\Community;

use App\Domain\Community\Queries\FeedQuery;
use App\Domain\Community\Queries\FeedTabAvailability;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class PersonalFeedScopesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('community.engagement_stats_reads', false);
        config()->set('community.engagement_stats_writes', false);
    }

    private function member(): User
    {
        return User::factory()->create(['onboarding_step' => 3]);
    }

    private function post(User $author, string $visibility = 'public'): Post
    {
        return Post::create([
            'author_id' => $author->id,
            'body' => 'Post for personal feed filter test',
            'visibility' => $visibility,
            'status' => 'published',
            'published_at' => now(),
        ]);
    }

    public function test_saved_and_hidden_posts_are_mutually_separate_private_lists(): void
    {
        $viewer = $this->member();
        $other = $this->member();
        $author = $this->member();
        $saved = $this->post($author);
        $hidden = $this->post($author);
        $savedAndHidden = $this->post($author);
        $unrelated = $this->post($author);

        foreach ([$saved, $savedAndHidden] as $post) {
            DB::table('post_saves')->insert([
                'post_id' => $post->id, 'user_id' => $viewer->id,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        foreach ([$hidden, $savedAndHidden] as $post) {
            DB::table('post_hides')->insert([
                'post_id' => $post->id, 'user_id' => $viewer->id, 'created_at' => now(),
            ]);
        }

        $this->assertSame(['saved' => 1, 'hidden' => 2], app(FeedTabAvailability::class)->forViewer($viewer));
        $query = app(FeedQuery::class);
        $savedIds = array_column($query->page('saved', 'All', null, $viewer)['data'], 'id');
        $hiddenIds = array_column($query->page('hidden', 'All', null, $viewer)['data'], 'id');
        $allIds = array_column($query->page('all', 'All', null, $viewer)['data'], 'id');
        $this->assertSame([$saved->id], $savedIds);
        $this->assertEqualsCanonicalizing([$hidden->id, $savedAndHidden->id], $hiddenIds);
        $this->assertContains($unrelated->id, $allIds);
        $this->assertNotContains($hidden->id, $allIds);
        $this->assertNotContains($savedAndHidden->id, $allIds);
        $this->assertTrue(collect($query->page('hidden', 'All', null, $viewer)['data'])->every(
            fn (array $post): bool => $post['viewer_hidden'] === true
        ));

        $this->assertSame(['saved' => 0, 'hidden' => 0], app(FeedTabAvailability::class)->forViewer($other));
        $this->assertSame([], $query->page('saved', 'All', null, $other)['data']);
        $this->assertSame([], $query->page('hidden', 'All', null, $other)['data']);
        $this->assertSame([], $query->page('hidden', 'All', null, null)['data']);
    }

    public function test_unhide_only_removes_current_members_own_hide_and_is_idempotent(): void
    {
        $viewer = $this->member();
        $other = $this->member();
        $post = $this->post($other);
        DB::table('post_hides')->insert([
            ['post_id' => $post->id, 'user_id' => $viewer->id, 'created_at' => now()],
            ['post_id' => $post->id, 'user_id' => $other->id, 'created_at' => now()],
        ]);

        $this->actingAs($viewer)->deleteJson("/posts/{$post->id}/hide")
            ->assertOk()->assertJsonPath('hidden', false);
        $this->actingAs($viewer)->deleteJson("/posts/{$post->id}/hide")
            ->assertOk()->assertJsonPath('hidden', false);
        $this->assertDatabaseMissing('post_hides', ['user_id' => $viewer->id, 'post_id' => $post->id]);
        $this->assertDatabaseHas('post_hides', ['user_id' => $other->id, 'post_id' => $post->id]);
        $this->assertSame(['saved' => 0, 'hidden' => 0], app(FeedTabAvailability::class)->forViewer($viewer));
    }
}
