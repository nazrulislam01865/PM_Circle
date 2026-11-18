<?php

namespace App\Http\Controllers\Account;

use App\Domain\Activity\Queries\MemberActivityFeed;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

final class ActivityLogController extends Controller
{
    public function index(Request $request, MemberActivityFeed $feed): Response
    {
        $filters = $this->filters($request);
        return Inertia::render('account/ActivityLog', [
            'filters' => $filters,
            'activity' => $feed->page((int) $request->user()->id, ...array_values($filters)),
        ]);
    }

    public function entries(Request $request, MemberActivityFeed $feed): JsonResponse
    {
        $filters = $this->filters($request);
        $request->validate(['cursor' => ['required', 'string', 'max:200']]);
        try {
            $result = $feed->page((int) $request->user()->id, ...array_values($filters), cursor: $request->query('cursor'));
        } catch (InvalidArgumentException) {
            abort(422, 'Invalid activity cursor.');
        }
        return response()->json($result);
    }

    public function clear(Request $request): JsonResponse
    {
        // Hide items in this user's timeline only. Do not delete immutable exam,
        // moderation, achievement, billing, or other source-of-truth records.
        $now = now();
        DB::table('member_activity_visibility')->upsert([[
            'user_id' => (int) $request->user()->id,
            'hidden_before' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]], ['user_id'], ['hidden_before', 'updated_at']);

        return response()->json(['message' => 'Activity history cleared from your view.']);
    }

    private function filters(Request $request): array
    {
        $input = $request->validate([
            'type' => ['sometimes', Rule::in(MemberActivityFeed::TYPES)],
            'range' => ['sometimes', Rule::in(MemberActivityFeed::RANGES)],
            'sort' => ['sometimes', Rule::in(['newest', 'oldest'])],
        ]);
        return [
            'type' => $input['type'] ?? 'all',
            'range' => $input['range'] ?? 'all',
            'sort' => $input['sort'] ?? 'newest',
        ];
    }
}
