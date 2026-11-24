# Community and scenario strict design guideline corrections

Baseline: PM_Circle_Community_Scenario_Guideline_Full_Project.zip, with the latest supplied PM Circle Design Guidelines HTML (20261124-095003).

The guideline specifies 16px card padding, 16px between cards, 14px card radius, 8px standard field/button radius, 44px minimum control height and semantic typography. Its static Inter font exception explicitly permits the existing 400/600/700 faces with nearest-weight fallback. Font loading is therefore unchanged.

Changes:
- New central card padding and spacing aliases reference the existing 16px spacing token. Community hero, post, guest banner, guest response prompt, sidebar, scenario article, response, decision, feedback and library cards consume the standard padding. Legacy responsive/member card-padding overrides removed or aligned.
- The guest prompt has the same bottom margin as the reusable post card, fixing the touching next post in the virtualized feed. The previous extra top margin is removed.
- Canonical post card uses H3 for its H3 markup and H1 for its detail H1; removes unintended profile card body padding. Shared card corrections also affect other pages reusing PostCard, including Home and post detail. Shared legacy primary/outline/disabled buttons use standard guide padding and colors; other components consuming these base classes receive these corrections too.
- Sidebar typography is defined at the shared card source rather than duplicated at page level. Scenario article uses default border-only card elevation; library list gaps and filter heading inset align with the guideline. Legacy library/detail local width overrides removed in favor of existing shared layout.
- Scenario response field has accessible label and linked validation message; reply field uses shared field typography. Inline spacing references central tokens; guest login actions can wrap. No content, business logic, query, route, database, AI or dependency changes.

Verification:
- 296/296 Node regression tests passed (three new, one updated to assert the shared sidebar selector).
- All 87 CSS stylesheets parsed with PostCSS; changed TSX transpiled without diagnostics.
- 30 isolated Chromium fixture cases (3 pages x guest/member x 320, 390, 768, 1024, 1680px) passed. Tested card padding 16px/radius 14px, post/guest prompt/next post gaps 16px, no unintended post body padding, heading/body/control sizes, field validation border, public rails and horizontal overflow. Fixtures use source styles and representative DOM, not complete mounted Laravel pages. The fixture does not prove actual font asset loading or every dynamic state.
- npm run build failed because vp is not installed in the environment. Rebuild locally before checking/deploying. Existing compiled frontend files retained. No DB migration required.

Apply changes ZIP over the latest project, preserve .env and storage, run npm run build and php artisan optimize:clear, and hard-refresh. Verify actual public and authenticated pages at browser zoom 100% (also check mobile/zoom accessibility).
