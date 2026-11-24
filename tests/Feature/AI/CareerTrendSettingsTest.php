<?php

namespace Tests\Feature\AI;

use App\Domain\Careers\Services\CareerTrendSettings;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class CareerTrendSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_editorial_admin_can_read_and_change_settings(): void
    {
        $member = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);
        $url = '/admin/ai/career-trends';
        $this->actingAs($member)->get($url)->assertForbidden();
        $this->actingAs($admin)->get($url)->assertForbidden();
        $this->actingAs($admin)->put($url, CareerTrendSettings::defaults())->assertForbidden();
        DB::table('ai_admin_permissions')->insert([
            'user_id' => $admin->id, 'permission' => 'ai.manage_editorial', 'created_at' => now(),
        ]);
        $values = array_replace(CareerTrendSettings::defaults(), ['publish_day' => '3', 'publish_time' => '10:30']);
        $this->actingAs($admin)->from($url)->put($url, $values)->assertRedirect($url);
        $this->assertSame($values, app(CareerTrendSettings::class)->get());
        $this->assertDatabaseHas('ai_audit_events', ['actor_id' => $admin->id, 'action' => 'career_trends.settings.update']);
        $this->actingAs($admin)->putJson($url, array_replace($values, ['publishing_mode' => 'auto']))
            ->assertUnprocessable()->assertJsonValidationErrors('publishing_mode');
        $this->assertSame($values, app(CareerTrendSettings::class)->get());
    }
}
