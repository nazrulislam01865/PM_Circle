<?php

namespace App\Http\Controllers\Scenario;

use App\Http\Controllers\Controller;
use App\Models\Scenario;
use App\Models\ScenarioResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ScenarioReactionController extends Controller
{
    private const TYPES = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'];

    /** The existing save reaction is independent of emoji reactions. */
    public function bookmark(Request $request, Scenario $scenario): RedirectResponse
    {
        abort_unless(in_array($scenario->status, ['published', 'closed'], true), 404);
        DB::table('scenario_reactions')->insertOrIgnore([
            'scenario_id' => $scenario->id,
            'user_id' => $request->user()->id,
            'type' => 'save',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back();
    }

    public function unbookmark(Request $request, Scenario $scenario): RedirectResponse
    {
        abort_unless(in_array($scenario->status, ['published', 'closed'], true), 404);
        $scenario->reactions()->where('user_id', $request->user()->id)->where('type', 'save')->delete();

        return back();
    }

    public function reactToScenario(Request $request, Scenario $scenario): JsonResponse|RedirectResponse
    {
        abort_unless(in_array($scenario->status, ['published', 'closed'], true), 404);
        $type = $request->validate(['type' => ['required', Rule::in(self::TYPES)]])['type'];

        // Existing scenario_reactions supports multiple types and 'save'. Locking
        // the member row serializes this member's reaction changes without locking
        // the popular scenario row. Leave any 'save' interaction untouched.
        DB::transaction(function () use ($request, $scenario, $type): void {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first(['id']);
            DB::table('scenario_reactions')->where('user_id', $request->user()->id)
                ->where('scenario_id', $scenario->id)->whereIn('type', self::TYPES)->delete();
            DB::table('scenario_reactions')->insert([
                'user_id' => $request->user()->id, 'scenario_id' => $scenario->id,
                'type' => $type, 'created_at' => now(), 'updated_at' => now(),
            ]);
        });

        return $this->result($request, $type, $scenario->reactions()->whereIn('type', self::TYPES)->count());
    }

    public function unreactToScenario(Request $request, Scenario $scenario): JsonResponse|RedirectResponse
    {
        abort_unless(in_array($scenario->status, ['published', 'closed'], true), 404);
        $scenario->reactions()->where('user_id', $request->user()->id)
            ->whereIn('type', self::TYPES)->delete();

        return $this->result($request, null, $scenario->reactions()->whereIn('type', self::TYPES)->count());
    }

    public function reactToResponse(Request $request, Scenario $scenario, ScenarioResponse $response): JsonResponse|RedirectResponse
    {
        $this->ensureResponse($scenario, $response);
        $type = $request->validate(['type' => ['required', Rule::in(self::TYPES)]])['type'];
        $response->reactions()->updateOrCreate(['user_id' => $request->user()->id], ['type' => $type]);

        return $this->result($request, $type, $response->reactions()->count());
    }

    public function unreactToResponse(Request $request, Scenario $scenario, ScenarioResponse $response): JsonResponse|RedirectResponse
    {
        $this->ensureResponse($scenario, $response);
        $response->reactions()->where('user_id', $request->user()->id)->delete();

        return $this->result($request, null, $response->reactions()->count());
    }

    private function ensureResponse(Scenario $scenario, ScenarioResponse $response): void
    {
        abort_unless($scenario->status === 'published' && $response->scenario_id === $scenario->id, 404);
    }

    private function result(Request $request, ?string $reaction, int $count): JsonResponse|RedirectResponse
    {
        return $request->expectsJson()
            ? response()->json(['reaction' => $reaction, 'count' => $count])
            : back();
    }
}
