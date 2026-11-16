<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Billing\Services\ProfileCompletionRewardService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateProfileRewardSettingsRequest;
use App\Models\ProfileCompletionReward;
use App\Models\ProfileRewardSetting;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class ProfileRewardSettingsController extends Controller
{
    public function edit(ProfileCompletionRewardService $rewards): Response
    {
        $settings = $rewards->settings();

        return Inertia::render('admin/ProfileRewards', [
            'settings' => $settings->only(['enabled', 'discount_type', 'discount_value', 'currency', 'validity_days']),
            'stats' => [
                'issued' => ProfileCompletionReward::query()->count(),
                'redeemed' => ProfileCompletionReward::query()->whereNotNull('redeemed_at')->count(),
            ],
        ]);
    }

    public function update(UpdateProfileRewardSettingsRequest $request, ProfileCompletionRewardService $rewards): RedirectResponse
    {
        $values = $request->validated();

        ProfileRewardSetting::query()->updateOrCreate(['id' => 1], [
            ...$values,
            'updated_by' => $request->user()->getKey(),
        ]);
        $rewards->clearSettingsCache();

        return to_route('admin.profile-rewards.edit')->with('status', 'Profile reward settings saved. Previously issued codes keep their original discount and expiry.');
    }
}
