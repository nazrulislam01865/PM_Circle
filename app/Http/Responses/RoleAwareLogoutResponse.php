<?php

namespace App\Http\Responses;

use Illuminate\Http\RedirectResponse;
use Laravel\Fortify\Contracts\LogoutResponse;

final class RoleAwareLogoutResponse implements LogoutResponse
{
    public function toResponse($request): RedirectResponse
    {
        return $request->is('admin/logout')
            ? redirect()->route('admin.login')
            : redirect()->route('home');
    }
}
