<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateReactionRequest;
use App\Http\Requests\Admin\UpdateReactionRequest;
use App\Http\Requests\Admin\UploadReactionIconRequest;
use App\Models\HomePageContent;
use App\Support\Community\ReactionIconCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class ReactionIconController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/ReactionIcons', [
            'icons' => ReactionIconCatalog::definitions(),
            'maxCustom' => ReactionIconCatalog::MAX_CUSTOM,
        ]);
    }

    public function create(CreateReactionRequest $request): RedirectResponse
    {
        $label = trim($request->validated('label'));
        $path = $request->file('icon')->storePublicly('reactions', 'public');
        if (! $path) {
            return back()->withErrors(['icon' => 'Unable to save the image. Please try again.']);
        }

        try {
            $this->mutate($request, function (array &$content) use ($label, $path): void {
                $custom = $content['custom_reactions'] ?? [];
                if (! is_array($custom)) {
                    $custom = [];
                }
                if (count($custom) >= ReactionIconCatalog::MAX_CUSTOM) {
                    throw ValidationException::withMessages(['label' => 'Maximum number of custom reactions reached.']);
                }
                foreach ([...ReactionIconCatalog::LABELS, ...array_map(
                    static fn (array $item): string => (string) ($item['label'] ?? ''), $custom
                )] as $existingLabel) {
                    if (mb_strtolower($existingLabel) === mb_strtolower($label)) {
                        throw ValidationException::withMessages(['label' => 'This reaction name already exists.']);
                    }
                }
                $base = substr(Str::slug($label, '_'), 0, 12);
                if (! preg_match('/\A[a-z][a-z0-9_]{1,11}\z/D', $base) || $base === 'save') {
                    throw ValidationException::withMessages(['label' => 'Choose a name with at least two letters.']);
                }
                $type = $base;
                for ($suffix = 2; isset(ReactionIconCatalog::LABELS[$type]) || isset($custom[$type]) || $type === 'save'; $suffix++) {
                    $number = (string) $suffix;
                    $type = substr($base, 0, 12 - strlen($number)).$number;
                }
                $custom[$type] = ['label' => $label, 'path' => $path, 'active' => true];
                $content['custom_reactions'] = $custom;

            });
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($path);
            throw $exception;
        }
        ReactionIconCatalog::clearCache();

        return to_route('admin.reaction-icons.index')->with('status', "{$label} reaction added.");
    }

    public function update(UpdateReactionRequest $request, string $type): RedirectResponse
    {
        abort_if(isset(ReactionIconCatalog::LABELS[$type]), 404);
        $data = $request->validated();
        $label = trim($data['label']);
        $this->mutate($request, function (array &$content) use ($type, $label, $data): void {
            $custom = $content['custom_reactions'] ?? [];
            abort_unless(isset($custom[$type]), 404);
            foreach ($custom as $otherType => $entry) {
                if ($otherType !== $type && mb_strtolower((string) ($entry['label'] ?? '')) === mb_strtolower($label)) {
                    throw ValidationException::withMessages(['label' => 'This reaction name already exists.']);
                }
            }
            if (in_array(mb_strtolower($label), array_map('strtolower', ReactionIconCatalog::LABELS), true)) {
                throw ValidationException::withMessages(['label' => 'This name belongs to a built-in reaction.']);
            }
            $custom[$type]['label'] = $label;
            $custom[$type]['active'] = (bool) $data['active'];
            $content['custom_reactions'] = $custom;
        });
        ReactionIconCatalog::clearCache();

        return to_route('admin.reaction-icons.index')->with('status', "{$label} settings saved.");
    }

    public function upload(UploadReactionIconRequest $request, string $type): RedirectResponse
    {
        $this->assertKnownType($type);
        $path = $request->file('icon')->storePublicly('reactions', 'public');
        if (! $path) {
            return back()->withErrors(['icon' => 'The icon could not be stored. Please try again.']);
        }

        try {
            $oldPath = $this->setPath($type, $path, $request);
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($path);
            throw $exception;
        }
        ReactionIconCatalog::clearCache();
        if ($oldPath && $oldPath !== $path) {
            Storage::disk('public')->delete($oldPath);
        }

        return to_route('admin.reaction-icons.index')->with('status', "{$type} reaction icon updated.");
    }

    public function restore(Request $request, string $type): RedirectResponse
    {
        abort_unless(isset(ReactionIconCatalog::LABELS[$type]), 404);
        $oldPath = $this->setPath($type, null, $request);
        ReactionIconCatalog::clearCache();
        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return to_route('admin.reaction-icons.index')->with('status', "{$type} reaction restored to default.");
    }

    private function setPath(string $type, ?string $path, Request $request): ?string
    {
        return $this->mutate($request, function (array &$content) use ($type, $path): ?string {
            if (isset(ReactionIconCatalog::LABELS[$type])) {
                $old = $content[$type] ?? null;
                if ($path === null) {
                    unset($content[$type]);
                } else {
                    $content[$type] = $path;
                }
            } else {
                $custom = $content['custom_reactions'] ?? [];
                abort_unless(is_array($custom) && isset($custom[$type]), 404);
                $old = $custom[$type]['path'] ?? null;
                $custom[$type]['path'] = $path;
                $content['custom_reactions'] = $custom;
            }

            return is_string($old) && str_starts_with($old, 'reactions/') ? $old : null;
        });
    }

    /** A locked update prevents multiple admins from replacing unrelated icons in the same JSON record. */
    private function mutate(Request $request, callable $edit): mixed
    {
        return DB::transaction(function () use ($request, $edit): mixed {
            // The key is unique, so even the first concurrent update cannot create two settings records.
            DB::table('home_page_contents')->insertOrIgnore([
                'key' => ReactionIconCatalog::KEY, 'content' => '{}', 'revision' => 0,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $record = HomePageContent::query()->where('key', ReactionIconCatalog::KEY)->lockForUpdate()->firstOrFail();
            $content = $record->content ?? [];
            $result = $edit($content);
            $record->forceFill([
                'content' => $content,
                'revision' => (int) $record->revision + 1,
                'updated_by' => $request->user()->getKey(),
            ])->save();

            return $result;
        }, 3);
    }

    private function assertKnownType(string $type): void
    {
        abort_unless(in_array($type, ReactionIconCatalog::allTypes(), true), 404);
    }
}
