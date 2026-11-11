<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateHomepageRequest;
use App\Http\Requests\Admin\UploadHomepageImageRequest;
use App\Models\HomePageContent;
use App\Models\Post;
use App\Models\Scenario;
use App\Models\User;
use App\Support\Admin\HomepageMasterData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class HomepageController extends Controller
{
    public function dashboard(): Response
    {
        $homepage = HomePageContent::query()->where('key', 'home')->first();

        return Inertia::render('admin/Dashboard', [
            'homepage' => [
                'configured' => $homepage !== null,
                'updatedAt' => $homepage?->updated_at?->toIso8601String(),
                'updatedBy' => $homepage?->updated_by
                    ? User::query()->whereKey($homepage->updated_by)->value('name')
                    : null,
                'visibleSections' => $homepage ? count(array_filter(
                    $homepage->content['sections'] ?? array_fill_keys(['hero', 'pathway', 'scenario', 'community', 'members', 'skills', 'careers'], true),
                    fn ($enabled) => $enabled === true,
                )) : 0,
            ],
            'stats' => [
                'publishedScenarios' => Scenario::query()->where('status', 'published')->count(),
                'publicPosts' => Post::query()->where('status', 'published')->where('visibility', 'public')->count(),
                'publicMembers' => User::query()->where('status', 'active')
                    ->whereHas('profile', fn ($q) => $q->where('visibility', 'public'))->count(),
            ],
        ]);
    }

    public function edit(): Response
    {
        $requested = request()->query('section', 'hero');
        $selectedSection = in_array($requested, ['hero', 'pathway', 'scenario', 'community', 'members', 'skills', 'careers'], true) ? $requested : 'hero';
        $homepage = HomePageContent::query()->where('key', 'home')->first();

        if (! $homepage) {
            return Inertia::render('admin/Homepage', [
                'configured' => false,
                'selectedSection' => $selectedSection,
                'content' => null,
                'version' => 0,
                'options' => ['scenarios' => [], 'posts' => [], 'members' => []],
                'masterOptions' => HomepageMasterData::options(),
            ]);
        }

        $content = $homepage->content ?? [];
        $content['sections'] = array_replace(array_fill_keys(
            ['hero', 'pathway', 'scenario', 'community', 'members', 'skills', 'careers'], true,
        ), $content['sections'] ?? []);
        $content['scenario']['featured_id'] ??= null;
        $content['community']['featured_ids'] ??= [];
        $content['members']['featured_ids'] ??= [];
        $content['hero']['primary_url'] ??= '/register';
        $content['hero']['caption_learn'] ??= "Learn\n& practise";
        $content['hero']['caption_discuss'] ??= "Discuss\n& share";
        $content['hero']['caption_career'] ??= "Grow\nyour career";
        $content['hero']['secondary_url'] ??= '/community';
        $content['scenario']['view_all_label'] ??= 'View all';
        $content['scenario']['empty_message'] ??= 'Practical scenarios are being prepared for the community.';
        $content['scenario']['empty_responses_message'] ??= 'Be the first to share your approach.';
        $content['community']['empty_message'] ??= 'The discussion is just getting started. Share your first lesson or question to help others grow.';
        $content['members']['empty_message'] ??= 'Be among the first members to join the community.';
        $content['careers']['empty_message'] ??= 'Verified job opportunities will appear here when the careers module is launched.';
        $content['careers']['jobs_view_all_label'] ??= 'View all jobs';
        $content['careers']['show_sample_opportunities'] ??= false;

        // Only expose editable fields. Demo curation and internal metadata stay server-side.
        unset($content['demo_scenario_engagement']);
        unset($content['scenario']['demo_response_emails'], $content['community']['demo_post_emails'], $content['members']['demo_emails']);

        return Inertia::render('admin/Homepage', [
            'configured' => true,
            'selectedSection' => $selectedSection,
            'content' => $content,
            'version' => (int) $homepage->revision,
            'masterOptions' => HomepageMasterData::options(),
            'options' => [
                'scenarios' => Scenario::query()->where('status', 'published')->latest('published_at')
                    ->limit(40)->get(['id', 'title'])->toArray(),
                'posts' => Post::query()->where('status', 'published')->where('visibility', 'public')
                    ->latest('published_at')->limit(40)->get(['id', 'title', 'body'])
                    ->map(fn (Post $post) => ['id' => $post->id, 'title' => mb_strimwidth($post->title ?: $post->body, 0, 90, '…')])->all(),
                'members' => User::query()->where('status', 'active')
                    ->when(config('pm-circle.email_verification_required'), fn ($q) => $q->whereNotNull('email_verified_at'))
                    ->whereHas('profile', fn ($q) => $q->where('visibility', 'public'))
                    ->latest('id')->limit(40)->get(['id', 'name'])->toArray(),
            ],
        ]);
    }

    public function update(UpdateHomepageRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request): void {
            $homepage = HomePageContent::query()->where('key', 'home')->lockForUpdate()->firstOrFail();
            if ((int) $homepage->revision !== (int) $validated['version']) {
                throw ValidationException::withMessages([
                    'version' => 'Another administrator has saved changes to the homepage. Reload the editor to review their changes before saving again.',
                ]);
            }

            $content = $homepage->content ?? [];
            foreach ($validated['content'] as $key => $value) {
                // Preserve internal demo curation fields not exposed for editing.
                $content[$key] = is_array($value)
                    ? array_replace($content[$key] ?? [], $value)
                    : $value;
            }
            $homepage->forceFill(['content' => $content, 'updated_by' => $request->user()->id, 'revision' => $homepage->revision + 1])->save();
        });

        $section = $request->query('section');
        $parameters = in_array($section, ['hero', 'pathway', 'scenario', 'community', 'members', 'skills', 'careers'], true)
            ? ['section' => $section] : [];

        return to_route('admin.homepage.edit', $parameters)->with('status', 'Homepage changes saved successfully.');
    }

    public function upload(UploadHomepageImageRequest $request): JsonResponse
    {
        $path = $request->file('image')->storePublicly('homepage', 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }
}
