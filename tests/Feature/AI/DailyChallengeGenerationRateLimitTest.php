<?php

namespace Tests\Feature\AI;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class DailyChallengeGenerationRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_rate_limited_inertia_generation_shows_inline_error_instead_of_html_modal(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        DB::table('ai_admin_permissions')->insert([
            'user_id' => $admin->id,
            'permission' => 'ai.manage_editorial',
            'created_at' => now(),
        ]);

        $this->actingAs($admin);

        // Invalid submissions should never queue AI requests, but count toward
        // the existing five-per-minute protection against repeated submissions.
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post('/admin/ai/daily-challenge/generate', ['date' => 'invalid'])
                ->assertSessionHasErrors('date');
        }

        $response = $this->withHeader('X-Inertia', 'true')
            ->post('/admin/ai/daily-challenge/generate', ['date' => '2026-11-18']);

        $response->assertRedirect(route('admin.ai.daily-challenge.index'))
            ->assertSessionHasErrors('date');
        $this->assertStringContainsString(
            'Too many generation requests. Try again in ',
            session('errors')->first('date'),
        );

        $this->assertSame(0, DB::table('ai_editorial_drafts')->count());
    }
}
