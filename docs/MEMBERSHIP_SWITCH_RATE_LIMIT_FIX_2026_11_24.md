# Membership switching rate-limit fix

The existing authenticated demo switch POST `/membership/temporary` used an unnamed numeric throttle (10/minute). Laravel numeric throttles can share the authenticated user's request signature with other routes, including background polling. The screenshot alone does not establish the originating HTTP request; confirm the failing URL in browser Network if the issue persists.

- Dedicated named `membership-switch` limiter, 10/minute per member, isolated from unrelated requests. No other limits raised or removed.
- Inertia POST 429 responses for this endpoint redirect to membership with an inline `plan` error and retry interval, instead of rendering the HTML error modal. JSON clients retain HTTP 429. Existing Daily Challenge error handling retained.
- Frontend synchronously guards duplicate clicks and resets the guard at visit completion. Validation errors use the existing comparison alert, with scroll reset on errors.
- Existing authentication, verification, onboarding, demo feature flags, plan validation, transaction, paid checkout and success redirect remain unchanged. No migrations or new packages.

Verification: 319 Node regression checks passed, PHP syntax checks passed, TSX syntax transpilation passed. Laravel feature tests added but blocked by missing vendor/autoload.php. Production build blocked by missing vp. No live HTTP test was performed.

Apply changed files to the latest source, run `php artisan optimize:clear` and `npm run build` in the installed environment. Run `php artisan test --filter=TemporaryMembershipRateLimitTest` to verify the backend. No production cache flush outside normal application optimization is needed to isolate the new limiter. Do not disable throttling or enable complimentary access for production paid subscriptions as a workaround.
