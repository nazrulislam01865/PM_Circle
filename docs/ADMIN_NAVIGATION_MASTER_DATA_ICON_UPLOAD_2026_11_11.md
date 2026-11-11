# PM Circle - Admin navigation, master data and icon upload correction

## Scope

- Homepage control remains one parent with seven section submenus.
- Navigation control is a separate parent with its four allowed internal destination categories. It manages links, not dropdown-only master data.
- Master data now has seven submenus (five icon categories, job locations, employment types). The redundant category list in the main pane has been removed.
- The admin sidebar is more compact, scrollable on desktop and collapsible on mobile. The editor uses the same PM Circle design tokens and preserves the homepage appearance.
- Upload or restore PNG/JPG/WebP icon overrides on Master data > icon categories. The original icon code stays unchanged, and the original Lucide icon remains the fallback.
- The public homepage receives cached icon URLs only, with no new per-card or per-user queries.

## Security

- All admin routes remain protected by auth + verified + pm.admin.
- Icon upload requires a verified image, not SVG; maximum 1 MiB and 1024x1024 pixels.
- Icon assets are stored on the configured public filesystem disk in homepage-icons; replacement and restore clean up old files. Never allow arbitrary asset paths.
- Navigation destinations are restricted to existing internal GET routes and may not target the admin namespace.
- In-use choices cannot be disabled; homepage content and existing selections are not rewritten or reset.

## Database

New additive migration: `2026_11_11_000004_add_icon_path_to_master_data_options.php`.
Existing navigation catalog records are preserved in the same indexed catalog table, but accessed through separate admin UI and authorization-aware endpoints. No destructive data conversion or re-seed is needed.

## Deployment

1. Back up database and configured public storage.
2. Check and run `php artisan migrate --pretend` then `php artisan migrate --force` after reviewing the output.
3. Ensure the public storage disk is correctly configured; for local disk run `php artisan storage:link` if needed.
4. Run `npm ci`, `npm run types:check`, and `npm run build` with Node.js 22.18+ or 24.11+.
5. Run `php artisan optimize:clear` and `php artisan test --filter=HomepageMasterDataTest` and `php artisan test --filter=HomepageAdministrationTest`.
6. Manually check admin sidebar group expansion, mobile navigation, master-data selections, upload/revert icon, and the public homepage visual layout.

## Verification performed here

PHP syntax lint and TS/TSX syntactic transpilation, CSS parser, source integrity and ZIP CRC verification. Full Laravel feature tests, TS typecheck, build, and visual browser QA were not possible because PHP/Node project dependencies were absent, offline npm installation failed on an uncached package, and Node.js was below the required version.
