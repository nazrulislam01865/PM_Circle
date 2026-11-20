<?php

namespace Tests\Feature\Admin;

use App\Domain\Community\Services\EngagementStats;
use App\Domain\Community\Queries\PostReactionSummary;
use App\Models\Post;
use App\Models\Scenario;
use App\Models\User;
use App\Support\Community\ReactionIconCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class CustomReactionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('public');
        ReactionIconCatalog::clearCache();
    }

    private function admin(): User
    {
        return User::factory()->create([
            'is_admin' => true, 'onboarding_step' => 3, 'email_verified_at' => now(),
        ]);
    }

    private function image(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('new.png', base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAZUlEQVR42u3QAQEAIAgDsGNMm5oOe8AWYZX7OoudLCdAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAib4VqACkpmgLxcAAAAASUVORK5CYII=', true,
        ));
    }

    private function create(string $label = 'Celebrate'): void
    {
        $this->post('/admin/reaction-icons', ['label' => $label, 'icon' => $this->image()])
            ->assertRedirect('/admin/reaction-icons');
    }

    public function test_only_admin_can_create_or_edit_custom_reactions(): void
    {
        $this->post('/admin/reaction-icons', ['label' => 'Celebrate', 'icon' => $this->image()])->assertRedirect();
        $member = User::factory()->create(['onboarding_step' => 3, 'email_verified_at' => now()]);
        $this->actingAs($member)->post('/admin/reaction-icons', ['label' => 'Celebrate', 'icon' => $this->image()])->assertForbidden();
        $this->actingAs($member)->patch('/admin/reaction-icons/celebrate', ['label' => 'Cheers', 'active' => true])->assertForbidden();
        $this->actingAs($this->admin())->get('/admin/reaction-icons')->assertOk();
    }

    public function test_create_edit_and_archive_keep_existing_icons_and_member_history(): void
    {
        $this->actingAs($this->admin());
        $this->create();
        $this->assertSame(8, count(ReactionIconCatalog::activeTypes()));
        $this->assertSame('Celebrate', ReactionIconCatalog::custom()['celebrate']['label']);
        $path = ReactionIconCatalog::custom()['celebrate']['path'];
        Storage::disk('public')->assertExists($path);
        $this->assertArrayHasKey('celebrate', ReactionIconCatalog::urls());
        $this->assertSame('Like', ReactionIconCatalog::LABELS['like']);
        $this->assertNull(ReactionIconCatalog::paths()['like']);

        $this->patch('/admin/reaction-icons/celebrate', ['label' => 'Cheers', 'active' => false])
            ->assertRedirect('/admin/reaction-icons');
        $this->assertNotContains('celebrate', ReactionIconCatalog::activeTypes());
        $this->assertContains('celebrate', ReactionIconCatalog::allTypes());
        $this->assertSame('Cheers', ReactionIconCatalog::custom()['celebrate']['label']);
        Storage::disk('public')->assertExists($path);

        $this->patch('/admin/reaction-icons/celebrate', ['label' => 'Cheers', 'active' => true])
            ->assertRedirect('/admin/reaction-icons');
        $this->assertContains('celebrate', ReactionIconCatalog::activeTypes());
    }

    public function test_invalid_names_images_duplicates_and_builtins_are_rejected(): void
    {
        $this->actingAs($this->admin());
        $this->post('/admin/reaction-icons', ['label' => 'Celebrate', 'icon' => UploadedFile::fake()->createWithContent(
            'icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        )])->assertSessionHasErrors('icon');
        $this->create();
        $this->post('/admin/reaction-icons', ['label' => 'Celebrate', 'icon' => $this->image()])->assertSessionHasErrors('label');
        $this->post('/admin/reaction-icons', ['label' => 'Like', 'icon' => $this->image()])->assertSessionHasErrors('label');
        $this->patch('/admin/reaction-icons/like', ['label' => 'Changed', 'active' => true])->assertNotFound();
        $this->patch('/admin/reaction-icons/unknown', ['label' => 'Changed', 'active' => true])->assertNotFound();
        $this->delete('/admin/reaction-icons/celebrate')->assertNotFound();
    }

    public function test_comment_scenario_and_scenario_response_accept_added_reactions(): void
    {
        $this->actingAs($this->admin());
        $this->create();
        $member = User::factory()->create([
            'onboarding_step' => 3, 'status' => 'active', 'email_verified_at' => now(),
        ]);
        $post = Post::create([
            'author_id' => $member->id, 'body' => 'Member update',
            'visibility' => 'public', 'status' => 'published', 'published_at' => now(),
        ]);
        $comment = $post->comments()->create(['author_id' => $member->id, 'body' => 'A discussion']);
        $scenario = Scenario::create([
            'slug' => 'custom-reaction-test', 'title' => 'Reaction scenario', 'summary' => 'Scenario',
            'situation' => 'A project changes', 'known_facts' => [], 'topics' => [],
            'focus' => 'Change control', 'status' => 'published', 'published_at' => now(),
        ]);
        $response = $scenario->responses()->create(['user_id' => $member->id, 'body' => 'Discuss this']);

        $this->actingAs($member)->postJson("/posts/{$post->id}/comments/{$comment->id}/reactions", [
            'type' => 'celebrate',
        ])->assertOk()->assertJsonPath('reaction', 'celebrate');
        $this->postJson("/scenarios/{$scenario->id}/reactions", ['type' => 'celebrate'])
            ->assertOk()->assertJsonPath('reaction', 'celebrate');
        $this->postJson("/scenarios/{$scenario->id}/responses/{$response->id}/reactions", [
            'type' => 'celebrate',
        ])->assertOk()->assertJsonPath('reaction', 'celebrate');

        $this->assertDatabaseHas('comment_likes', ['comment_id' => $comment->id, 'type' => 'celebrate']);
        $this->assertDatabaseHas('scenario_reactions', ['scenario_id' => $scenario->id, 'type' => 'celebrate']);
        $this->assertDatabaseHas('scenario_response_reactions', [
            'scenario_response_id' => $response->id, 'type' => 'celebrate',
        ]);
    }

    public function test_custom_reaction_is_in_post_summary_and_roster_even_after_archiving(): void
    {
        $this->actingAs($this->admin());
        $this->create();
        auth()->logout();
        $author = User::factory()->create(['onboarding_step' => 3]);
        $member = User::factory()->create([
            'onboarding_step' => 3, 'status' => 'active', 'email_verified_at' => now(),
        ]);
        $post = Post::create([
            'author_id' => $author->id, 'body' => 'Project success',
            'visibility' => 'public', 'status' => 'published', 'published_at' => now(),
        ]);

        config()->set('community.engagement_stats_writes', true);
        config()->set('community.engagement_stats_reads', true);
        EngagementStats::ensureRow($post->id);
        $this->actingAs($member)->postJson("/posts/{$post->id}/reactions", ['type' => 'celebrate'])
            ->assertOk()->assertJsonPath('reaction', 'celebrate')->assertJsonPath('count', 1);
        $this->assertSame(1, (int) DB::table('post_engagement_stats')->where('post_id', $post->id)->value('other_reactions_count'));
        $this->getJson("/posts/{$post->id}/reactions/users?type=celebrate")
            ->assertOk()->assertJsonPath('counts.celebrate', 1);
        $posts = Post::query()->whereKey($post->id)->get();
        PostReactionSummary::attach($posts);
        $this->assertSame(1, $posts->first()->reaction_breakdown['celebrate']);

        $this->actingAs($this->admin())->patch('/admin/reaction-icons/celebrate', [
            'label' => 'Celebrate', 'active' => false,
        ])->assertRedirect('/admin/reaction-icons');
        $this->actingAs($member)->postJson("/posts/{$post->id}/reactions", ['type' => 'celebrate'])->assertUnprocessable();
        $this->getJson("/posts/{$post->id}/reactions/users?type=celebrate")
            ->assertOk()->assertJsonPath('counts.celebrate', 1);
        $this->deleteJson("/posts/{$post->id}/reactions")->assertOk();
        $this->assertSame(0, (int) DB::table('post_engagement_stats')->where('post_id', $post->id)->value('other_reactions_count'));
    }
}
