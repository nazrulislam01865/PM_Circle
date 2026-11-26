<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdatePmpPublicPageRequest;
use App\Models\HomePageContent;
use App\Support\Exam\PmpPublicContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class PmpPublicPageController extends Controller
{
    private const SECTION_KEYS = ['hero', 'benefits', 'sample', 'ai', 'plans', 'faq', 'video', 'testimonials', 'footer'];

    public function edit(): Response|RedirectResponse
    {
        $section = request()->query('section', 'hero');
        if ($section === 'footer') {
            return to_route('admin.footer.edit');
        }

        $record = HomePageContent::query()->where('key', PmpPublicContent::KEY)->first(['content', 'revision']);
        $selectedSection = is_string($section) && in_array($section, self::SECTION_KEYS, true) ? $section : 'hero';

        return Inertia::render('admin/PmpPublicPage', [
            'selectedSection' => $selectedSection,
            'content' => $record ? PmpPublicContent::withDefaults($record->content ?? []) : PmpPublicContent::defaults(),
            'version' => (int) ($record?->revision ?? 0),
        ]);
    }

    public function update(UpdatePmpPublicPageRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        // Public sample selection is managed in PMP exam settings, not in this page content.
        $validated['content']['sample']['question_id'] = null;

        DB::transaction(function () use ($validated, $request): void {
            $record = HomePageContent::query()->where('key', PmpPublicContent::KEY)->lockForUpdate()->first();
            if ((int) ($record?->revision ?? 0) !== (int) $validated['version']) {
                throw ValidationException::withMessages(['version' => 'Another administrator saved this page. Reload to review the latest changes.']);
            }
            $record ??= new HomePageContent(['key' => PmpPublicContent::KEY]);
            $content = $validated['content'];
            // The shared footer has its own editor. Never overwrite its saved data here.
            foreach (['footer', \App\Support\Admin\SiteFooterContent::KEY] as $key) {
                if (array_key_exists($key, $record->content ?? [])) {
                    $content[$key] = $record->content[$key];
                }
            }
            $record->forceFill([
                'content' => $content,
                'revision' => (int) ($record->revision ?? 0) + 1,
                'updated_by' => $request->user()->getKey(),
            ])->save();
        }, 3);

        // Admin saves must become visible in the shared footer immediately.
        PmpPublicContent::clearCache();

        $section = $request->query('section');
        $parameters = is_string($section) && in_array($section, self::SECTION_KEYS, true) ? ['section' => $section] : [];

        return to_route('admin.pmp-public.edit', $parameters)->with('status', 'PMP public page changes saved.');
    }
}
