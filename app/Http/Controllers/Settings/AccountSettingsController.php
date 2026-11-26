<?php

namespace App\Http\Controllers\Settings;

use App\Domain\Identity\Services\ProfileFieldPrivacy;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AccountSettingsRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class AccountSettingsController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $user->loadMissing('profile');
        $profile = $user->profile;
        $values = [];
        $stored = $user->account_preferences ?? [];
        $pages = config('account_settings');
        foreach ($pages as $page) {
            foreach ($page[3] as $group) {
                foreach ($group[1] as $field) {
                    if ($field['mode'] === 'preference') {
                        $values[$field['id']] = $stored[$field['id']] ?? $field['value'];
                    }
                }
            }
        }
        $values += [
            'name' => $user->name, 'email' => $user->email, 'phone' => $profile?->phone ?? '',
            'visibility' => $profile?->visibility ?: 'members_only',
        ];
        $privacyProfile = $profile ?? new \App\Models\Profile(['visibility' => 'members_only']);
        foreach (ProfileFieldPrivacy::choices($privacyProfile) as $key => $audience) {
            $values['privacy_'.$key] = $audience;
        }

        return Inertia::render('settings/account', [
            'sections' => $pages,
            'privacyFieldGroups' => ProfileFieldPrivacy::groups(),
            'savedValues' => $values,
            'sessionInfo' => [
                'browser' => mb_substr((string) $request->userAgent(), 0, 250),
            ],
            'canDeleteAccount' => $user->hasVerifiedEmail(),
            'aiBalance' => Inertia::optional(fn () => [
                'tokens' => $this->tokenBalance($user),
                'credits' => (int) DB::table('ai_credit_grants')->where('user_id', $user->id)
                    ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))->sum('available'),
            ]),
        ]);
    }

    private function tokenBalance(\App\Models\User $user): array
    {
        $plan = app(\App\Domain\Billing\Queries\CurrentMemberPlan::class)->code($user);
        if (! \App\Domain\Billing\Queries\MemberFeatureAccess::allowsExamSimulator($plan)) {
            return ['configured' => false, 'allocated' => 0, 'remaining' => 0];
        }
        $legacy = app(\App\Services\AI\PmpQuestionHelpService::class);
        if ($legacy->enabled()) {
            $summary = $legacy->summary((int) $user->id);
            return ['configured' => $summary['allocated'] > 0, 'allocated' => $summary['allocated'], 'remaining' => $summary['remaining']];
        }
        return app(\App\Domain\AI\Services\PmpAiUsageReadModel::class)->summary($user, false);
    }

    public function update(AccountSettingsRequest $request): RedirectResponse
    {
        $data = $request->validated();
        if ($data !== []) {
            DB::transaction(function () use ($request, $data): void {
                // Serialize preference merges and privacy updates for this member only.
                $user = $request->user()->newQuery()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                $profileFields = Arr::only($data, ['phone', 'visibility', 'field_visibility']);
                $preferences = Arr::except($data, ['name', 'phone', 'visibility', 'field_visibility']);
                foreach (config('account_settings') as $page) {
                    foreach ($page[3] as $group) {
                        foreach ($group[1] as $field) {
                            if ($field['mode'] === 'preference' && $field['type'] === 'toggle' && array_key_exists($field['id'], $preferences)) {
                                $preferences[$field['id']] = (bool) $preferences[$field['id']];
                            }
                        }
                    }
                }
                if (array_key_exists('name', $data)) $user->name = $data['name'];
                if ($preferences !== []) {
                    $user->account_preferences = array_replace($user->account_preferences ?? [], $preferences);
                }
                if ($user->isDirty()) $user->save();
                if ($profileFields !== []) {
                    $profile = $user->profile()->firstOrNew();
                    if (! $profile->exists) $profile->visibility = 'members_only';
                    if (isset($data['phone'])) $profile->phone = $data['phone'];
                    if (isset($data['visibility'])) $profile->visibility = $data['visibility'];
                    if (isset($data['field_visibility'])) $profile->field_visibility = $data['field_visibility'];
                    if ($profile->isDirty() || ! $profile->exists) $profile->save();
                }
            }, 3);
        }

        return to_route('account-settings.edit');
    }
}
