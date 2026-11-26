# Legal section and link controls

Base: PM_Circle_Full_Dynamic_Legal_Pages_2026-11-26.zip.

Use `/admin/legal/terms` or `/admin/legal/privacy`. Add section is available above and below the section list. Delete section removes its draft content and corresponding contents link, with confirmation; one section must remain. Move up/down changes the order. Section IDs remain stable when titles change. In each section, the **On this page link** controls allow a custom label and independent visibility. Hiding a link does not hide the article section. If every link is hidden the public contents panel is omitted.

The **Links in this section** editor detects existing supported Markdown links. Add link appends a new link paragraph; Edit link changes the selected occurrence in place; Remove link preserves its visible text. Apply link before saving the draft. Existing section text may also be edited directly. Supported destinations are simple local site paths (optionally with a fragment) and HTTPS URLs without credentials; arbitrary HTML is never rendered. The draft preview reflects the contents list. Save draft and explicitly publish to expose updates. Past published versions are immutable. Existing content and registrations are not modified by installing this update.

Optional JSON fields `toc_label` and `show_in_toc` are validated on save; missing values retain the original behavior. The same existing tables and snapshot workflow are used. No additional migration, seed, query or package is needed for an installation that already applied the versioned legal pages migration. A first installation still requires the previous migration. Production signup continues to require both approved legal documents to be published.

Verification: 12 targeted source/behavior checks passed; full source suite 520/521 (same PMP dashboard failure as baseline 516/517). Three PHP syntax checks, five TS/TSX transpilation checks and strict type checking of the standalone link helper passed. Laravel integration test added but not executed; dependencies absent. Full frontend build and live browser verification not performed.
