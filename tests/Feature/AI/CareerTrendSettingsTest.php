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

    public function test_administrator_can_read_and_change_settings_without_extra_permission(): void
    {
        $this->withoutVite();
        $member = User::factory()->create(['is_admin' => false]);
        $admin = User::factory()->create(['is_admin' => true]);
        $url = '/admin/ai/career-trends';
        $this->actingAs($member)->get($url)->assertForbidden();
        $this->actingAs($member)->put($url, CareerTrendSettings::defaults())->assertForbidden();
        $this->assertDatabaseMissing('ai_admin_permissions', ['user_id' => $admin->id]);
        $this->actingAs($admin)->get($url)->assertOk();
        $values = array_replace(CareerTrendSettings::defaults(), ['publish_day' => '3', 'publish_time' => '10:30']);
        $this->actingAs($admin)->from($url)->put($url, $values)->assertRedirect($url);
        $this->assertSame($values, app(CareerTrendSettings::class)->get());
        $this->assertDatabaseHas('ai_audit_events', ['actor_id' => $admin->id, 'action' => 'career_trends.settings.update']);
        $this->actingAs($admin)->putJson($url, array_replace($values, ['publishing_mode' => 'auto']))
            ->assertUnprocessable()->assertJsonValidationErrors('publishing_mode');
        $this->assertSame($values, app(CareerTrendSettings::class)->get());
    }
}
