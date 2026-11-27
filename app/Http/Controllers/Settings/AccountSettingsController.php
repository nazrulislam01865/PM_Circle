<?php

namespace App\Http\Controllers\Settings;

use App\Domain\Identity\Services\ProfileFieldPrivacy;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AccountSettingsRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class AccountSettingsController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $pages = null;
        $catalog = function () use (&$pages): array {
            return $pages ??= \App\Domain\Identity\Services\AccountSettingsCatalog::pages();
        };

        return Inertia::render('settings/account', [
            'sections' => $catalog,
            'privacyFieldGroups' => fn () => ProfileFieldPrivacy::groups(),
            'savedValues' => function () use ($user, $catalog): array {
                $user->loadMissing('profile');
                $profile = $user->profile;
                $values = [];
                $stored = $user->account_preferences ?? [];
                foreach ($catalog() as $page) {
                    foreach ($page[3] as $group) {
                        foreach ($group[1] as $field) {
                            if ($field['mode'] === 'preference') {
                                $value = $stored[$field['id']] ?? $field['value'];
                                $values[$field['id']] = isset($field['options'])
                                    ? \App\Domain\Identity\Services\AccountSettingsCatalog::resolve($field, (string) $value) : $value;
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
                return $values;
            },
            'sessionInfo' => [
                'browser' => mb_substr((string) $request->userAgent(), 0, 250),
                'canRevokeOthers' => config('session.driver') === 'database',
            ],
            'canDeleteAccount' => $user->hasVerifiedEmail(),
            'aiBalance' => Inertia::optional(fn () => [
                'tokens' => $this->tokenBalance($user),
                'credits' => (int) DB::table('ai_credit_grants')->where('user_id', $user->id)
                    ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))->sum('available'),
            ]),
        ]);
    }

    public function payments(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate(['page' => ['sometimes', 'integer', 'min:1', 'max:10000']]);
        $orders = DB::table('payment_orders')->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')->orderByDesc('id')
            ->simplePaginate(10, ['uuid', 'product_type', 'amount_minor', 'currency', 'provider', 'status', 'created_at']);
        return response()->json([
            'data' => $orders->items(), 'page' => $orders->currentPage(),
            'hasMore' => $orders->hasMorePages(),
        ])->header('Cache-Control', 'private, no-store');
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
                $profileFields = Arr::only($data, ['phone', 'visibility', 'field_visibility', 'field_visibility_patch']);
                $preferences = Arr::except($data, ['name', 'phone', 'visibility', 'field_visibility', 'field_visibility_patch']);
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
                if (($preferences['mail'] ?? null) === false || ($preferences['digest'] ?? null) === 'Off') {
                    DB::table('notifications')->where('notifiable_type', \App\Models\User::class)
                        ->where('notifiable_id', $user->id)->where('email_status', 'pending')->update(['email_status' => 'skipped']);
                }
                if ($profileFields !== []) {
                    $profile = $user->profile()->firstOrNew();
                    if (! $profile->exists) $profile->visibility = 'members_only';
                    if (isset($data['phone'])) $profile->phone = $data['phone'];
                    if (isset($data['visibility'])) $profile->visibility = $data['visibility'];
                    if (isset($data['field_visibility'])) $profile->field_visibility = $data['field_visibility'];
                    if (isset($data['field_visibility_patch'])) {
                        $profile->field_visibility = array_replace($profile->field_visibility ?? [], $data['field_visibility_patch']);
                    }
                    if ($profile->isDirty() || ! $profile->exists) $profile->save();
                }
            }, 3);
        }

        return to_route('account-settings.edit');
    }

    public function revokeOtherSessions(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password:web']]);
        if (config('session.driver') !== 'database') {
            throw ValidationException::withMessages(['password' => 'Other-session sign out requires database-backed sessions.']);
        }
        $user = $request->user();
        // Rotate persistent login tokens as well as removing the other session records.
        $user->setRememberToken(Str::random(60));
        $user->save();
        Auth::guard('web')->logoutOtherDevices($request->input('password'));
        DB::connection(config('session.connection'))->table(config('session.table', 'sessions'))
            ->where('user_id', $user->id)->where('id', '!=', $request->session()->getId())->delete();
        return to_route('account-settings.edit')->with('status', 'Other browser sessions signed out.');
    }

}
