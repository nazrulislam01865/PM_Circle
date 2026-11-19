<?php

namespace Tests\Feature\Community;

use App\Domain\Community\Queries\FeedQuery;
use App\Domain\Community\Queries\PostReactionSummary;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class PostReactionRosterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('community.engagement_stats_reads', false);
        config()->set('community.engagement_stats_writes', false);
    }

    private function createTestPost(string $visibility = 'public', string $status = 'published'): Post
    {
        $author = User::factory()->create(['onboarding_step' => 3]);

        return Post::create([
            'author_id' => $author->id,
            'body' => 'An example community post',
            'visibility' => $visibility,
            'status' => $status,
            'published_at' => now(),
        ]);
    }

    public function test_post_detail_renders_optimized_engagement_counts_without_a_match_error(): void
    {
        config()->set('community.engagement_stats_writes', true);
        config()->set('community.engagement_stats_reads', true);
        $post = $this->createTestPost();

        DB::table('post_engagement_stats')->where('post_id', $post->id)->update([
            'comments_count' => 4,
            'reactions_count' => 3,
            'like_count' => 2,
            'love_count' => 1,
        ]);

        $this->get("/posts/{$post->id}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('community/PostShow')
            ->where('post.comments_count', 4)
            ->where('post.reactions_count', 3)
            ->where('post.likes_count', 2)
            ->where('post.loves_count', 1)
            ->where('post.reaction_breakdown.like', 2)
            ->where('post.reaction_breakdown.love', 1)
            ->etc());
    }

    public function test_popup_lists_real_reactors_and_filters_by_type_with_profile_privacy(): void
    {
        $post = $this->createTestPost();
        $rafi = User::factory()->create(['name' => 'Rafi Hasan']);
        $sara = User::factory()->create(['name' => 'Sara Ahmed']);
        $rafi->profile()->create(['visibility' => 'public', 'avatar_path' => 'rafi.png']);
        $sara->profile()->create(['visibility' => 'private', 'avatar_path' => 'private.png']);

        DB::table('post_reactions')->insert([
            ['post_id' => $post->id, 'user_id' => $rafi->id, 'type' => 'like', 'created_at' => now(), 'updated_at' => now()],
            ['post_id' => $post->id, 'user_id' => $sara->id, 'type' => 'love', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->getJson("/posts/{$post->id}/reactions/users")
            ->assertOk()->assertJsonPath('total', 2)
            ->assertJsonPath('counts.like', 1)
            ->assertJsonPath('counts.love', 1)
            ->assertJsonPath('data.0.name', 'Sara Ahmed')
            ->assertJsonPath('data.0.profile_url', null)
            ->assertJsonPath('data.0.avatar_url', null)
            ->assertJsonPath('data.1.name', 'Rafi Hasan')
            ->assertJsonPath('data.1.profile_url', "/members/{$rafi->id}")
            ->assertJsonPath('next_cursor', null);

        $this->getJson("/posts/{$post->id}/reactions/users?type=like")
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Rafi Hasan');
        $this->getJson("/posts/{$post->id}/reactions/users?type=fake")->assertUnprocessable();
    }

    public function test_roster_paginates_by_indexed_reaction_id_without_duplicates(): void
    {
        $post = $this->createTestPost();
        $members = User::factory()->count(25)->create();
        DB::table('post_reactions')->insert($members->map(fn (User $member) => [
            'post_id' => $post->id,
            'user_id' => $member->id,
            'type' => 'wow',
            'created_at' => now(),
            'updated_at' => now(),
        ])->all());

        $first = $this->getJson("/posts/{$post->id}/reactions/users?type=wow")
            ->assertOk()->assertJsonPath('total', 25)
            ->assertJsonCount(20, 'data')->json();
        $this->assertNotNull($first['next_cursor']);

        $second = $this->getJson("/posts/{$post->id}/reactions/users?type=wow&after={$first['next_cursor']}")
            ->assertOk()->assertJsonCount(5, 'data')->assertJsonPath('next_cursor', null)->json();
        $this->assertCount(25, array_unique(array_merge(
            array_column($first['data'], 'id'), array_column($second['data'], 'id')
        )));
    }

    public function test_unpublished_hidden_and_member_only_post_reactions_cannot_be_enumerated(): void
    {
        $draft = $this->createTestPost(status: 'pending_review');
        $private = $this->createTestPost(visibility: 'members');
        $this->getJson("/posts/{$draft->id}/reactions/users")->assertNotFound();
        $this->getJson("/posts/{$private->id}/reactions/users")->assertNotFound();

        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->getJson("/posts/{$private->id}/reactions/users")->assertOk();
        DB::table('post_hides')->insert(['post_id' => $private->id, 'user_id' => $member->id,
            'created_at' => now()]);
        $this->actingAs($member)->getJson("/posts/{$private->id}/reactions/users")->assertNotFound();
    }

    public function test_feed_breakdown_uses_actual_reaction_rows(): void
    {
        $post = $this->createTestPost();
        $members = User::factory()->count(3)->create();
        foreach ($members as $index => $member) {
            DB::table('post_reactions')->insert([
                'post_id' => $post->id, 'user_id' => $member->id,
                'type' => $index === 2 ? 'sad' : 'like',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        $page = app(FeedQuery::class)->page('all', 'All', null, null);
        $item = collect($page['data'])->firstWhere('id', $post->id);
        $this->assertSame(2, $item['reaction_breakdown']['like']);
        $this->assertSame(1, $item['reaction_breakdown']['sad']);
        $this->assertSame(0, $item['reaction_breakdown']['love']);

        $posts = Post::whereKey($post->id)->get();
        PostReactionSummary::attach($posts);
        $this->assertSame(3, array_sum($posts->first()->reaction_breakdown));
    }
}
