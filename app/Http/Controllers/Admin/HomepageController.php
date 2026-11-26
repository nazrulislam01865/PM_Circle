<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateHomepageRequest;
use App\Http\Requests\Admin\UploadHomepageImageRequest;
use App\Models\HomePageContent;
use App\Models\Post;
use App\Models\Scenario;
use App\Models\User;
use App\Support\Home\HomepagePresentation;
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
        $sections = HomepagePresentation::resolve($homepage?->content ?? []);

        return Inertia::render('admin/Dashboard', [
            'homepage' => [
                'configured' => $homepage !== null,
                'updatedAt' => $homepage?->updated_at?->toIso8601String(),
                'updatedBy' => $homepage?->updated_by
                    ? User::query()->whereKey($homepage->updated_by)->value('name')
                    : null,
                'visibleSections' => $homepage ? count(array_filter($sections, fn ($section) => $section['enabled'])) + 1 : 0, // Shared footer.
            ],
            'stats' => [
                'publishedScenarios' => Scenario::query()->where('status', 'published')->count(),
                'publicPosts' => Post::query()->where('status', 'published')->where('visibility', 'public')->count(),
                'publicMembers' => User::query()->where('status', 'active')
                    ->whereHas('profile', fn ($q) => $q->where('visibility', 'public'))->count(),
            ],
        ]);
    }

    public function edit(): Response|RedirectResponse
    {
        $requested = request()->query('section', 'hero');
        if ($requested === 'footer') return to_route('admin.footer.edit');
        $aliases = ['pathway'=>'certification', 'careers'=>'resume', 'career_features'=>'resume'];
        $requested = is_string($requested) ? ($aliases[$requested] ?? $requested) : 'hero';
        $selected = array_key_exists($requested, HomepagePresentation::defaults()) ? $requested : 'hero';
        $homepage = HomePageContent::query()->where('key', 'home')->first();
        $content = HomepagePresentation::resolve($homepage?->content ?? []);
        return Inertia::render('admin/Homepage', [
            'configured' => $homepage !== null,
            'selectedSection' => $selected,
            'content' => $content,
            'defaults' => HomepagePresentation::defaults(),
            'version' => (int) ($homepage?->revision ?? 0),
            'options' => [
                'scenarios' => $homepage ? Scenario::query()->where('status', 'published')->where('published_at', '<=', now())
                    ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
                    ->orderByRaw('CASE WHEN id = ? THEN 0 ELSE 1 END', [$content['scenario']['featured_id'] ?? 0])
                    ->latest('published_at')->limit(40)->get(['id', 'title'])->toArray() : [],
                'members' => $homepage ? User::query()->where('status', 'active')->where('is_admin', false)
                    ->when(config('pm-circle.email_verification_required'), fn ($q) => $q->whereNotNull('email_verified_at'))
                    ->whereHas('profile', fn ($q) => $q->where('visibility', 'public'))
                    ->orderByRaw('CASE WHEN id IN (?, ?) THEN 0 ELSE 1 END', array_pad($content['members']['featured_ids'], 2, 0))
                    ->latest('id')->limit(40)->get(['id', 'name'])->toArray() : [],
            ],
        ]);
    }

    public function update(UpdateHomepageRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        DB::transaction(function () use ($validated, $request): void {
            $homepage = HomePageContent::query()->where('key', 'home')->lockForUpdate()->firstOrFail();
            if ((int) $homepage->revision !== (int) $validated['version']) {
                throw ValidationException::withMessages(['version' => 'Another administrator saved homepage changes. Reload before saving again.']);
            }
            $content = $homepage->content ?? [];
            $section = $validated['content'];
            $section['enabled'] = (bool) $section['enabled'];
            if (isset($section['limit'])) $section['limit'] = (int) $section['limit'];
            if (isset($section['featured_id'])) $section['featured_id'] = (int) $section['featured_id'];
            if (isset($section['featured_ids'])) $section['featured_ids'] = array_map('intval', $section['featured_ids']);
            // Preserve unrelated sections and legacy records for rollback. Replace only the selected section.
            $content['homepage_v2'][$validated['section']] = $section;
            $homepage->forceFill(['content'=>$content, 'updated_by'=>$request->user()->id, 'revision'=>$homepage->revision + 1])->save();
        });
        return to_route('admin.homepage.edit', ['section'=>$validated['section']])->with('status', 'Homepage section saved successfully.');
    }

    public function upload(UploadHomepageImageRequest $request): JsonResponse
    {
        $path = $request->file('image')->storePublicly('homepage', 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }
}
