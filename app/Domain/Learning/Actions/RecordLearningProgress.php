<?php

namespace App\Domain\Learning\Actions;

use App\Models\LearningActivity;
use App\Models\LearningQuestion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class RecordLearningProgress
{
    public function answer(User $user, LearningQuestion $question, string $choice): void
    {
        DB::transaction(function () use ($user, $question, $choice) {
            DB::table('learning_answers')->upsert([[
                'user_id' => $user->id, 'learning_question_id' => $question->id,
                'answer_key' => $choice, 'is_correct' => $question->answer_key === $choice,
                'created_at' => now(), 'updated_at' => now(),
            ]], ['user_id','learning_question_id'], ['answer_key','is_correct','updated_at']);

            $activity = $question->activity;
            $total = $activity->questions()->count();
            $answered = DB::table('learning_answers')->where('user_id', $user->id)
                ->whereIn('learning_question_id', $activity->questions()->select('id'))->count();
            if ($total > 0 && $answered === $total) {
                $this->insertCompletion($user, $activity, null);
            }
        });
    }

    public function complete(User $user, LearningActivity $activity, ?string $response): void
    {
        DB::transaction(fn () => $this->insertCompletion($user, $activity, $response));
    }

    private function insertCompletion(User $user, LearningActivity $activity, ?string $response): void
    {
        DB::table('learning_activity_completions')->insertOrIgnore([
            'user_id' => $user->id, 'learning_activity_id' => $activity->id,
            'written_response' => $response, 'completed_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
}
