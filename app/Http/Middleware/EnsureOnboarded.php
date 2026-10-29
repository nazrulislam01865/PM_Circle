<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOnboarded
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()->status === 'active', 403);
        if ($request->user()->onboarding_step < 3) return redirect()->route('join.profile');
        return $next($request);
    }
}
