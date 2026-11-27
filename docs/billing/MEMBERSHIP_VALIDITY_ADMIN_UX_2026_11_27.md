# Membership validity admin UX

Base: PM_Circle_PMP_Signup_Plans_Updated.zip. This is an incremental UX revision, not a new billing implementation.

- Signup durations: filter existing rows by Plus/Pro, show availability badges, open add/edit forms on demand, prefill price and status for edits. The existing duration identity is read-only while editing. Add mode detects duplicate durations in the loaded list. The existing backend save/versioning semantics remain unchanged.
- Member validity: explicit case-insensitive name/email search, at most 20 results, eligible complimentary Plus/Pro grants only, excludes admins. Selecting a result loads the existing detail form, with activation, expiry and duration visible before changing terms. The activation choice uses PMDropdown. No member list is queried at initial load. Inertia partial visits use lazy catalog props to avoid unnecessary catalog queries. Admin route is rate limited and existing authorization and update validation remain in force.
- Existing paid subscriptions, signup duration persistence, membership expiry and PMP entitlement logic are untouched. No new migration, dependency or background job. Styling uses scoped layout rules and shared PM Circle tokens.

## Verification
PHP lint for the controller, routes and feature test; TypeScript transpilation syntax check; static Node regression suite. Laravel feature tests (including new member search coverage), PostgreSQL execution, frontend typecheck/build and visual browser review require installed project dependencies. Deploy with the normal asset rebuild and cache refresh. If the preceding signup validity release has not been migrated, follow its deployment instructions first.
