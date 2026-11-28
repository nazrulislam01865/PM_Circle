<?php

namespace App\Http\Controllers\PublicSite;

use App\Http\Controllers\Controller;
use App\Support\Exam\PmpPublicContent;
use App\Services\Exam\PmpExamSettings;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class PmpPublicPageController extends Controller
{
    public function __invoke(Request $request, PmpExamSettings $examSettings): Response|RedirectResponse
    {
        // Guests and Free members may use samples. Paid members enter the simulator.
        if ($request->user()?->is_admin) return to_route('admin.dashboard');
        if ($request->user() && \App\Domain\Billing\Queries\MemberFeatureAccess::allowsExamSimulator(app(\App\Domain\Billing\Queries\CurrentMemberPlan::class)->code($request->user()))) {
            return to_route('exams.pmp.entry');
        }

        $settings = $examSettings->get();
        $sampleIds = $settings['sample_question_ids'];
        $questions = empty($sampleIds) ? collect() : DB::table('pmp_exam_questions')
            ->whereIn('id', $sampleIds)->where('is_active', true)->get()->keyBy('id');
        // Preserve the administrator's order. Inactive/deleted entries are never exposed publicly.
        $samples = collect($sampleIds)->map(function ($id) use ($questions) {
            $question = $questions->get($id);
            if (! $question) {
                return null;
            }
            return [
                'id' => (int) $question->id, 'domain' => $question->domain,
                'difficulty' => $question->difficulty, 'prompt' => $question->prompt,
                'options' => json_decode($question->options, true, 512, JSON_THROW_ON_ERROR),
                'correct' => $question->correct_option, 'explanation' => $question->explanation,
                'otherOptions' => $question->other_options, 'takeaway' => $question->takeaway,
                'concepts' => $question->concepts, 'references' => $question->references,
                'code' => $question->code, 'approach' => $question->approach, 'industry' => $question->industry,
            ];
        })->filter()->values()->all();
        $sample = $samples[0] ?? null;
        return Inertia::render('exam/Public', [
            'content' => PmpPublicContent::load(),
            'sampleQuestion' => $sample,
            'sampleQuestions' => $samples,
            'sampleDurationSeconds' => $settings['sample_duration_seconds'],
            'readinessThresholds' => array_intersect_key($settings, array_flip(['needs_improvement_below', 'target_below', 'above_target_from'])),
        ]);
    }
}
