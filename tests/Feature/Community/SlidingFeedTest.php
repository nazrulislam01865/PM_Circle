<?php

namespace Tests\Feature\Community;

use App\Domain\Community\Queries\FeedQuery;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class SlidingFeedTest extends TestCase
{
    use RefreshDatabase;

    private function createPosts(User $author, int $count): void
    {
        for ($index = 0; $index < $count; $index++) {
            Post::query()->create([
                'author_id' => $author->id,
                'body' => 'Discussion post '.$index,
                'topic' => 'From my project',
                'status' => 'published',
                'visibility' => 'public',
                'published_at' => now()->subSeconds($index + 1),
            ]);
        }
    }

    public function test_first_twenty_and_next_twelve_are_unique_cursor_pages(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->createPosts($member, 37);
        $first = app(FeedQuery::class)->page('all', 'All', null, null);

        $this->assertCount(20, $first['data']);
        $this->assertTrue($first['has_more']);
        $this->assertNotNull($first['next_cursor']);

        $this->get('/community')->assertInertia(fn (Assert $page) => $page
            ->component('community/Feed')->has('posts.data', 20)->etc());

        $next = $this->getJson('/community/feed-page?'.http_build_query([
            'tab' => 'all', 'cursor' => $first['next_cursor'],
        ]))->assertOk()->json();
        $this->assertCount(12, $next['data']);
        $ids = array_column(array_merge($first['data'], $next['data']), 'id');
        $this->assertCount(32, array_unique($ids));
        $this->assertSame($first['data'][19]['id'] + 1, $next['data'][0]['id']);
    }

    public function test_following_and_mine_cursors_cannot_be_reused_for_all(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->createPosts($member, 24);
        $first = app(FeedQuery::class)->page('all', 'All', null, $member);
        $this->actingAs($member)->getJson('/community/feed-page?'.http_build_query([
            'tab' => 'mine', 'cursor' => $first['next_cursor'],
        ]))->assertUnprocessable();
    }

    public function test_anonymous_posts_and_private_posts_do_not_leak(): void
    {
        $author = User::factory()->create(['onboarding_step' => 3]);
        $anonymous = Post::query()->create([
            'author_id' => $author->id, 'body' => 'Anonymous question',
            'is_anonymous' => true, 'visibility' => 'public',
            'status' => 'published', 'published_at' => now(),
        ]);
        Post::query()->create([
            'author_id' => $author->id, 'body' => 'Private question',
            'visibility' => 'private', 'status' => 'published', 'published_at' => now(),
        ]);

        $page = app(FeedQuery::class)->page('all', 'All', null, null);
        $this->assertCount(1, $page['data']);
        $this->assertSame($anonymous->id, $page['data'][0]['id']);
        $this->assertSame('Anonymous member', $page['data'][0]['author']['name']);
        $this->assertArrayNotHasKey('author_id', $page['data'][0]);
        $this->assertArrayNotHasKey('id', $page['data'][0]['author']);
    }

    public function test_dashboard_uses_the_same_pages_without_an_extra_feed_query_per_post(): void
    {
        $viewer = User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);
        $this->createPosts($viewer, 33);
        $initial = app(FeedQuery::class)->page('all', 'All', null, $viewer, null, true);

        $this->actingAs($viewer)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->component('account/Dashboard')->has('dashboard.posts', 20)->etc());
        $next = $this->getJson('/community/feed-page?'.http_build_query([
            'context' => 'dashboard', 'tab' => 'all', 'cursor' => $initial['next_cursor'],
        ]))->assertOk()->json();
        $this->assertCount(12, $next['data']);
        $this->assertArrayHasKey('saved', $next['data'][0]);
        $this->assertArrayHasKey('reaction', $next['data'][0]);
    }

    public function test_feed_queries_are_batched_and_do_not_scale_with_card_count(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->createPosts($member, 35);
        $connection = \Illuminate\Support\Facades\DB::connection();
        $connection->enableQueryLog();
        $connection->flushQueryLog();
        try {
            $page = app(FeedQuery::class)->page('all', 'All', null, $member, null, true);
            $this->assertCount(20, $page['data']);
            $this->assertLessThanOrEqual(6, count($connection->getQueryLog()));
        } finally {
            $connection->disableQueryLog();
        }
    }

    public function test_save_endpoints_support_json_without_reloading_dashboard(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->createPosts($member, 1);
        $post = Post::query()->firstOrFail();
        $this->actingAs($member)->postJson('/posts/'.$post->id.'/save')->assertOk()->assertJson(['saved' => true]);
        $this->assertDatabaseHas('post_saves', ['user_id' => $member->id, 'post_id' => $post->id]);
        $this->deleteJson('/posts/'.$post->id.'/save')->assertOk()->assertJson(['saved' => false]);
        $this->assertDatabaseMissing('post_saves', ['user_id' => $member->id, 'post_id' => $post->id]);
    }

    public function test_guest_cannot_request_the_private_dashboard_projection(): void
    {
        $member = User::factory()->create();
        $this->createPosts($member, 23);
        $first = app(FeedQuery::class)->page('all', 'All', null, null);
        $this->getJson('/community/feed-page?'.http_build_query([
            'cursor' => $first['next_cursor'], 'context' => 'dashboard',
        ]))->assertForbidden();
    }
}
