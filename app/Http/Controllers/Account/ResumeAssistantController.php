<?php

namespace App\Http\Controllers\Account;

use App\Domain\AI\Services\AiFeatureCatalog;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Domain\Billing\Queries\MemberFeatureAccess;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

final class ResumeAssistantController extends Controller
{
    public function __invoke(Request $request, CurrentMemberPlan $plans)
    {
        $plan = $plans->code($request->user());
        abort_unless(MemberFeatureAccess::allows($plan, AiFeatureCatalog::FEATURES['resume_analyze']['min_plan']), 403);
        $features = DB::table('ai_features')->whereIn('code', ['resume_analyze', 'resume_rewrite'])->where('enabled', true)
            ->get(['code', 'min_plan', 'credit_tariff', 'model'])->filter(fn ($row) => config('pm-ai.enabled') && MemberFeatureAccess::allowsAi($plan, $row->code, $row->min_plan) && in_array($row->model, config('pm-ai.allowed_models', []), true))->values()->map(fn ($row) => ['code' => $row->code, 'credits' => (int) $row->credit_tariff]);
        return Inertia::render('account/ResumeAssistant', ['resumes' => $request->user()->resumes()->latest('id')->limit(30)->get(['id', 'original_name']), 'features' => $features]);
    }
}
