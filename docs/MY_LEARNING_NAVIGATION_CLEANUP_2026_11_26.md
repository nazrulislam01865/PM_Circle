# My Learning navigation cleanup

Base: Archive 2.zip.

- Removed the Learning paths shortcut and duplicate Browse courses toolbar link from My Learning. Enrollment filters and cards are unchanged.
- The shared empty-state Browse courses button uses /learning, the sidebar's existing catalog destination (also applies to certificate empty states).
- Fixed active navigation for /dashboard/learning with no tab, catalog tab, or search parameters. This URL renders the catalog; the prior resolver selected My Learning unless tab=courses was explicit. Legacy paths/practice/exams tabs, lesson and certificate routes retain their behavior.
- Removed the unused learning-path link CSS. No database, backend, or dependency changes.

Verification: 18 targeted source/resolver tests passed; overall 512/513 source regression checks passed. Remaining PMP dashboard assertion is present in original source. Three changed TypeScript files transpile without diagnostics. Full type check blocked by missing application dependencies; authenticated browser navigation and build not verified.

Deploy: preserve .env, database, and private storage; install dependencies if necessary, run npm run build, php artisan optimize:clear, php artisan optimize. Output excludes stale generated frontend assets and transient Laravel cache/session/debug files.
