<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Achievements\Services\BadgeCatalog;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveAchievementBadgeRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

final class AchievementBadgeController extends Controller
{
    public function index(Request $request, BadgeCatalog $catalog): Response
    {
        $request->validate(['view' => ['nullable', 'string'], 'badge' => ['nullable', 'string', 'max:64'], 'metric' => ['nullable', 'string', 'max:64'], 'work' => ['nullable', 'string', 'max:160']]);
        $view = $request->query('view', 'badges');
        abort_unless(in_array($view, ['badges', 'editor', 'works', 'awards', 'preview'], true), 404);
        $badges = $catalog->definitions();
        $badge = null;
        if ($view === 'editor' && $request->filled('badge')) {
            $badge = collect($badges)->firstWhere('id', $request->query('badge'));
            abort_unless($badge, 404);
        }
        $counts = $view === 'badges' ? DB::table('achievement_awards')->whereNull('revoked_at')->groupBy('badge_id')->selectRaw('badge_id, count(*) as total')->pluck('total', 'badge_id')->map(fn ($count) => (int) $count)->all() : [];
        $awards = $view === 'awards' ? DB::table('achievement_awards as a')->join('users as u', 'u.id', '=', 'a.user_id')->orderByDesc('a.id')->select('a.id', 'a.snapshot', 'a.earned_at', 'a.created_at', 'a.revoked_at', 'a.revocation_reason', 'u.name')->paginate(25)->withQueryString()->through(function ($row) {
            $snapshot = json_decode($row->snapshot, true, 512, JSON_THROW_ON_ERROR);
            return ['id' => $row->id, 'member' => $row->name, 'badge' => $snapshot['name'], 'earnedAt' => $row->earned_at, 'recordedAt' => $row->created_at, 'revokedAt' => $row->revoked_at, 'reason' => $row->revocation_reason];
        }) : null;
        return Inertia::render('admin/AchievementBadges', [
            'view' => $view, 'badges' => $badges, 'badge' => $badge, 'counts' => $counts,
            'works' => in_array($view, ['editor', 'works', 'preview'], true) ? $catalog->works() : [],
            'metrics' => $catalog->metrics(), 'awards' => $awards,
            'preset' => $request->only(['metric', 'work']), 'notice' => session('status'),
        ]);
    }

    public function save(SaveAchievementBadgeRequest $request, BadgeCatalog $catalog, ?string $badge = null): RedirectResponse
    {
        $data = $request->validated();
        $metrics = collect($catalog->metrics())->keyBy('value');
        $targets = [];
        $labels = [];
        $valid = true;
        if ($data['mode'] === 'completion') {
            $works = collect($catalog->works())->keyBy('id');
            foreach ($data['targets'] ?? [] as $key) {
                $work = $works->get($key) ?? $works->firstWhere('source', $key);
                if (! $work) throw ValidationException::withMessages(['targets' => 'A selected work item is no longer available.']);
                $targets[$work['source']] = true;
                $labels[$work['source']] = $work['title'];
                $valid = $valid && $work['supported'];
            }
            $targets = array_keys($targets);
            $data['target'] = match ($data['match']) { 'all' => max(1, count($targets)), 'any' => 1, default => $data['required'] };
            $valid = $valid && count($targets) >= $data['target'];
        } else {
            $valid = $metrics[$data['metric']]['supported'] && ($data['metric'] !== 'profile' || $data['target'] <= 100);
        }
        if ($data['publishStatus'] === 'active' && ! $valid) throw ValidationException::withMessages(['targets' => 'Choose a supported completion source and a valid requirement before publishing.']);
        $path = $request->file('image')?->store('achievement-badges', 'public');
        try {
            DB::transaction(function () use ($request, $badge, $data, $metrics, $targets, $labels, $path): void {
                $current = $badge ? DB::table('achievement_badges')->where('id', $badge)->lockForUpdate()->first() : null;
                abort_if($badge && ! $current, 404);
                if ($current && (int) $current->version !== (int) ($data['version'] ?? 0)) throw ValidationException::withMessages(['version' => 'This badge changed. Reload before saving.']);
                $old = $current ? json_decode($current->definition, true, 512, JSON_THROW_ON_ERROR) : [];
                $id = $badge ?? (string) Str::uuid();
                $definition = [
                    'id' => $id, 'name' => $data['name'], 'category' => $data['category'], 'description' => $data['description'] ?? '',
                    'mode' => $data['mode'], 'metric' => $data['mode'] === 'completion' ? 'work' : $data['metric'],
                    'unit' => $data['mode'] === 'completion' ? 'selected work completed' : $metrics[$data['metric']]['label'],
                    'target' => (int) $data['target'], 'tier' => (int) $data['tier'], 'art' => $data['art'], 'newBadge' => $old['newBadge'] ?? false,
                    'targets' => $targets, 'targetLabels' => array_values($labels), 'match' => $data['match'], 'required' => (int) $data['required'],
                    'artwork' => $path ?: (($data['removeArtwork'] ?? false) ? null : ($old['artwork'] ?? null)),
                ];
                $values = ['definition' => json_encode($definition, JSON_THROW_ON_ERROR), 'status' => $data['publishStatus'], 'updated_at' => now()];
                if ($current) DB::table('achievement_badges')->where('id', $id)->update([...$values, 'version' => $current->version + 1]);
                else DB::table('achievement_badges')->insert([...$values, 'id' => $id, 'position' => (int) DB::table('achievement_badges')->max('position') + 1, 'created_at' => now()]);
            });
        } catch (Throwable $error) {
            if ($path) Storage::disk('public')->delete($path);
            throw $error;
        }
        return to_route('admin.achievements.index')->with('status', 'Badge saved.');
    }

    public function status(Request $request, string $badge): RedirectResponse
    {
        // Activation always goes through the validated editor; no status shortcut bypasses verification.
        $data = $request->validate(['status' => ['required', 'in:paused,archived,draft'], 'version' => ['required', 'integer']]);
        $changed = DB::table('achievement_badges')->where('id', $badge)->where('version', $data['version'])->update(['status' => $data['status'], 'version' => DB::raw('version + 1'), 'updated_at' => now()]);
        if (! $changed) throw ValidationException::withMessages(['version' => 'This badge changed. Reload and try again.']);
        return back()->with('status', 'Badge status updated.');
    }

    public function duplicate(Request $request, string $badge): RedirectResponse
    {
        $row = DB::table('achievement_badges')->where('id', $badge)->first();
        abort_unless($row, 404);
        $data = json_decode($row->definition, true, 512, JSON_THROW_ON_ERROR);
        $id = (string) Str::uuid();
        $data['id'] = $id;
        $data['name'] = Str::limit($data['name'], 110, '').' (copy)';
        $data['newBadge'] = false;
        DB::table('achievement_badges')->insert(['id' => $id, 'definition' => json_encode($data, JSON_THROW_ON_ERROR), 'status' => 'draft', 'position' => (int) DB::table('achievement_badges')->max('position') + 1, 'created_at' => now(), 'updated_at' => now()]);
        return to_route('admin.achievements.index', ['view' => 'editor', 'badge' => $id]);
    }

    public function destroy(string $badge): RedirectResponse
    {
        DB::transaction(function () use ($badge): void {
            $row = DB::table('achievement_badges')->where('id', $badge)->lockForUpdate()->first();
            abort_unless($row, 404);
            if (DB::table('achievement_awards')->where('badge_id', $badge)->exists()) throw ValidationException::withMessages(['badge' => 'This badge has award history. Archive it instead.']);
            DB::table('achievement_badges')->where('id', $badge)->delete();
        });
        return back()->with('status', 'Badge deleted.');
    }

    public function customWork(Request $request, BadgeCatalog $catalog): RedirectResponse
    {
        $data = $request->validate(['title' => ['required', 'string', 'max:180'], 'source' => ['required', 'string', 'max:160']]);
        $source = collect($catalog->works(false))->firstWhere('id', $data['source']);
        if (! $source || ! $source['supported']) throw ValidationException::withMessages(['source' => 'Choose a verified completion source.']);
        DB::table('achievement_work_aliases')->insert(['title' => $data['title'], 'source' => $source['source'], 'created_at' => now(), 'updated_at' => now()]);
        return back()->with('status', 'Custom work added.');
    }

    public function revoke(Request $request, int $award): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        DB::table('achievement_awards')->where('id', $award)->whereNull('revoked_at')->update(['revoked_at' => now(), 'revocation_reason' => $data['reason'], 'revoked_by' => $request->user()->id]);
        return back()->with('status', 'Award revoked.');
    }
}
