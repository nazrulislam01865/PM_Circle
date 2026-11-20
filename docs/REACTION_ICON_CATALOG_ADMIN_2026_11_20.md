# PM Circle — Admin-managed reaction catalog (2026-11-20)

## Scope

The existing `/admin/reaction-icons` editor now uses compact, accessible rows with previews, an explicit image-selection button, and inline Save/Restore actions. Administrators may add up to twelve additional named reactions, upload their PNG/JPG/WebP icon, edit their name, and hide or re-enable them. No original reaction type or historical reaction data is deleted. The seven built-in reaction identifiers, labels and permanent Lucide fallback icons remain intact.

## Architecture

- Configuration is stored in the existing unique `home_page_contents` record with key `reaction_icons`. Existing built-in icon paths remain at their original top-level keys. Custom definitions are stored in `content.custom_reactions` keyed by short immutable IDs, with `label`, `path` and `active` fields.
- `ReactionIconCatalog` reads this configuration through the existing five-minute cache and supplies labels, active/all type lists, and icon URLs to backend validators and shared Inertia props.
- Post, comment, scenario and scenario-response reaction APIs validate active types for creation and retain all registered types for old values and reaction history. Deactivating custom types removes them from pickers only; counts, roster, and the ability to remove a prior reaction are preserved.
- Post engagement materialized counters keep the seven original columns and add `other_reactions_count`, tracking all custom types together. Display breakdowns for custom types are fetched with one grouped query per visible batch of posts, not per card. The total consistency constraint accounts for the new column.
- Uploaded icons are stored on Laravel's `public` disk under `reactions/` and delivered via `public/storage`. The archive's original machine-specific absolute symlink was converted to a portable `../storage/app/public` symlink so uploaded icons work when the project is moved. No new icon package or external image service is introduced.

## Deployment prerequisites and order

1. Back up PostgreSQL before deployment.
2. Deploy the updated project and run `php artisan migrate --force` **before allowing users to select custom reactions**. The new migration only adds a counter column and replaces the corresponding PostgreSQL consistency check; no existing rows are removed. Use a normal maintenance window for this DDL if the platform has active traffic.
3. Run `npm ci` and `npm run build` using a Node.js version compatible with the project's locked packages (some require >=22.18).
4. Run `php artisan optimize:clear` and restart PHP-FPM/workers using the existing rollout process. Preserve the existing server `public/storage` link and `storage/app/public/reactions` uploads; if the link is missing, run `php artisan storage:link`.
5. Verify admin creation and upload, standard seven reactions, a custom reaction on a post/comment/scenario/response, archived reaction history, and counts with the engagement-statistics feature flags used in production.

## Safety

Do not delete or truncate `home_page_contents`, `post_reactions`, `comment_likes`, `scenario_reactions`, `scenario_response_reactions` or `post_engagement_stats`. This migration deliberately rejects rollback to avoid silent custom-count loss. Custom type IDs are server-generated and immutable. Existing uploads are not replaced until an admin explicitly uploads a new icon.

## Verification limitations

PHP syntax, TSX syntax and modified CSS have been statically checked. End-to-end application tests and a full Vite build must be run in a development environment with PHP PostgreSQL/SQLite extensions, Composer dependencies and the compatible Node.js version installed. No production operation was performed as part of this package.
