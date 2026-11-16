<?php

namespace Tests\Feature\Exam;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class PmpDashboardSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_mock_totals_exclude_focused_practice_and_latest_score_uses_latest_full_mock(): void
    {
        $this->withoutVite();
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        config()->set('pm-ai.enabled', false);
        config()->set('pm-pmp.ai_help_enabled', false);
        $user = User::factory()->create(['onboarding_step' => 3]);
        DB::table('temporary_memberships')->insert([
            'user_id' => $user->id, 'plan_code' => 'plus',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        foreach ([
            ['mode' => 'full', 'status' => 'completed', 'correct' => 8, 'days' => 3],
            ['mode' => 'focused', 'status' => 'completed', 'correct' => 0, 'days' => 2],
            ['mode' => 'full', 'status' => 'in_progress', 'correct' => null, 'days' => 0],
        ] as $record) {
            DB::table('pmp_exam_attempts')->insert([
                'user_id' => $user->id, 'mode' => $record['mode'], 'status' => $record['status'],
                'question_ids' => '[]', 'total_questions' => 10, 'correct_count' => $record['correct'],
                'started_at' => now()->subDays($record['days']),
                'expires_at' => $record['status'] === 'in_progress' ? now()->addHour() : now()->subDays($record['days'])->addHour(),
                'finished_at' => $record['status'] === 'completed' ? now()->subDays($record['days'])->addMinutes(30) : null,
                'created_at' => now()->subDays($record['days']), 'updated_at' => now(),
            ]);
        }
        $this->actingAs($user)->get('/exams/pmp')->assertOk()->assertInertia(fn ($page) => $page
            ->where('attemptTotals.completed', 1)
            ->where('attemptTotals.inProgress', 1)
            ->where('attemptTotals.practiceCompleted', 1)
            ->where('attemptTotals.latestScore', 80));
    }
}
