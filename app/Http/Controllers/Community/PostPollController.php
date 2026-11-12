<?php

namespace App\Http\Controllers\Community;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

final class PostPollController extends Controller
{
    public function vote(Request $request, Post $post): JsonResponse
    {
        abort_unless($post->topic === 'Poll' && $post->status === 'published' && (
            $post->visibility === 'public' || $post->visibility === 'members'
        ), 404);
        $data = $request->validate([
            'option_id' => ['required', 'integer', Rule::exists('post_poll_options', 'id')->where('post_id', $post->id)],
        ]);
        DB::transaction(function () use ($request, $post, $data): void {
            DB::table('post_poll_votes')->upsert([[
                'post_id' => $post->id, 'user_id' => $request->user()->id,
                'option_id' => $data['option_id'], 'created_at' => now(),
            ]], ['post_id', 'user_id'], ['option_id']);
        });
        $counts = DB::table('post_poll_votes')->where('post_id', $post->id)
            ->selectRaw('option_id, count(*) as total')->groupBy('option_id')->pluck('total', 'option_id');
        return response()->json(['viewer_vote' => (int) $data['option_id'], 'counts' => $counts]);
    }
}
