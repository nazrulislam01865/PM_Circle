# Member home: Plan & usage and Practice & results

Source: Archive 7(2).zip; approved PM Circle Design Guidelines (1)(9).html (byte-identical to the archived guideline).

## Scope

Two reusable member-home overview cards are inserted between Earned badges and Profile insights. The existing card surfaces, h3 role, body metadata, links, border, padding, gap and sticky rail are reused. The status chips wrap at narrow widths. No public page, member navigation, or unrelated card is changed.

## Data and access

- DashboardOverview resolves the actual membership code once for the dashboard plan and card entitlements. Demo preview plans do not affect actual card entitlements.
- MemberFeatureAccess::allowsExamSimulator is the existing rule (Plus/Pro). The existing /exams/pmp/enter route independently checks access, directing eligible users to the simulator and other members to Pricing.
- View usage links to /membership. The existing PmpAiUsageReadModel supplies the configured PMP token balance (including reserved-token deductions); the optional includeActivity=false skips the ledger aggregate. No token query for Free accounts. No AI call, client fetch, grant, or new table.
- Free has no PMP token allocation under the current rules, so the prototype's 8,000 is not hardcoded. Missing/zero allocation is displayed as not configured; a configured exhausted balance is displayed as zero. Other AI credits are not represented as tokens.

## Verification

- Four new source regression checks passed; full Node regression suite 427/428, with the original full-mock counter assertion failure reproduced before this change (423/424).
- PHP syntax checks and TypeScript transpile syntax checks passed.
- Offline Chromium component fixtures (stubbed framework and icons, actual component markup/CSS): 24/24 across six card widths and four account states. Card size, typography and wrapping compared to Earned badges; links and order checked.
- A Laravel feature test was added for real entitlement, demo preview isolation, missing quota, real balance, exhaustion and navigation. It was not executed: Composer dependencies are absent. Full TypeScript type checking, production build and live integration remain unverified.

## Apply

Keep .env, database and existing storage. Install dependencies if needed, run npm run build and php artisan optimize:clear. No migrations or reseeding. The source archive excludes stale compiled build assets and runtime/cache/session/debug data; regenerate assets before serving.
