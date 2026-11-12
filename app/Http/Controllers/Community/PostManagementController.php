<?php

namespace App\Http\Controllers\Community;

use App\Http\Controllers\Controller;
use App\Http\Requests\Community\UpdatePostRequest;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

final class PostManagementController extends Controller
{
    private function own(Request $request, Post $post): void
    {
        abort_unless($request->user() && $post->author_id === $request->user()->id
            && $post->status === 'published', 403);
    }

    private function visible(Request $request, Post $post): void
    {
        abort_unless($post->status === 'published' && (
            $post->visibility === 'public'
            || ($post->visibility === 'members' && $request->user()?->onboarding_step >= 3)
        ), 404);
    }

    public function update(UpdatePostRequest $request, Post $post): RedirectResponse|JsonResponse
    {
        $data = $request->validated();
        $oldImage = $post->getRawOriginal('image_path');
        $newImage = null;
        if ($request->hasFile('image')) {
            $newImage = $request->file('image')->store($post->visibility === 'members' ? 'post-images-private' : 'post-images', $post->visibility === 'members' ? 'local' : 'public');
            abort_unless($newImage, 422, 'Unable to save the uploaded image.');
        }

        try {
            $post->body = trim((string) ($data['body'] ?? ''));
            if ($newImage) {
                $post->image_path = $post->visibility === 'members' ? '/posts/'.$post->id.'/media/'.basename($newImage) : '/post-media/'.basename($newImage);
            } elseif ($request->boolean('remove_image')) {
                $post->image_path = null;
            }
            if ($post->body === '' && ! $post->image_path) {
                throw \Illuminate\Validation\ValidationException::withMessages(['body' => 'Add text or an image.']);
            }
            $post->save();
        } catch (\Throwable $exception) {
            if ($newImage) Storage::disk($post->visibility === 'members' ? 'local' : 'public')->delete($newImage);
            throw $exception;
        }

        if ($oldImage && ($newImage || $request->boolean('remove_image'))) {
            $file = basename(parse_url($oldImage, PHP_URL_PATH) ?: '');
            if (preg_match('/\A[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)\z/iD', $file)) {
                Storage::disk($post->visibility === 'members' ? 'local' : 'public')->delete(($post->visibility === 'members' ? 'post-images-private/' : 'post-images/').$file);
            }
        }

        return $request->expectsJson()
            ? response()->json(['body' => $post->body, 'image_path' => $post->image_path])
            : back()->with('status', 'Post updated.');
    }

    public function destroy(Request $request, Post $post): RedirectResponse|JsonResponse
    {
        $this->own($request, $post);
        $post->delete(); // Soft-delete: preserve audit evidence and avoid orphaned relations.

        return $request->expectsJson()
            ? response()->json(['deleted' => true])
            : to_route('dashboard')->with('status', 'Post deleted.');
    }

    public function mute(Request $request, Post $post): RedirectResponse|JsonResponse
    {
        $this->own($request, $post);
        $post->forceFill(['notifications_muted_at' => $post->notifications_muted_at ? null : now()])->save();

        return $request->expectsJson()
            ? response()->json(['muted' => $post->notifications_muted_at !== null])
            : back();
    }

    public function hide(Request $request, Post $post): RedirectResponse|JsonResponse
    {
        $this->visible($request, $post);
        DB::table('post_hides')->insertOrIgnore([
            'post_id' => $post->id, 'user_id' => $request->user()->id, 'created_at' => now(),
        ]);
        return $request->expectsJson() ? response()->json(['hidden' => true]) : back();
    }

    public function report(Request $request, Post $post): RedirectResponse|JsonResponse
    {
        $this->visible($request, $post);
        abort_if($post->author_id === $request->user()->id, 403, 'You cannot report your own post.');
        $data = $request->validate([
            'reason' => ['required', Rule::in(['spam', 'harassment', 'hate', 'privacy', 'other'])],
            'details' => ['nullable', 'string', 'max:1000'],
        ]);
        DB::transaction(function () use ($request, $post, $data): void {
            DB::table('post_reports')->insertOrIgnore([
                'post_id' => $post->id, 'reporter_id' => $request->user()->id,
                'reason' => $data['reason'], 'details' => $data['details'] ?? null,
                'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
            ]);
            // Reporting automatically hides this post only for the reporting member.
            // Both operations must commit together, even on duplicate report retries.
            DB::table('post_hides')->insertOrIgnore([
                'post_id' => $post->id, 'user_id' => $request->user()->id,
                'created_at' => now(),
            ]);
        });
        return $request->expectsJson()
            ? response()->json(['reported' => true, 'hidden' => true], 201)
            : back()->with('status', 'Report submitted to the moderation team.');
    }
}
