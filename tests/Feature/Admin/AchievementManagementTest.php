<?php

namespace Tests\Feature\Admin;

use App\Domain\Achievements\Queries\MemberAchievements;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class AchievementManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_management_and_unsupported_metric_validation(): void
    {
        $this->withoutVite();
        $member = User::factory()->create(['onboarding_step' => 3]);
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($member)->get('/admin/achievements')->assertForbidden();
        $this->actingAs($admin)->get('/admin/achievements')->assertOk()->assertInertia(fn ($page) => $page->component('admin/AchievementBadges')->has('badges', 42));
        $data = ['name' => 'Community champion', 'category' => 'Community', 'mode' => 'milestone', 'metric' => 'posts', 'target' => 2, 'art' => 'posts', 'tier' => 1, 'publishStatus' => 'active', 'match' => 'all', 'required' => 1];
        $this->post('/admin/achievements/badges', [...$data, 'metric' => 'events'])->assertSessionHasErrors('targets');
        $this->post('/admin/achievements/badges', $data)->assertRedirect('/admin/achievements');
        $this->assertDatabaseCount('achievement_badges', 43);
    }

    public function test_award_is_unique_preserved_when_paused_and_revocation_is_final(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $admin = User::factory()->create(['is_admin' => true]);
        DB::table('posts')->insert(['author_id' => $member->id, 'body' => 'Verified activity', 'status' => 'published', 'published_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $service = app(MemberAchievements::class);
        $postBadge = collect(config('achievements.badges'))->first(fn ($b) => $b['metric'] === 'posts' && $b['target'] === 1);
        $id = $postBadge['id'];
        $service->snapshot($member, false);
        $service->snapshot($member, false);
        $award = DB::table('achievement_awards')->where('user_id', $member->id)->where('badge_id', $id)->first();
        $this->assertNotNull($award);
        $this->assertSame(1, DB::table('achievement_awards')->where('user_id', $member->id)->where('badge_id', $id)->count());
        $this->actingAs($admin)->patch('/admin/achievements/badges/'.$id.'/status', ['status' => 'paused', 'version' => 1])->assertRedirect();
        $this->assertSame('earned', collect($service->snapshot($member, false)['badges'])->firstWhere('id', $id)['status']);
        $this->post('/admin/achievements/awards/'.$award->id.'/revoke', ['reason' => 'Verified correction'])->assertRedirect();
        $this->assertSame('locked', collect($service->snapshot($member, false)['badges'])->firstWhere('id', $id)['status']);
        $this->assertDatabaseHas('achievement_awards', ['id' => $award->id, 'revocation_reason' => 'Verified correction']);
    }
}
