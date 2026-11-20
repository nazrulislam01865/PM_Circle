<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSiteFooterRequest;
use App\Models\HomePageContent;
use App\Support\Admin\HomepageMasterData;
use App\Support\Exam\PmpPublicContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class SiteFooterController extends Controller
{
    public function edit(): Response
    {
        $record = HomePageContent::query()->where('key', PmpPublicContent::KEY)->first(['content', 'revision']);
        $content = PmpPublicContent::withDefaults($record?->content ?? []);

        return Inertia::render('admin/SiteFooterEditor', [
            'footer' => $content['footer'],
            'version' => (int) ($record?->revision ?? 0),
            'routeChoices' => collect(HomepageMasterData::options(false, ['footer_menu'])['footer_menu'] ?? [])
                ->map(fn (array $option) => ['value' => $option['value'], 'label' => $option['label']])->values()->all(),
        ]);
    }

    public function update(UpdateSiteFooterRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        foreach (['social', 'social_icons'] as $group) {
            foreach ($validated['footer'][$group] as $network => $value) {
                $validated['footer'][$group][$network] = $value ?? '';
            }
        }

        DB::transaction(function () use ($validated, $request): void {
            $record = HomePageContent::query()->where('key', PmpPublicContent::KEY)->lockForUpdate()->first();
            if ((int) ($record?->revision ?? 0) !== (int) $validated['version']) {
                throw ValidationException::withMessages(['version' => 'The footer was updated by another administrator. Reload before saving again.']);
            }
            $content = $record?->content ?? [];
            // Preserve every unrelated PMP field exactly as stored.
            $content['footer'] = $validated['footer'];
            $record ??= new HomePageContent(['key' => PmpPublicContent::KEY]);
            $record->forceFill([
                'content' => $content,
                'revision' => (int) ($record->revision ?? 0) + 1,
                'updated_by' => $request->user()->getKey(),
            ])->save();
        }, 3);

        PmpPublicContent::clearCache();

        return to_route('admin.footer.edit')->with('status', 'Shared footer changes saved.');
    }
}
