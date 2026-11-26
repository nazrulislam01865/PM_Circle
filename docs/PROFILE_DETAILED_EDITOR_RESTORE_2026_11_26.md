# Restore the old Edit Profile page

Base: Archive 7.zip. Reference: Archive 2(4).zip.

The original detailed editor (ProfileEditorPrototype) already exists in Archive 7, with the original 14-section navigation, three-column desktop layout and repeatable structured record controls. The Edit tab now renders that component directly instead of CompactProfileEditor. Its existing CSS remains in place, including later shared header typography fixes. The existing component also retains later LinkedIn hydration, record refresh after save, and optional import action fixes.

Resume & imports stays explicitly disabled. Overview, Privacy, AI Resume Assistant, Account Settings and all other modules are unchanged. No backend, routes, dependencies, migration or seeding changes. Compact-only summary data remains stored; the restored editor does not expose the compact-only fields, and does not automatically convert them into structured records. The compact component and backend remain available for potential future reuse.

The source archive excludes macOS metadata, compiled frontend assets, Laravel generated caches, sessions and Inertia debug snapshots. Preserve the deployment environment and private storage, then rebuild frontend assets. Run npm run types:check, npm run build, php artisan optimize:clear, php artisan optimize. Run the existing ProfileEditorPrototypeTest feature tests in a configured test environment.
