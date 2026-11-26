# PM Circle - compact edit profile

Based on the supplied screenshot and November 26 design guidelines. The default Edit profile tab is a single card with nine sections, section navigation, persisted completion indicator and footer actions. Existing member header/sidebar/footer, profile tabs, typography tokens, form components and authorization are retained.

## Data and behavior

- Basic/contact/about fields update the existing profile/account columns; email changes follow the existing verification behavior. Photo URL inputs accept HTTPS, and clearing them does not delete uploaded media.
- The prototype's free-text experience, projects, education, certification, course and speaking fields are stored as compact summaries in `profiles.editor_details.compact`. They are initially prefilled from structured records when there is no saved summary. Only changed summaries are sent, and no structured record is replaced or fabricated. They are displayed alongside detailed records in the overview and filtered using existing section visibility rules in public profiles. A compact certification is self-reported, not a verified credential.
- Manage detailed records opens the existing editor for repeatable records, career preferences and other fields. Detailed saves retain the compact summaries. The AI resume assistant continues to use its existing structured records and private resume document; compact summaries are not automatically converted to those records.
- Display location uses existing city/country privacy settings. The existing required phone rule is retained even though the mockup does not mark it required. Name, email, job title and organisation are required in the compact editor.
- Profile completion remains the authoritative backend percentage (existing ten criteria); it refreshes after a successful save rather than inventing an independent completion formula. Structured experience still counts towards the existing experience criterion.
- No new route, dependency, database table, migration or seeder. Compact save reuses the authenticated profile update route and transaction; it skips all structured collection reads/writes in the editor save service.

## Apply

Extract the update ZIP at the project root (the ZIP contains complete changed source files, not a standalone project). Commit the changes in the existing repository. Run `npm ci`, `npm run types:check`, `npm run build`, and `php artisan test --filter=ProfileEditorPrototypeTest` in a configured development/staging environment before deploying. Use the Node version supported by the locked packages (Node 22.18+ in the 22.x line or an applicable newer supported release).

## Verification

PHP lint and TSX syntax transpilation succeeded for changed code; CSS parsed successfully. The full dependency-based type check, build, Laravel feature tests and real-browser screenshot/interaction tests could not be completed here: Composer vendor files are absent; npm offline cache lacks a locked package; the installed Node 22.16 is below the Vite+ supported 22.x minimum. Do not treat this as production sign-off.
