<?php

namespace Tests\Feature\Members;

use App\Domain\Community\Queries\FeedQuery;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class FullMemberProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_visible_professional_fields_are_returned_without_owner_only_data(): void
    {
        $owner = User::factory()->create(['onboarding_step' => 3]);
        $viewer = User::factory()->create(['onboarding_step' => 3]);
        $owner->profile()->create([
            'visibility' => 'members_only', 'about' => 'Professional summary', 'phone' => '01234567890',
            'skills' => ['Planning'], 'field_visibility' => ['education' => 'private', 'target_roles' => 'private'],
            'editor_details' => ['career' => ['target_roles' => 'Private target'], 'records' => ['awards' => [['name' => 'Award']]]],
        ]);
        $owner->experiences()->create(['job_title' => 'Manager', 'organization' => 'Company', 'start_date' => '2020-01', 'is_current' => true]);
        $owner->educations()->create(['degree' => 'Private degree', 'institution' => 'Private institution', 'year' => 2020]);
        $url = route('members.show', ['member' => $owner->id]);
        $this->get($url)->assertNotFound();
        $this->actingAs($viewer)->get($url)->assertOk()->assertInertia(fn ($page) => $page
            ->component('members/Show')
            ->where('overview.profile.about', 'Professional summary')
            ->where('overview.profile.skills.0', 'Planning')
            ->where('overview.profile.experiences.0.job_title', 'Manager')
            ->where('overview.profile.educations', [])
            ->where('overview.profile.editor_details.records.awards.0.name', 'Award')
            ->missing('overview.profile.editor_details.career.target_roles')
            ->missing('overview.profile.email')->missing('overview.profile.phone')->missing('overview.profile.resume')
            ->where('isOwnProfile', false));
        $owner->profile()->update(['visibility' => 'private']);
        $this->get($url)->assertNotFound();
    }

    public function test_author_posts_are_cursor_paginated_and_do_not_reveal_anonymous_or_hidden_posts(): void
    {
        $owner = User::factory()->create(['onboarding_step' => 3]);
        $viewer = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $owner->profile()->create(['visibility' => 'public']);
        $other->profile()->create(['visibility' => 'public']);
        $create = fn (User $author, array $attributes = []) => Post::create(array_merge([
            'author_id' => $author->id, 'body' => 'A discussion', 'topic' => 'Questions',
            'visibility' => 'public', 'status' => 'published', 'published_at' => now()->subMinute(),
        ], $attributes));
        $visible = collect(range(1, 25))->map(fn ($i) => $create($owner, ['body' => "Post {$i}"])->id)->all();
        $memberPost = $create($owner, ['visibility' => 'members']);
        $create($owner, ['is_anonymous' => true]);
        $create($owner, ['status' => 'pending_check']);
        $create($other);
        $hidden = $create($owner);
        DB::table('post_hides')->insert(['post_id' => $hidden->id, 'user_id' => $viewer->id, 'created_at' => now()]);
        $feed = app(FeedQuery::class);
        $first = $feed->page('all', 'All', null, $viewer, authorId: $owner->id);
        $this->assertCount(FeedQuery::INITIAL_SIZE, $first['data']);
        $this->assertNotNull($first['next_cursor']);
        $second = $feed->page('all', 'All', null, $viewer, $first['next_cursor'], authorId: $owner->id);
        $ids = array_merge(array_column($first['data'], 'id'), array_column($second['data'], 'id'));
        $this->assertEqualsCanonicalizing([...$visible, $memberPost->id], $ids);
        $this->assertNull($second['next_cursor']);
        $this->actingAs($viewer)->get(route('members.show', ['member' => $owner->id, 'tab' => 'posts', 'cursor' => $first['next_cursor']]))
            ->assertOk()->assertInertia(fn ($page) => $page->where('activeTab', 'posts')->has('posts.data', 6));
        $this->get(route('members.show', ['member' => $other->id, 'tab' => 'posts', 'cursor' => $first['next_cursor']]))->assertStatus(422);
        $guest = $feed->page('all', 'All', null, null, authorId: $owner->id);
        $this->assertNotContains($memberPost->id, array_column($guest['data'], 'id'));
    }
}
