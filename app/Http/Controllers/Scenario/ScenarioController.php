<?php

namespace App\Http\Controllers\Scenario;

use App\Http\Controllers\Controller;
use App\Models\Scenario;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ScenarioController extends Controller
{
    public function show(Scenario $scenario): Response
    {
        abort_unless($scenario->status === 'published', 404);
        return Inertia::render('scenarios/Show', [
            'scenario' => $scenario,
            'responses' => $scenario->responses()->with('user:id,name')->latest()->paginate(10),
            'related' => Scenario::query()->where('status', 'published')->where('id', '!=', $scenario->id)->limit(3)->get(['id', 'slug', 'title']),
        ]);
    }

    public function respond(Request $request, Scenario $scenario): RedirectResponse
    {
        abort_unless($scenario->status === 'published', 404);
        $validated = $request->validate(['body' => ['required', 'string', 'min:30', 'max:10000']]);
        $scenario->responses()->create(['body' => $validated['body'], 'user_id' => $request->user()->id]);
        // Feedback is not claimed unless an authenticated, paid, credited AI request is completed.
        return back();
    }
}
