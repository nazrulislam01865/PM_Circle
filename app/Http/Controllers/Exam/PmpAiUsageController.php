<?php

namespace App\Http\Controllers\Exam;

use App\Domain\AI\Services\PmpAiUsageReadModel;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Http\Controllers\Controller;
use App\Services\AI\PmpQuestionHelpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PmpAiUsageController extends Controller
{
    public function __invoke(Request $request, CurrentMemberPlan $plans, PmpAiUsageReadModel $usage, PmpQuestionHelpService $legacy): JsonResponse
    {
        abort_unless(\App\Domain\Billing\Queries\MemberFeatureAccess::allowsExamSimulator($plans->code($request->user())), 403);

        return response()->json($legacy->enabled()
            ? $legacy->summary((int) $request->user()->id) : $usage->summary($request->user()))
            ->header('Cache-Control', 'private, no-store');
    }
}
