<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreMasterDataOptionRequest;
use App\Http\Requests\Admin\UpdateMasterDataOptionRequest;
use App\Models\MasterDataOption;
use App\Support\Admin\HomepageMasterData;
use Illuminate\Http\RedirectResponse;
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
        $groups = $navigation ? HomepageMasterData::NAVIGATION_GROUPS : HomepageMasterData::editableDropdownGroups();
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

        if ($request->routeIs('admin.navigation.store')) {
            \App\Support\Admin\SiteNavigation::clearCache();
        }

        return to_route($request->routeIs('admin.navigation.store') ? 'admin.navigation.index' : 'admin.master-data.index', ['category' => $values['category']])->with('status', 'Value added.');
    }

    public function update(UpdateMasterDataOptionRequest $request, MasterDataOption $masterDataOption): RedirectResponse
    {
        $groups = $request->routeIs('admin.navigation.update') ? HomepageMasterData::NAVIGATION_GROUPS : HomepageMasterData::editableDropdownGroups();
        abort_unless(array_key_exists($masterDataOption->category, $groups), 404);
        $values = $request->validated();
        $masterDataOption->update($values);
        if ($request->routeIs('admin.navigation.update')) {
            \App\Support\Admin\SiteNavigation::clearCache();
        }

        return to_route($request->routeIs('admin.navigation.update') ? 'admin.navigation.index' : 'admin.master-data.index', ['category' => $masterDataOption->category])->with('status', 'Value updated.');
    }

}
