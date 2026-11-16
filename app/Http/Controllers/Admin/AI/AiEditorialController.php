<?php

namespace App\Http\Controllers\Admin\AI;

use App\Domain\AI\Services\AiAdminAccess;
use App\Domain\AI\Services\AiEditorialService;
use App\Domain\AI\Support\AiFailure;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

final class AiEditorialController extends Controller
{
    public function index(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        return response()->json(DB::table('ai_editorial_drafts')->orderByDesc('id')
            ->select(['id', 'feature', 'slot_key', 'status', 'request_id',
                'reviewed_by', 'publication_at', 'published_at', 'created_at'])
            ->simplePaginate(30));
    }

    public function show(Request $request, int $draft, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $row = DB::table('ai_editorial_drafts')->find($draft);
        abort_unless($row, 404);
        return response()->json(['id' => $row->id, 'feature' => $row->feature,
            'status' => $row->status,
            'content' => $row->payload_encrypted ? json_decode(Crypt::decryptString($row->payload_encrypted), true) : null]);
    }

    public function generateScenario(Request $request, AiAdminAccess $access,
        AiEditorialService $editorial): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $data = $request->validate(['date' => ['required', 'date_format:Y-m-d']]);
        try {
            return response()->json($editorial->queueScenarioSlot($data['date']), 202);
        } catch (AiFailure $e) {
            return response()->json(['code' => $e->safeCode], $e->httpStatus);
        }
    }

    public function verifyTrendSource(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $data = $request->validate([
            'canonical_url' => ['required', 'url:https', 'max:500'],
            'publisher' => ['required', 'string', 'max:160'],
            'excerpt' => ['required', 'string', 'min:80', 'max:5000'],
            'published_at' => ['nullable', 'date'],
            'rights_confirmed' => ['required', 'accepted'],
            'reason' => ['required', 'string', 'min:8', 'max:500'],
        ]);
        $id = DB::transaction(function () use ($data, $request, $access): int {
            $id = DB::table('trend_sources')->insertGetId([
                'canonical_url' => $data['canonical_url'], 'publisher' => $data['publisher'],
                'published_at' => $data['published_at'] ?? null,
                'content_hash' => hash('sha256', $data['excerpt']),
                'rights_status' => 'verified', 'excerpt_encrypted' => Crypt::encryptString($data['excerpt']),
                'verified_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
            $access->audit($request->user()->id, 'sources.verify', 'trend_sources', $id,
                null, ['source_hash' => hash('sha256', $data['canonical_url'])], $data['reason']);
            return $id;
        });
        return response()->json(['id' => $id], 201);
    }

    public function generateTrend(Request $request, AiAdminAccess $access,
        AiEditorialService $editorial): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $data = $request->validate([
            'source_ids' => ['required', 'array', 'min:1', 'max:8'],
            'source_ids.*' => ['integer', 'min:1', 'distinct'],
            'slot_key' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9:-]+$/'],
        ]);
        try {
            return response()->json($editorial->createTrendDraft($data['source_ids'], $data['slot_key']), 202);
        } catch (AiFailure $e) {
            return response()->json(['code' => $e->safeCode], $e->httpStatus);
        }
    }

    public function publishRubric(Request $request, int $scenario, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $data = $request->validate([
            'criteria' => ['required', 'array', 'min:1', 'max:10'],
            'criteria.*.key' => ['required', 'string', 'max:60', 'regex:/^[a-z][a-z0-9_]*$/'],
            'criteria.*.description' => ['required', 'string', 'min:10', 'max:500'],
            'criteria.*.max_points' => ['required', 'integer', 'min:1', 'max:10'],
            'reason' => ['required', 'string', 'min:8', 'max:500'],
        ]);
        $keys = array_column($data['criteria'], 'key');
        $max = array_sum(array_column($data['criteria'], 'max_points'));
        abort_if(count($keys) !== count(array_unique($keys)) || $max !== 10, 422,
            'Rubric must have unique criteria and total 10 points.');
        $version = DB::transaction(function () use ($scenario, $data, $access, $request, $max): int {
            $exists = DB::table('scenarios')->where('id', $scenario)->lockForUpdate()->first();
            abort_unless($exists, 404);
            $version = (int) DB::table('scenario_rubric_versions')->where('scenario_id', $scenario)->max('version') + 1;
            $id = DB::table('scenario_rubric_versions')->insertGetId([
                'scenario_id' => $scenario, 'version' => $version,
                'criteria_json' => json_encode($data['criteria'], JSON_THROW_ON_ERROR),
                'max_score' => $max, 'approved_by' => $request->user()->id,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $access->audit($request->user()->id, 'rubric.publish', 'scenario_rubric_versions',
                $id, null, ['scenario_id' => $scenario, 'version' => $version], $data['reason']);
            return $version;
        }, 3);
        return response()->json(['version' => $version], 201);
    }

    public function edit(Request $request, int $draft, AiEditorialService $editorial): JsonResponse
    {
        $data = $request->validate([
            'content' => ['required', 'array'],
            'reason' => ['required', 'string', 'min:8', 'max:500'],
        ]);
        try {
            $editorial->edit($request->user(), $draft, $data['content'], $data['reason']);
            return response()->json(['status' => 'pending_review']);
        } catch (AiFailure $e) {
            return response()->json(['code' => $e->safeCode], $e->httpStatus);
        }
    }

    public function approve(Request $request, int $draft, AiEditorialService $editorial): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:8', 'max:500']]);
        try {
            $editorial->approve($request->user(), $draft, $data['reason']);
            return response()->json(['status' => 'approved']);
        } catch (AiFailure $e) {
            return response()->json(['code' => $e->safeCode], $e->httpStatus);
        }
    }

    public function publish(Request $request, int $draft, AiEditorialService $editorial): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:8', 'max:500']]);
        try {
            $id = $editorial->publish($request->user(), $draft, $data['reason']);
            return response()->json(['status' => 'published', 'subject_id' => $id]);
        } catch (AiFailure $e) {
            return response()->json(['code' => $e->safeCode], $e->httpStatus);
        }
    }
}
