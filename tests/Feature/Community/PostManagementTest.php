<?php

namespace Tests\Feature\Community;

use App\Domain\Community\Queries\FeedQuery;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class PostManagementTest extends TestCase
{
    use RefreshDatabase;

    private function member(): User
    {
        return User::factory()->create(['onboarding_step' => 3]);
    }

    private function published(User $author, string $visibility = 'public'): Post
    {
        return Post::query()->create([
            'author_id' => $author->id, 'body' => 'Initial post body',
            'topic' => 'From my project', 'visibility' => $visibility,
            'status' => 'published', 'published_at' => now(),
        ]);
    }

    public function test_author_can_update_and_delete_but_other_members_cannot(): void
    {
        $author = $this->member();
        $other = $this->member();
        $post = $this->published($author);
        $this->actingAs($other)->patchJson('/posts/'.$post->id, ['body' => 'Changed'])
            ->assertForbidden();
        $this->deleteJson('/posts/'.$post->id)->assertForbidden();
        $this->actingAs($author)->patchJson('/posts/'.$post->id, ['body' => 'Changed by owner'])
            ->assertOk()->assertJsonPath('body', 'Changed by owner');
        $this->actingAs($author)->deleteJson('/posts/'.$post->id)->assertOk();
        $this->assertSoftDeleted('posts', ['id' => $post->id]);
        $this->get('/posts/'.$post->id)->assertNotFound();
    }

    public function test_post_owner_can_toggle_notification_preference(): void
    {
        $author = $this->member();
        $post = $this->published($author);
        $this->actingAs($author)->postJson('/posts/'.$post->id.'/mute')->assertOk()->assertJsonPath('muted', true);
        $this->assertNotNull($post->fresh()->notifications_muted_at);
        $this->postJson('/posts/'.$post->id.'/mute')->assertOk()->assertJsonPath('muted', false);
        $this->assertNull($post->fresh()->notifications_muted_at);
        $this->actingAs($this->member())->postJson('/posts/'.$post->id.'/mute')->assertForbidden();
    }

    public function test_hidden_posts_are_excluded_for_that_viewer_only(): void
    {
        $author = $this->member();
        $viewer = $this->member();
        $post = $this->published($author);
        $this->actingAs($viewer)->postJson('/posts/'.$post->id.'/hide')->assertOk();
        $this->assertCount(0, app(FeedQuery::class)->page('all', 'All', null, $viewer)['data']);
        $this->assertCount(1, app(FeedQuery::class)->page('all', 'All', null, $author)['data']);
    }

    public function test_reporting_is_idempotent_and_available_to_admin(): void
    {
        $author = $this->member();
        $viewer = $this->member();
        $post = $this->published($author);
        $this->actingAs($viewer)->postJson('/posts/'.$post->id.'/report', [
            'reason' => 'spam', 'details' => 'Potential scam',
        ])->assertCreated();
        $this->postJson('/posts/'.$post->id.'/report', ['reason' => 'spam'])->assertCreated();
        $this->assertDatabaseCount('post_reports', 1);
        $this->assertDatabaseHas('post_hides', ['post_id' => $post->id, 'user_id' => $viewer->id]);
        $this->assertDatabaseCount('post_hides', 1);
        $this->assertCount(0, app(FeedQuery::class)->page('all', 'All', null, $viewer)['data']);
        $this->get('/posts/'.$post->id)->assertNotFound();
        $this->assertCount(1, app(FeedQuery::class)->page('all', 'All', null, $author)['data']);
        $this->postJson('/posts/'.$post->id.'/report', ['reason' => 'invalid'])->assertUnprocessable();
        $this->actingAs($author)->postJson('/posts/'.$post->id.'/report', ['reason' => 'spam'])->assertForbidden();
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)->get('/admin/post-reports')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/PostModeration')->has('reports.data', 1)->etc());
        $reportId = (int) DB::table('post_reports')->value('id');
        $this->patch('/admin/post-reports/'.$reportId, ['status' => 'reviewed'])->assertRedirect();
        $this->assertDatabaseHas('post_reports', ['id' => $reportId, 'status' => 'reviewed']);
    }

    public function test_members_only_posts_do_not_appear_for_guests(): void
    {
        $author = $this->member();
        $post = $this->published($author, 'members');
        $this->assertCount(0, app(FeedQuery::class)->page('all', 'All', null, null)['data']);
        $this->get('/posts/'.$post->id)->assertNotFound();
        $this->assertCount(1, app(FeedQuery::class)->page('all', 'All', null, $author)['data']);
        $this->actingAs($author)->get('/posts/'.$post->id)->assertOk();
    }

    public function test_poll_choices_are_validated_and_each_member_can_vote_once(): void
    {
        $author = $this->member();
        $this->actingAs($author)->post('/posts', [
            'topic' => 'Poll', 'body' => 'How do you plan projects?',
            'poll_options' => ['Agile', 'Hybrid'], 'visibility' => 'public', 'return_to' => 'dashboard',
        ])->assertRedirect('/dashboard');
        $post = Post::query()->latest('id')->firstOrFail();
        $this->assertSame('Poll', $post->topic);
        $options = DB::table('post_poll_options')->where('post_id', $post->id)->orderBy('position')->get();
        $this->assertCount(2, $options);
        $viewer = $this->member();
        $this->actingAs($viewer)->postJson('/posts/'.$post->id.'/poll-votes', ['option_id' => $options[0]->id])
            ->assertOk()->assertJsonPath('viewer_vote', $options[0]->id);
        $this->postJson('/posts/'.$post->id.'/poll-votes', ['option_id' => $options[1]->id])
            ->assertOk()->assertJsonPath('viewer_vote', $options[1]->id);
        $this->assertDatabaseCount('post_poll_votes', 1);
    }

    public function test_anonymous_review_requires_admin_approval(): void
    {
        $author = $this->member();
        $post = Post::query()->create([
            'author_id' => $author->id, 'body' => 'Anonymous submission',
            'is_anonymous' => true, 'status' => 'pending_review', 'visibility' => 'public',
        ]);
        $this->assertCount(0, app(FeedQuery::class)->page('all', 'All', null, null)['data']);
        $this->actingAs(User::factory()->create(['is_admin' => true]))
            ->post('/admin/post-reviews/'.$post->id, ['decision' => 'approve'])->assertRedirect();
        $this->assertSame('published', $post->fresh()->status);
        $page = app(FeedQuery::class)->page('all', 'All', null, null);
        $this->assertSame('Anonymous member', $page['data'][0]['author']['name']);
        $this->assertArrayNotHasKey('author_id', $page['data'][0]);
    }
}
