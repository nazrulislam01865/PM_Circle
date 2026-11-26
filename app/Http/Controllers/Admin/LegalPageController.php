<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateLegalPageRequest;
use App\Support\Legal\LegalPages;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LegalPageController extends Controller
{
    public function edit(string $document): Response
    {
        $page = DB::table('legal_pages')->where('document', $document)->first();
        abort_unless($page, 404);
        $history = DB::table('legal_page_versions')->where('document', $document)
            ->orderByDesc('id')->limit(30)->get(['id', 'published_at'])->map(fn ($row) => [
                'version' => LegalPages::version($row->id), 'published_at' => (string) $row->published_at,
            ]);

        return Inertia::render('admin/LegalPage', [
            'document' => $document,
            'draft' => LegalPages::decode($page->draft),
            'revision' => (int) $page->revision,
            'publishedVersion' => $page->published_version_id ? LegalPages::version($page->published_version_id) : null,
            'history' => $history,
        ]);
    }

    public function update(UpdateLegalPageRequest $request, string $document): RedirectResponse
    {
        $data = $request->validated();
        foreach ($data['content']['sections'] as &$section) {
            if (array_key_exists('show_in_toc', $section)) {
                $section['show_in_toc'] = (bool) $section['show_in_toc'];
            }
        }
        unset($section);
        DB::transaction(function () use ($request, $document, $data): void {
            $page = $this->lockedPage($document, $data['revision']);
            DB::table('legal_pages')->where('document', $document)->update([
                'draft' => json_encode($data['content'], JSON_THROW_ON_ERROR),
                'revision' => $page->revision + 1, 'updated_by' => $request->user()->id, 'updated_at' => now(),
            ]);
        });
        return to_route('admin.legal.edit', ['document' => $document])->with('status', 'Draft saved. The public page is unchanged.');
    }

    public function publish(Request $request, string $document): RedirectResponse
    {
        $data = $request->validate(['revision' => ['required', 'integer', 'min:1'], 'confirmed' => ['accepted']]);
        DB::transaction(function () use ($request, $document, $data): void {
            $page = $this->lockedPage($document, $data['revision']);
            if ($page->published_version_id) {
                $previous = DB::table('legal_page_versions')->where('id', $page->published_version_id)->where('document', $document)->value('content');
                if ($previous !== null && LegalPages::decode($previous) === LegalPages::decode($page->draft)) {
                    throw ValidationException::withMessages(['revision' => 'This exact content is already published.']);
                }
            }
            $id = DB::table('legal_page_versions')->insertGetId([
                'document' => $document, 'content' => $page->draft,
                'published_by' => $request->user()->id, 'published_at' => now(),
            ]);
            DB::table('legal_pages')->where('document', $document)->update([
                'published_version_id' => $id, 'revision' => $page->revision + 1,
                'updated_by' => $request->user()->id, 'updated_at' => now(),
            ]);
        });
        return to_route('admin.legal.edit', ['document' => $document])->with('status', 'New version published.');
    }

    private function lockedPage(string $document, int $revision): object
    {
        $page = DB::table('legal_pages')->where('document', $document)->lockForUpdate()->first();
        abort_unless($page, 404);
        if ((int) $page->revision !== $revision) {
            throw ValidationException::withMessages(['revision' => 'Another administrator changed this document. Reload before editing or publishing.']);
        }
        return $page;
    }
}
