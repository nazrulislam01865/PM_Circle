<?php

namespace Tests\Feature\Members;

use App\Domain\Community\Queries\FeedQuery;
use App\Domain\Identity\Services\MemberProfileAccess;
use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class MemberProfileAccessTest extends TestCase
{
    use RefreshDatabase;

    private function member(?string $visibility = 'public', array $attributes = []): User
    {
        $user = User::factory()->create(array_merge(['onboarding_step' => 3], $attributes));
        if ($visibility !== null) {
            $user->profile()->create(['visibility' => $visibility]);
        }

        return $user->load('profile');
    }

    private function post(User $author, bool $anonymous = false): Post
    {
        return Post::create(['author_id' => $author->id, 'body' => 'Example post', 'topic' => 'Questions',
            'visibility' => 'public', 'status' => 'published', 'published_at' => now(), 'is_anonymous' => $anonymous]);
    }

    public function test_feed_urls_match_profile_access_for_guest_member_and_owner(): void
    {
        config()->set('pm-circle.email_verification_required', true);
        $viewer = $this->member('private');
        $public = $this->member();
        $community = $this->member('members_only');
        $private = $this->member('private');
        $disabled = $this->member('public', ['status' => 'inactive']);
        $unverified = $this->member('public', ['email_verified_at' => null]);
        $admin = $this->member('public', ['is_admin' => true]);
        $missing = $this->member(null);
        $members = [$public, $community, $private, $disabled, $unverified, $admin, $missing, $viewer];
        $posts = collect($members)->mapWithKeys(fn (User $member) => [$member->id => $this->post($member)->id]);
        $anonymous = $this->post($public, true);

        foreach ([null, $viewer] as $audience) {
            $data = collect(app(FeedQuery::class)->page('all', 'All', null, $audience)['data'])->keyBy('id');
            foreach ($members as $member) {
                $expected = $member->id === $public->id || ($audience && in_array($member->id, [$community->id, $viewer->id], true))
                    ? route('members.show', ['member' => $member->id], false) : null;
                $author = $data[$posts[$member->id]]['author'];
                $this->assertSame($expected, MemberProfileAccess::url($member, $audience));
                $this->assertSame($expected, $author['profile_url']);
                $this->assertArrayNotHasKey('email_verified_at', $author);
                $this->assertArrayNotHasKey('status', $author);
                $this->assertArrayNotHasKey('is_admin', $author);
                if ($expected === null) {
                    $this->assertNull($author['profile']);
                }
            }
            $this->assertArrayNotHasKey('profile_url', $data[$anonymous->id]['author']);
            $this->assertArrayNotHasKey('id', $data[$anonymous->id]['author']);
        }
        $this->actingAs($viewer)->get('/members/'.$viewer->id)->assertOk();
        $this->get('/members/'.$community->id)->assertOk();
        $this->get('/members/'.$private->id)->assertNotFound();
        $this->get('/members/'.$disabled->id)->assertNotFound();
        $this->get('/members/'.$unverified->id)->assertNotFound();
        $this->get('/members/'.$admin->id)->assertNotFound();
        $this->get('/members/'.$missing->id)->assertNotFound();
    }

    public function test_stale_and_missing_member_links_return_a_valid_inertia_404(): void
    {
        $member = $this->member();
        $url = '/members/'.$member->id;
        $member->profile()->update(['visibility' => 'private']);
        $version = app(\App\Http\Middleware\HandleInertiaRequests::class)->version(\Illuminate\Http\Request::create($url));
        foreach ([$url, '/members/999999999'] as $path) {
            $this->get($path)->assertNotFound()->assertInertia(fn ($page) => $page->component('members/Unavailable')->missing('member'));
            $this->get($path, ['X-Inertia' => 'true', 'X-Inertia-Version' => $version ?? ''])->assertNotFound()
                ->assertHeader('X-Inertia', 'true')->assertJsonPath('component', 'members/Unavailable');
            $this->getJson($path)->assertNotFound();
        }
    }

    public function test_post_details_and_comment_previews_use_authorized_urls(): void
    {
        $viewer = $this->member();
        $owner = $this->member('members_only');
        $restricted = $this->member('private');
        $post = $this->post($owner);
        $root = Comment::create(['post_id' => $post->id, 'author_id' => $owner->id, 'body' => 'A comment']);
        Comment::create(['post_id' => $post->id, 'author_id' => $restricted->id, 'parent_id' => $root->id, 'body' => 'A reply']);
        $this->actingAs($viewer)->get('/posts/'.$post->id)->assertOk()->assertInertia(fn ($page) => $page
            ->where('post.author.profile_url', '/members/'.$owner->id)
            ->where('comments.data.0.author.profile_url', '/members/'.$owner->id)
            ->where('comments.data.0.replies.0.author.profile_url', null));
        $this->getJson('/posts/'.$post->id.'/comments/preview')->assertOk()
            ->assertJsonPath('data.0.author.profile_url', '/members/'.$owner->id)
            ->assertJsonPath('data.0.replies.0.author.profile_url', null);
    }
}
