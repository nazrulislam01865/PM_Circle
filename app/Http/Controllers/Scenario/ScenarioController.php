<?php

namespace App\Http\Controllers\Scenario;

use App\Http\Controllers\Controller;
use App\Models\Scenario;
use App\Models\ScenarioResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ScenarioController extends Controller
{
    public function show(Scenario $scenario, Request $request): Response
    {
        abort_unless($scenario->status === 'published', 404);

        $responses = $scenario->responses()
            ->whereNull('parent_id')
            ->with([
                'user:id,name',
                'user.profile' => fn ($q) => $q->where('visibility', 'public')->select('id', 'user_id', 'role'),
                'replies' => fn ($q) => $q->with([
                    'user:id,name',
                    'user.profile' => fn ($p) => $p->where('visibility', 'public')->select('id', 'user_id', 'role'),
                ])->oldest(),
            ])
            ->orderByDesc('is_community_helpful')
            ->orderByDesc('likes_count')
            ->orderByDesc('created_at')
            ->paginate(10);

        $related = Scenario::query()
            ->where('status', 'published')
            ->where('id', '!=', $scenario->id)
            ->limit(3)
            ->get(['id', 'slug', 'title', 'difficulty', 'focus']);

        return Inertia::render('scenarios/Show', [
            'scenario' => $scenario,
            'responses' => $responses,
            'related' => $related,
        ]);
    }

    public function respond(Request $request, Scenario $scenario): RedirectResponse
    {
        abort_unless($scenario->status === 'published', 404);
        $validated = $request->validate([
            'body' => ['required', 'string', 'min:30', 'max:10000'],
            'parent_id' => ['nullable', 'exists:scenario_responses,id'],
        ]);

        $isReply = !empty($validated['parent_id']);

        $aiScore = null;
        $aiFeedback = null;

        // Structured rubric simulation for non-replies
        if (!$isReply) {
            $aiScore = 8;
            $aiFeedback = [
                'strength' => 'Identifies immediate constraints and proposes a structured assessment.',
                'consider' => 'Clarify decision authority and sponsor sign-off before making trade-offs.',
                'next_step' => 'Document options with formal time and cost impacts in the change log.',
            ];
        }

        $scenario->responses()->create([
            'user_id' => $request->user()->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'body' => $validated['body'],
            'ai_score' => $aiScore,
            'ai_feedback' => $aiFeedback,
            'likes_count' => 0,
            'loves_count' => 0,
            'is_community_helpful' => false,
            'is_question' => str_ends_with(trim($validated['body']), '?'),
        ]);

        return back();
    }
}
