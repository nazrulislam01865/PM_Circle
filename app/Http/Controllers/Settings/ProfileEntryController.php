<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileEntryRequest;
use App\Models\Certification;
use App\Models\Education;
use App\Models\ProfileProject;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProfileEntryController extends Controller
{
    public function saveProject(ProfileEntryRequest $request): RedirectResponse
    {
        $attributes = $request->validated();
        $project = $this->ownedEntry($request, ProfileProject::class, $attributes);

        // Keep the featured designation consistent if several projects are saved.
        DB::transaction(function () use ($request, $attributes, $project): void {
            if ($attributes['is_featured']) {
                $request->user()->profileProjects()->where('is_featured', true)
                    ->when($project->exists, fn ($query) => $query->where('id', '!=', $project->getKey()))
                    ->update(['is_featured' => false]);
            }

            $project->fill($attributes);
            $project->user_id = $request->user()->id;
            $project->save();
        });

        return $this->success('Project saved.');
    }

    public function saveEducation(ProfileEntryRequest $request): RedirectResponse
    {
        $attributes = $request->validated();
        $entry = $this->ownedEntry($request, Education::class, $attributes);
        $entry->fill($attributes);
        $entry->user_id = $request->user()->id;
        $entry->save();

        return $this->success('Education saved.');
    }

    public function saveCertification(ProfileEntryRequest $request): RedirectResponse
    {
        $attributes = $request->validated();
        $entry = $this->ownedEntry($request, Certification::class, $attributes);
        $entry->fill($attributes);
        $entry->user_id = $request->user()->id;
        // Editing a self-reported credential does not confer verification.
        $entry->verified = false;
        $entry->save();

        return $this->success('Certification saved.');
    }

    public function deleteProject(Request $request, ProfileProject $project): RedirectResponse
    {
        abort_unless($project->user_id === $request->user()->id, 403);
        $project->delete();

        return $this->success('Project removed.');
    }

    public function deleteEducation(Request $request, Education $education): RedirectResponse
    {
        abort_unless($education->user_id === $request->user()->id, 403);
        $education->delete();

        return $this->success('Education removed.');
    }

    public function deleteCertification(Request $request, Certification $certification): RedirectResponse
    {
        abort_unless($certification->user_id === $request->user()->id, 403);
        $certification->delete();

        return $this->success('Certification removed.');
    }

    private function ownedEntry(ProfileEntryRequest $request, string $model, array &$attributes): ProfileProject|Education|Certification
    {
        $id = $attributes['id'] ?? null;
        unset($attributes['id']);

        return $id ? $model::query()->where('user_id', $request->user()->id)->findOrFail($id) : new $model();
    }

    private function success(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return redirect()->route('profile.edit', ['tab' => 'edit']);
    }
}
