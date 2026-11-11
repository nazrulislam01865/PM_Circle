<?php

namespace App\Http\Responses;

use Illuminate\Http\RedirectResponse;
use Laravel\Fortify\Contracts\LoginResponse;

/** Applies to password login and a completed Fortify two-factor challenge. */
final class RoleAwareLoginResponse implements LoginResponse
{
    public function toResponse($request): RedirectResponse
    {
        if ($request->user()?->is_admin === true) {
            // Admin sessions never enter the member dashboard, including when
            // a previous member URL was stored as the intended destination.
            $request->session()->forget('url.intended');

            return redirect()->route('admin.dashboard');
        }

        // Preserve existing member deep links but do not let an intended admin
        // URL send a newly authenticated member to the other account area.
        $intended = $request->session()->get('url.intended');
        $path = is_string($intended) ? parse_url($intended, PHP_URL_PATH) : null;
        if (is_string($path) && ($path === '/admin' || str_starts_with($path, '/admin/'))) {
            $request->session()->forget('url.intended');
        }

        return redirect()->intended(route('dashboard'));
    }
}
