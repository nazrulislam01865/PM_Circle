<?php

namespace App\Http\Controllers\Community;

use App\Http\Controllers\Controller;
use App\Http\Requests\Community\UpdatePostRequest;
use App\Domain\Community\Services\PostCheckPolicy;
use App\Domain\Community\Services\PostCheckQueue;
use App\Domain\Community\Services\PostCheckMedia;
use App\Domain\Community\Media\CommunityImageVariants;
use App\Domain\Community\Queries\PostCheckFeed;
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

    /** Published edits must be checked again before they become visible. */
    public function update(UpdatePostRequest $request, Post $post): RedirectResponse|JsonResponse
    {
        app(PostCheckPolicy::class)->assertCanContribute($request->user()->id);
        if (! config('pm-ai.post_check_enabled', false)) {
            if ($post->is_anonymous) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'body' => 'Anonymous posting is temporarily unavailable while AI checking is disabled.',
                ]);
            }

            return $this->updateLegacy($request, $post);
        }
        app(PostCheckPolicy::class)->assertOperational();
        $data = $request->validated();
        $newPath = $request->hasFile('image')
            ? $request->file('image')->store('post-check-images', 'local') : null;
        if ($request->hasFile('image') && ! $newPath) {
            throw \Illuminate\Validation\ValidationException::withMessages(['image' => 'Unable to save the uploaded image.']);
        }
        $oldUrl = $post->getRawOriginal('image_path');
        try {
            DB::transaction(function () use ($post, $data, $request, $newPath): void {
                $locked = Post::query()->whereKey($post->id)->lockForUpdate()->firstOrFail();
                abort_unless($locked->author_id === $request->user()->id && $locked->status === 'published', 403);
                $locked->body = trim((string) ($data['body'] ?? ''));
                if ($newPath) {
                    $locked->image_path = '/posts/'.$locked->id.'/check-media/'.basename($newPath);
                } elseif ($request->boolean('remove_image')) {
                    $locked->image_path = null;
                }
                if ($locked->body === '' && ! $locked->image_path) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['body' => 'Add text or an image.']);
                }
                $locked->status = 'pending_check';
                $locked->published_at = null;
                $locked->check_version = (int) $locked->check_version + 1;
                $locked->check_reason = null;
                $locked->check_target = null;
                $locked->check_category = null;
                $locked->save();
                app(PostCheckQueue::class)->dispatch($locked);
            }, 3);
        } catch (\Throwable $exception) {
            if ($newPath) Storage::disk('local')->delete($newPath);
            throw $exception;
        }
        if ($oldUrl && ($newPath || $request->boolean('remove_image'))) {
            app(PostCheckMedia::class)->delete($oldUrl, $post->id);
        }
        if ($request->expectsJson()) {
            $updated = $post->fresh();
            return response()->json(['body' => $updated->body, 'image_path' => $updated->image_path, 'status' => $updated->status]);
        }
        return to_route('dashboard')->with('status', 'Checking your updated post.');
    }

    /** Preserve the pre-check editing path while the AI checker rollout flag is disabled. */
private function updateLegacy(UpdatePostRequest $request, Post $post): RedirectResponse|JsonResponse
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
            app(PostCheckMedia::class)->delete($oldImage, $post->id);
        }
        if ($newImage) {
            app(CommunityImageVariants::class)->queue($post->visibility === 'members' ? 'local' : 'public', $newImage);
        }

        return $request->expectsJson()
            ? response()->json(['body' => $post->body, 'image_path' => $post->image_path])
            : back()->with('status', 'Post updated.');
    }

    /** Lightweight, private polling contract. No public visibility or member details leak. */
    public function checkFeed(Request $request, PostCheckFeed $feed): JsonResponse
    {
        $viewer = $request->user();
        abort_unless($viewer && $viewer->onboarding_step >= 3, 403);
        return response()->json($feed->forMember($viewer->id))
            ->header('Cache-Control', 'private, no-store');
    }

    /** Retry an unavailable review without approving or exposing the original content. */
    public function recheck(Request $request, Post $post, PostCheckQueue $queue): JsonResponse
    {
        abort_unless($post->author_id === $request->user()->id && $post->status === 'check_error', 404);
        app(PostCheckPolicy::class)->assertCanContribute($request->user()->id);
        app(PostCheckPolicy::class)->assertOperational();
        DB::transaction(function () use ($post, $queue): void {
            $locked = Post::query()->whereKey($post->id)->lockForUpdate()->firstOrFail();
            abort_unless($locked->status === 'check_error', 409);
            $locked->forceFill(['status' => 'pending_check', 'check_version' => $locked->check_version + 1,
                'check_reason' => null])->save();
            $queue->dispatch($locked);
        }, 3);
        return response()->json(['status' => 'pending_check'], 202);
    }

    /** The prototype's Edit restricted post -> Post again flow. */
    public function repost(Request $request, Post $post, PostCheckQueue $queue, PostCheckMedia $media): JsonResponse
    {
        abort_unless($post->author_id === $request->user()->id && $post->status === 'restricted', 404);
        app(PostCheckPolicy::class)->assertCanContribute($request->user()->id);
        app(PostCheckPolicy::class)->assertOperational();
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_image' => ['sometimes', 'boolean'],
        ]);
        $newText = trim((string) ($data['body'] ?? $post->body));
        $changedText = $newText !== $post->body;
        $changedImage = $request->hasFile('image') || $request->boolean('remove_image');
        if ((! $changedText && ! $changedImage)
            || (in_array($post->check_target, ['text', 'both'], true) && ! $changedText)
            || (in_array($post->check_target, ['image', 'both'], true) && ! $changedImage)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'body' => 'Change the content identified in the restriction reason before reposting.',
            ]);
        }
        $newPath = $request->hasFile('image')
            ? $request->file('image')->store('post-check-images', 'local') : null;
        if ($request->hasFile('image') && ! $newPath) {
            throw \Illuminate\Validation\ValidationException::withMessages(['image' => 'Unable to store the image.']);
        }
        $oldUrl = $post->getRawOriginal('image_path');
        try {
            DB::transaction(function () use ($post, $queue, $newText, $newPath, $request): void {
                $locked = Post::query()->whereKey($post->id)->lockForUpdate()->firstOrFail();
                abort_unless($locked->status === 'restricted' && $locked->author_id === $request->user()->id, 409);
                $locked->body = $newText;
                if ($newPath) {
                    $locked->image_path = '/posts/'.$locked->id.'/check-media/'.basename($newPath);
                } elseif ($request->boolean('remove_image')) {
                    $locked->image_path = null;
                }
                if ($newText === '' && ! $locked->image_path) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['body' => 'Add text or an image.']);
                }
                $locked->forceFill([
                    'status' => 'pending_check', 'check_version' => $locked->check_version + 1,
                    'check_category' => null, 'check_target' => null, 'check_reason' => null,
                    'restricted_at' => null,
                ])->save();
                $queue->dispatch($locked);
            }, 3);
        } catch (\Throwable $exception) {
            if ($newPath) Storage::disk('local')->delete($newPath);
            throw $exception;
        }
        if ($oldUrl && $changedImage) $media->delete($oldUrl, $post->id);
        return response()->json(['status' => 'pending_check'], 202);
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

    /** Restore a post in the current member's own hidden list (idempotent). */
    public function unhide(Request $request, Post $post): RedirectResponse|JsonResponse
    {
        $this->visible($request, $post);
        DB::table('post_hides')->where('post_id', $post->id)
            ->where('user_id', $request->user()->id)->delete();

        return $request->expectsJson() ? response()->json(['hidden' => false]) : back();
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
