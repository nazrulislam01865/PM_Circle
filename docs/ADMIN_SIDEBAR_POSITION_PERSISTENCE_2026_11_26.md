# Admin sidebar navigation persistence

## Root cause
Admin pages render their own `AdminLayout` instance. Navigating between different Inertia page components unmounts the previous layout, replacing the scrollable desktop sidebar and resetting its local expansion state. The sidebar is independently scrollable and is not an Inertia scroll region.

## Fix
`resources/js/layouts/admin/AdminLayout.tsx` retains the desktop sidebar scroll offset and the six expandable group states in client-side module memory. It records the position during scroll and before sidebar clicks, restores the position on mount in a layout effect, and initializes group state from remembered state or the active route. Existing active-route expansion and mobile close-on-navigation remain in place. Mobile navigation cannot overwrite the remembered desktop position. The main document scroll is not preserved, so destination pages open normally at the top. No routes, styling, permissions, database, or footer behavior change.

The state persists across navigation in the running client application, not across a hard reload or a new browser tab. If the available scroll range changes, normal browser scroll clamping applies.

## Verification
- `node --experimental-strip-types --test tests/Regression/*.test.mjs`: 522/523 pass (the same existing PMP dashboard failure as the base archive).
- `node node_modules/typescript/bin/tsc --noEmit`: the same two pre-existing errors as the base archive (`ProfileSectionJump.tsx:42`, `LegalPage.tsx:54`); no sidebar errors.
- Chromium fixture using the actual React AdminLayout, React dependencies, navigation data and project CSS, with Inertia and icon primitives stubbed: 1440x800 and 1024x600 retain exact sidebar scroll offsets after simulated cross-page remount, preserve expanded and collapsed groups, highlight the correct destination, and return the main document to the top. A 390x760 mobile fixture confirms that navigation closes the mobile menu and updates the active route.
- Production build and authenticated Laravel/Inertia browser testing not performed in this environment. The base archive's platform-specific Vite dependencies previously blocked the build.

## Deployment
Rebuild the frontend with the project's supported Node version (`npm ci`, `npm run build`) and clear Laravel's cached configuration/assets as usual (`php artisan optimize:clear`, `php artisan optimize`). No migration or seeding is required for this change.
