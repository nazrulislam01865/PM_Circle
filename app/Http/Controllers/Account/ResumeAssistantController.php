<?php

namespace App\Http\Controllers\Account;

use App\Domain\AI\Services\AiFeatureCatalog;
use App\Domain\AI\Services\AiRuntimeSettings;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Domain\Billing\Queries\MemberFeatureAccess;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Requests\Settings\ResumeAssistantRequest;
use App\Domain\Identity\Services\ResumeAssistantProfile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

final class ResumeAssistantController extends Controller
{
    public function __invoke(Request $request, CurrentMemberPlan $plans, ResumeAssistantProfile $profiles)
    {
        $plan = $plans->code($request->user());
        abort_unless(MemberFeatureAccess::allows($plan, AiFeatureCatalog::FEATURES['resume_analyze']['min_plan']), 403);
        $allowedModels = config('pm-ai.enabled') ? app(AiRuntimeSettings::class)->allowedModels() : [];
        $features = DB::table('ai_features')->whereIn('code', ['resume_analyze', 'resume_rewrite'])->where('enabled', true)
            ->get(['code', 'min_plan', 'credit_tariff', 'model', 'max_input_chars'])->filter(fn ($row) => config('pm-ai.enabled') && MemberFeatureAccess::allowsAi($plan, $row->code, $row->min_plan) && in_array($row->model, $allowedModels, true))->values()->map(fn ($row) => ['code' => $row->code, 'credits' => (int) $row->credit_tariff, 'max_input_chars' => (int) $row->max_input_chars]);
        $snapshot = $profiles->snapshot($request->user());
        $draft = null;
        if ($encrypted = $request->session()->get('resume_assistant.'.$request->user()->id)) {
            try { $draft = json_decode(Crypt::decryptString($encrypted), true, flags: JSON_THROW_ON_ERROR); } catch (\Throwable) { $request->session()->forget('resume_assistant.'.$request->user()->id); }
        }
        return Inertia::render('account/ResumeAssistant', ['profile' => $snapshot, 'draft' => $draft, 'resumes' => $request->user()->resumes()->latest('id')->limit(30)->get(['id', 'original_name']), 'features' => $features, 'aiExtractionEnabled' => app(\App\Domain\AI\Services\ResumeExtractionSettings::class)->enabled()]);
    }
    public function extract(Request $request, \App\Services\Resume\ResumeTextExtractor $reader, \App\Services\Resume\ResumeTemplateParser $parser): \Illuminate\Http\JsonResponse
    {
        abort_unless(MemberFeatureAccess::allows(app(CurrentMemberPlan::class)->code($request->user()), AiFeatureCatalog::FEATURES['resume_analyze']['min_plan']), 403);
        $request->validate(['resume' => ['required', 'file', 'mimes:pdf,docx', 'max:5120'], 'use_ai' => ['sometimes', 'boolean'], 'ai_consent' => ['required_if:use_ai,1', 'sometimes', 'accepted']]);
        if ($request->boolean('use_ai') && ! $request->boolean('ai_consent')) {
            throw \Illuminate\Validation\ValidationException::withMessages(['resume' => 'Consent is required before sending résumé text to AI.']);
        }
        $file = $request->file('resume');
        try {
            $text = $reader->extractTemplate($file->getPathname(), strtolower($file->getClientOriginalExtension()));
            $result = $request->boolean('use_ai')
                ? app(\App\Domain\AI\Services\CvExtractionService::class)->extractTemplate($text, $request->user()->id)
                : $parser->parse($text);
            if (strtolower($file->getClientOriginalExtension()) === 'pdf') {
                $result['warnings'][] = 'PDF extraction reads the first ten pages. Check the original document for any additional pages.';
            }
            return response()->json($result)->header('Cache-Control', 'private, no-store');
        } catch (\App\Domain\AI\Support\AiFailure $error) {
            return response()->json(['message' => $error->httpStatus === 429 ? 'Your AI extraction limit has been reached. Use local extraction or try again later.' : 'AI extraction is temporarily unavailable. Use local extraction or contact support.', 'code' => $error->safeCode], $error->httpStatus)->header('Cache-Control', 'private, no-store');
        } catch (\RuntimeException $error) {
            throw \Illuminate\Validation\ValidationException::withMessages(['resume' => $request->boolean('use_ai') ? 'AI extraction could not finish. Use local extraction or contact support before retrying.' : $error->getMessage()]);
        }
    }

    public function export(ResumeAssistantRequest $request, \App\Domain\Identity\Services\ResumeExport $exports): \Illuminate\Http\Response
    {
        $data = $request->validated();
        // Export the reviewed editor snapshot only; never save or modify a profile.
        return $exports->render(array_intersect_key($data, array_flip(['name', 'email', 'role', 'location', 'summary'])), $data['document'], $data['format']);
    }

    public function save(ResumeAssistantRequest $request, ResumeAssistantProfile $profiles)
    {
        $data = $request->validated();
        $key = 'resume_assistant.'.$request->user()->id;
        if ($data['action'] === 'draft') {
            $request->session()->put($key, Crypt::encryptString(json_encode($data, JSON_THROW_ON_ERROR)));
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Draft saved for this session.']);
        } else {
            $profiles->submit($request->user(), $data);
            $request->session()->forget($key);
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Profile updated.']);
        }
        return array_key_exists('document', $data)
            ? redirect()->route('profile.edit', ['tab' => 'assistant'])
            : redirect()->route('member.resume-assistant');
    }
}
