<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdatePublicPageRequest;
use App\Models\HomePageContent;
use App\Support\Admin\PublicPageContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class PublicPageController extends Controller
{
    public function edit(Request $request, string $page): Response
    {
        $record = HomePageContent::query()->where('key', PublicPageContent::key($page))->first();
        $content = PublicPageContent::resolve($page, $record?->content ?? []);
        $section = $request->query('section', 'banner');
        abort_unless(is_string($section) && array_key_exists($section, $content), 404);
        return Inertia::render('admin/PublicPageEditor', ['page' => $page, 'section' => $section, 'content' => $content[$section], 'version' => (int) ($record?->revision ?? 0)]);
    }

    public function update(UpdatePublicPageRequest $request, string $page, string $section): RedirectResponse
    {
        $data = $request->validated();
        DB::transaction(function () use ($request, $page, $section, $data): void {
            $key = PublicPageContent::key($page);
            // Create a revision-zero row atomically, even when two admins first save concurrently.
            DB::table('home_page_contents')->insertOrIgnore(['key' => $key, 'content' => '{}', 'revision' => 0, 'created_at' => now(), 'updated_at' => now()]);
            $record = HomePageContent::query()->where('key', $key)->lockForUpdate()->firstOrFail();
            if ((int) $record->revision !== (int) $data['version']) throw ValidationException::withMessages(['version' => 'This page changed. Reload before saving.']);
            $content = $record->content ?? [];
            foreach (PublicPageContent::defaults($page)[$section] as $field => $default) {
                if (is_bool($default)) $data['content'][$field] = (bool) $data['content'][$field];
            }
            $content[$section] = $data['content'];
            $record->forceFill(['content' => $content, 'revision' => $record->revision + 1, 'updated_by' => $request->user()->id])->save();
        }, 3);
        PublicPageContent::clear($page);
        return to_route('admin.public-pages.edit', ['page' => $page, 'section' => $section])->with('status', 'Page section saved.');
    }
}
