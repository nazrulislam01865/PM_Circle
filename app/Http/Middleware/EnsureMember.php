<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Member features are never available to an administrator, even when the
 * administrator is authenticated through the shared web session guard.
 */
final class EnsureMember
{
    public function handle(Request $request, Closure $next, string $allowGuest = 'false'): Response
    {
        $user = $request->user();

        if ($user === null && $allowGuest === 'true') {
            return $next($request);
        }

        abort_unless($user && $user->is_admin !== true && $user->status === 'active', 403);

        return $next($request);
    }
}
