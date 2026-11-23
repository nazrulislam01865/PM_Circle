<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // Member navigation is shared on all signed-in pages, including public URLs.
        // Lazy evaluation avoids the dashboard projection for guests and administrators.

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'emailVerificationRequired' => config('pm-circle.email_verification_required'),
            'siteNavigation' => fn () => $request->is('admin', 'admin/*') ? null : \App\Support\Admin\SiteNavigation::links(),
            'siteFooter' => fn () => $request->is('admin', 'admin/*') ? null : \App\Support\Exam\PmpPublicContent::load()['footer'],
            'reactionIcons' => fn () => $request->is('admin', 'admin/*') ? [] : \App\Support\Community\ReactionIconCatalog::urls(),
            'reactionDefinitions' => fn () => $request->is('admin', 'admin/*') ? [] : \App\Support\Community\ReactionIconCatalog::definitions(),
            // One cached, admin-configured offer shared by all guest and member headers.
            // Do not issue individual coupons here; the reward itself remains member-scoped.
            'rewardPromotion' => fn () => $request->is('admin', 'admin/*') || $request->user()?->is_admin === true
                ? null : app(\App\Domain\Billing\Services\ProfileCompletionRewardService::class)->publicPromotion(),
            'auth' => [
                'user' => $request->user() ? [
                    ...$request->user()->only(['id', 'name', 'email', 'email_verified_at', 'onboarding_step', 'created_at', 'updated_at']),
                    'is_admin' => (bool) $request->user()->is_admin,
                    'avatar_path' => $request->user()->is_admin ? null : $request->user()->loadMissing('profile')->profile?->avatar_path,
                    'avatar' => $request->user()->is_admin ? null : $request->user()->profile?->avatar_path,
                ] : null,
            ],
            'notificationRealtime' => fn () => $request->user() && ! $request->user()->is_admin ? [
                'pusher' => config('broadcasting.connections.pusher.key') ? [
                    'key' => config('broadcasting.connections.pusher.key'),
                    'cluster' => config('broadcasting.connections.pusher.options.cluster'),
                ] : null,
                'reverb' => config('broadcasting.connections.reverb.key') ? [
                    'key' => config('broadcasting.connections.reverb.key'),
                    'host' => config('notifications.reverb_public_host'),
                    'port' => config('notifications.reverb_public_port'),
                    'secure' => config('notifications.reverb_public_secure'),
                ] : null,
            ] : null,
            'memberShell' => fn () => $request->user() && $request->user()->is_admin !== true && $request->user()->onboarding_step >= 3
                ? app(\App\Domain\Dashboard\Queries\MemberShell::class)->forMember($request->user()) : null,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
