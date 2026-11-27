<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\AuthenticateSession;
use Symfony\Component\HttpFoundation\Response;

/** Apply Laravel's password-hash session check to members, including public member routes. */
final class AuthenticateMemberSession
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && ! $request->user()->is_admin) {
            return app(AuthenticateSession::class)->handle($request, $next);
        }
        return $next($request);
    }
}
