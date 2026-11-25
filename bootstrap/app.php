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
        $exceptions->dontFlash(['secret']);
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Preserve throttling; Inertia forms need inline errors rather than HTML 429 modals.
        $exceptions->respond(function (SymfonyResponse $response, \Throwable $exception, Request $request): SymfonyResponse {
            if ($response->getStatusCode() !== 429
                || ! in_array($request->method(), ['POST', 'PATCH', 'PUT'], true)
                || ! $request->hasHeader('X-Inertia')
                || $request->expectsJson()) {
                return $response;
            }

            $retryAfter = max(1, (int) $response->headers->get('Retry-After', '60'));

            if ($request->is('events', 'events/*', 'admin/events', 'admin/events/*')) {
                $route = match ($request->route()?->getName()) {
                    'events.store' => route('events.create'),
                    'events.register', 'events.comments.store' => route('events.show', $request->route('slug')),
                    'admin.events.store' => route('admin.events.create'),
                    'admin.events.update' => route('admin.events.edit', $request->route('event')),
                    'admin.events.settings.update' => route('admin.events.settings'),
                    'admin.events.comments.moderate' => route('admin.events.participants', $request->route('event')),
                    default => route('admin.events.index'),
                };
                return redirect()->to($route, 303)->withErrors(['event' => "Too many event requests. Try again in {$retryAfter} seconds."]);
            }

            if (! $request->isMethod('POST')) {
                return $response;
            }

            if ($request->is('membership/temporary')) {
                return redirect()->route('membership.index', [], 303)
                    ->withErrors(['plan' => "Too many membership switch requests. Try again in {$retryAfter} seconds."]);
            }

            if ($request->is('help-center/requests')) {
                return redirect()->route('support.create', [], 303)
                    ->withErrors(['subject' => "Too many support requests. Try again in {$retryAfter} seconds."]);
            }

            if ($request->is('admin/support-requests/*') && $request->route('ticket')) {
                return redirect()->route('admin.support.show', $request->route('ticket'), 303)
                    ->withErrors(['body' => "Too many updates. Try again in {$retryAfter} seconds."]);
            }

            if ($request->is('admin/ai/daily-challenge/generate')) {
                return redirect()->route('admin.ai.daily-challenge.index')
                    ->withErrors(['date' => "Too many generation requests. Try again in {$retryAfter} seconds."]);
            }

            return $response;
        });
    })->create();

