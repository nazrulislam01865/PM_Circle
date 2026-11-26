# Public homepage administration, 2026-11-26

The current public homepage and the administrative editor use the same fourteen-section presentation contract in `config/homepage-v2.php` and `app/Support/Home/HomepagePresentation.php`.

| Section | Controls |
|---|---|
| Hero slider | Slides, tab labels, copy, photos, custom images, CTA destinations, ordering |
| Quick links | Labels, destinations, order |
| Certification practice | Heading, comparison CTA, exam cards, labels, images, ordering |
| Courses | Heading, CTA, card label, preview limit, empty state |
| Community heading | Heading and supporting text |
| Community feed | Composer label, posts heading, limit, empty state |
| Daily challenge | Published scenario selection, read action, status and empty text |
| Member preview | Heading, copy, CTA, up to two eligible public profiles, empty state |
| Skills sidebar | Heading, links, icons and custom images |
| AI features | Heading, CTA, all eight initial cards, images, order |
| AI Resume Assistant | Copy, CTA, offer note, custom image, four initial workflow steps |
| Trends banner | Heading, copy, photo, custom image, CTA |
| Community events | Heading, CTA labels, upcoming event limit, empty state |
| Join banner | Heading, copy, CTA |

Every section has its own visibility setting. Community heading only appears when at least one community panel is shown. Existing shared navigation, footer and profile reward offer are managed from their existing admin pages. Courses, posts, members, daily challenge and event records are managed by their existing modules; homepage display settings do not publish or modify those records. Daily challenge automation takes precedence over optional featured scenario selection. Only eligible published content is returned; demo fallback content is restricted to local/testing with the demo flag enabled. The authenticated member dashboard is outside this change.

The removed editor controls include legacy portrait/orbit artwork, career pathway steps, obsolete job/opportunity cards and manual post/response preview settings. Legacy content is retained in the existing JSON column for rollback; newly saved sections are isolated under `homepage_v2`. New writes reject unknown fields and invalid routes. Updates are transactional with the existing optimistic revision guard. No new database table, migration, or required seeding for already initialized sites. New empty sites may use the existing HomePageContentSeeder. The three preview exam cards now point to their corresponding existing Coming Soon pages; no exam availability or AI entitlement is changed. Review marketing copy and the configured offer against actual plan allowances.

Tests: full source regression suite 468/470, identical to the baseline archive (PMP mock-counter and legacy profile-header tests fail in both). PHP syntax checks, TSX syntax transpilation, CSS parsing and standalone resolver checks passed. New Laravel feature tests are included but not executed because vendor/autoload.php is absent. Full production build, TypeScript type checking, authenticated browser verification and real image-upload persistence still require an installed environment. Rebuild frontend assets and clear Laravel caches before deployment. Preserve production .env and private storage. No production deployment was performed.
