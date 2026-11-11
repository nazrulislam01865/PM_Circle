<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreMasterDataOptionRequest;
use App\Http\Requests\Admin\UpdateMasterDataOptionRequest;
use App\Models\HomePageContent;
use App\Models\MasterDataOption;
use App\Support\Admin\HomepageMasterData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use App\Http\Requests\Admin\UploadMasterIconRequest;
use Inertia\Inertia;
use Inertia\Response;

final class MasterDataController extends Controller
{
    public function index(): Response
    {
        return $this->catalog(false);
    }

    public function navigationIndex(): Response
    {
        return $this->catalog(true);
    }

    private function catalog(bool $navigation): Response
    {
        $groups = $navigation ? HomepageMasterData::NAVIGATION_GROUPS : HomepageMasterData::DROPDOWN_GROUPS;
        $selected = request()->query('category');
        if (! is_string($selected) || ! array_key_exists($selected, $groups)) {
            $selected = array_key_first($groups);
        }

        return Inertia::render('admin/MasterData', [
            'categories' => HomepageMasterData::categories($navigation),
            'selectedCategory' => $selected,
            'navigation' => $navigation,
            'options' => HomepageMasterData::options(includeInactive: true, categories: array_keys($groups)),
        ]);
    }

    public function store(StoreMasterDataOptionRequest $request): RedirectResponse
    {
        $values = $request->validated();
        MasterDataOption::query()->create([
            ...$values,
            'sort_order' => min(65535, (int) MasterDataOption::query()->where('category', $values['category'])->max('sort_order') + 10),
            'is_active' => true,
        ]);

        return to_route($request->routeIs('admin.navigation.store') ? 'admin.navigation.index' : 'admin.master-data.index', ['category' => $values['category']])->with('status', 'Value added.');
    }

    public function update(UpdateMasterDataOptionRequest $request, MasterDataOption $masterDataOption): RedirectResponse
    {
        $groups = $request->routeIs('admin.navigation.update') ? HomepageMasterData::NAVIGATION_GROUPS : HomepageMasterData::DROPDOWN_GROUPS;
        abort_unless(array_key_exists($masterDataOption->category, $groups), 404);
        $values = $request->validated();
        if (! $values['is_active'] && $masterDataOption->is_active) {
            $content = HomePageContent::query()->where('key', 'home')->first(['content'])?->content ?? [];
            if (HomepageMasterData::inUse($masterDataOption, $content)) {
                throw ValidationException::withMessages([
                    'is_active' => 'This option is currently used on the homepage. Replace it there before disabling it.',
                ]);
            }
        }
        $masterDataOption->update($values);

        return to_route($request->routeIs('admin.navigation.update') ? 'admin.navigation.index' : 'admin.master-data.index', ['category' => $masterDataOption->category])->with('status', 'Value updated.');
    }

    public function uploadIcon(UploadMasterIconRequest $request, MasterDataOption $masterDataOption): RedirectResponse
    {
        abort_unless(array_key_exists($masterDataOption->category, HomepageMasterData::ICON_VALUES), 404);
        $path = $request->file('icon')->storePublicly('homepage-icons', 'public');
        $previousPath = $masterDataOption->icon_path;
        $masterDataOption->update(['icon_path' => $path]);
        if ($previousPath && str_starts_with($previousPath, 'homepage-icons/')) {
            Storage::disk('public')->delete($previousPath);
        }
        Cache::forget('pm-circle:homepage-icon-assets');

        return to_route('admin.master-data.index', ['category' => $masterDataOption->category])
            ->with('status', 'Icon uploaded. The public homepage now uses the uploaded image.');
    }

    public function removeIcon(MasterDataOption $masterDataOption): RedirectResponse
    {
        abort_unless(array_key_exists($masterDataOption->category, HomepageMasterData::ICON_VALUES), 404);
        $previousPath = $masterDataOption->icon_path;
        $masterDataOption->update(['icon_path' => null]);
        if ($previousPath && str_starts_with($previousPath, 'homepage-icons/')) {
            Storage::disk('public')->delete($previousPath);
        }
        Cache::forget('pm-circle:homepage-icon-assets');

        return to_route('admin.master-data.index', ['category' => $masterDataOption->category])
            ->with('status', 'Default icon restored.');
    }
}
