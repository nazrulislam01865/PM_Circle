<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Payment callbacks use cryptographic gateway verification, not a browser CSRF session.
        $middleware->validateCsrfTokens(except: ['webhooks/payments/*']);
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);
        $middleware->alias([
            'pm.onboarded' => \App\Http\Middleware\EnsureOnboarded::class,
            'pm.admin' => \App\Http\Middleware\EnsureAdministrator::class,
            'pm.member' => \App\Http\Middleware\EnsureMember::class,
        ]);

        // One session/guard per browser, but different entry points and destinations.
        $middleware->redirectTo(
            guests: fn (Request $request) => $request->is('admin', 'admin/*')
                ? route('admin.login') : route('login'),
            users: fn (Request $request) => $request->user()?->is_admin === true
                ? route('admin.dashboard') : route('dashboard'),
        );

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Preserve rate limiting but return a normal Inertia validation error for the
        // Daily Challenge form, instead of displaying Laravel's HTML 429 in a modal.
        $exceptions->respond(function (SymfonyResponse $response, \Throwable $exception, Request $request): SymfonyResponse {
            if ($response->getStatusCode() !== 429
                || ! $request->isMethod('POST')
                || ! $request->is('admin/ai/daily-challenge/generate')
                || ! $request->hasHeader('X-Inertia')) {
                return $response;
            }

            $retryAfter = max(1, (int) $response->headers->get('Retry-After', '60'));

            return redirect()->route('admin.ai.daily-challenge.index')
                ->withErrors(['date' => "Too many generation requests. Try again in {$retryAfter} seconds."]);
        });
    })->create();

