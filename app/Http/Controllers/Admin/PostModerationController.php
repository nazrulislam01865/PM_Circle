<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final class PostModerationController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/PostModeration', [
            'pendingPosts' => Post::query()->where('status', 'pending_review')
                ->with('author:id,name')
                ->select(['id', 'author_id', 'body', 'topic', 'visibility', 'created_at'])
                ->latest('id')->limit(30)->get(),
            'reports' => DB::table('post_reports as reports')
                ->join('posts', 'posts.id', '=', 'reports.post_id')
                ->join('users as reporters', 'reporters.id', '=', 'reports.reporter_id')
                ->select('reports.id', 'reports.reason', 'reports.details', 'reports.status', 'reports.created_at',
                    'posts.id as post_id', 'posts.body as post_body', 'reporters.name as reporter_name')
                ->orderByRaw("CASE WHEN reports.status = 'pending' THEN 0 ELSE 1 END")
                ->orderByDesc('reports.created_at')->paginate(20),
        ]);
    }

    public function reviewPost(Request $request, Post $post): RedirectResponse
    {
        $data = $request->validate(['decision' => ['required', Rule::in(['approve', 'reject'])]]);
        abort_unless($post->status === 'pending_review', 404);
        $post->forceFill([
            'status' => $data['decision'] === 'approve' ? 'published' : 'rejected',
            'published_at' => $data['decision'] === 'approve' ? now() : null,
        ])->save();
        return back()->with('status', 'Post review recorded.');
    }

    public function update(Request $request, int $report): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['reviewed', 'dismissed'])]]);
        abort_unless(DB::table('post_reports')->where('id', $report)->exists(), 404);
        DB::table('post_reports')->where('id', $report)->where('status', 'pending')->update([
            'status' => $data['status'], 'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(), 'updated_at' => now(),
        ]);
        return back()->with('status', 'Report updated.');
    }
}
