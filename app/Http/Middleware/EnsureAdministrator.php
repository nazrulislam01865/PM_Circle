<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureAdministrator
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user?->is_admin === true && $user->status === 'active' && $user->email_verified_at !== null,
            403, 'An active, verified administrator account is required.');

        return $next($request);
    }
}
