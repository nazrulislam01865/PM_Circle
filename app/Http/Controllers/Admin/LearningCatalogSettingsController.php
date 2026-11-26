<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Learning\CatalogSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class LearningCatalogSettingsController extends Controller
{
    public function edit(Request $request, CatalogSettings $settings): Response
    {
        abort_unless($request->user()?->is_admin, 403);
        return Inertia::render('admin/LearningCatalogSettings', ['settings' => $settings->get()]);
    }

    public function update(Request $request, CatalogSettings $settings): RedirectResponse
    {
        abort_unless($request->user()?->is_admin, 403);
        $rules = [];
        foreach (CatalogSettings::DEFAULTS as $key => $value) {
            $rules[$key] = is_bool($value) ? ['required', 'boolean'] : ['required', 'string', str_contains($key, 'description') ? 'max:500' : 'max:120'];
        }
        $settings->save($request->validate($rules));
        return back()->with('status', 'Browse Courses settings saved.');
    }
}
