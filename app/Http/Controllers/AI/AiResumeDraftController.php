<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

final class AiResumeDraftController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rows = DB::table('ai_resume_drafts')->where('user_id', $request->user()->id)
            ->orderByDesc('id')->limit(30)->get();
        return response()->json($rows->map(fn ($row) => [
            'id' => $row->id, 'resume_id' => $row->resume_id, 'section' => $row->section,
            'version' => $row->version, 'status' => $row->status,
            'suggested_text' => $row->status !== 'discarded'
                ? Crypt::decryptString($row->suggested_text_encrypted) : null,
        ]));
    }

    public function approve(Request $request, int $draft): JsonResponse
    {
        // Approving stores an editable private draft; NEVER overwrites a member's qualifications.
        $updated = DB::table('ai_resume_drafts')->where('id', $draft)
            ->where('user_id', $request->user()->id)->where('status', 'pending')->update([
                'status' => 'approved', 'approved_at' => now(), 'updated_at' => now(),
            ]);
        abort_unless($updated, 404);
        return response()->json(['status' => 'approved']);
    }

    public function discard(Request $request, int $draft): JsonResponse
    {
        $updated = DB::table('ai_resume_drafts')->where('id', $draft)
            ->where('user_id', $request->user()->id)->whereIn('status', ['pending', 'approved'])
            ->update(['status' => 'discarded',
                'suggested_text_encrypted' => Crypt::encryptString('[discarded]'), 'updated_at' => now()]);
        abort_unless($updated, 404);
        return response()->json(['status' => 'discarded']);
    }

    public function revokeConsent(Request $request, int $resume): JsonResponse
    {
        $owned = DB::table('profile_resumes')->where('id', $resume)
            ->where('user_id', $request->user()->id)->exists();
        abort_unless($owned, 404);
        $changed = DB::table('ai_resume_consents')->where('user_id', $request->user()->id)
            ->where('resume_id', $resume)->whereNull('revoked_at')->update(['revoked_at' => now()]);
        // Already queued work is not presumed cancelled; it is rechecked before provider transfer.
        return response()->json(['revoked' => $changed]);
    }
}
