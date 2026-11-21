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
        // The landing page is for guests only. Signed-in administrators return to
        // administration; members enter the protected simulator or pricing flow.
        if ($request->user()) {
            return $request->user()->is_admin
                ? to_route('admin.dashboard')
                : to_route('exams.pmp.entry');
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
            ];
        })->filter()->values()->all();
        $sample = $samples[0] ?? null;
        return Inertia::render('exam/Public', [
            'content' => PmpPublicContent::load(),
            'sampleQuestion' => $sample,
            'sampleQuestions' => $samples,
            'sampleDurationSeconds' => $settings['sample_duration_seconds'],
        ]);
    }
}
