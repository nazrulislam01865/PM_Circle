# Course detail labels and centralized UI consistency

Base: PM_Circle_Full_Course_Prototype_Restored_2026-11-26.zip. Latest supplied design guide: PM_Circle_Design_Guidelines (1)(20261126-095422).html.

- The upper badge previously displayed `course.category` for ordinary courses and the lower topic list rendered the same value. The course model exposes one category, with no separately managed type or tag columns.
- `courseDetailLabels.ts` derives a presentation-only course type (Certification preparation for exam courses, Professional development otherwise). The existing catalog category remains the actual topic; existing PMP-specific labels are retained. Case/whitespace-normalized duplicates and empty labels are omitted. No database fields, queries or administrative inputs are added. Exam matching uses whole words rather than accidentally matching words such as examples.
- `CourseDetail.tsx` renders the type beside Save/Share and the distinct topics below the metadata, preserving the prototype composition and all eight content/aside cards. Tags use a semantic list. Existing access, enrollment, practice, resources, history, reviews and member/public shell logic are unchanged.
- `pm-learning-course-detail.css` aligns the type badge with the central control height; uses the central body, card surface, metadata, focus and subheading roles; removes the conflicting outline button border override; uses canonical guide aliases in practice and resource lists. The existing compact 32–36px central course title role and Inter font are retained rather than adopting the older prototype font. Browse Courses remains unchanged.

## Verification

- Baseline source regression suite: 472/474 passed. Updated suite: 479/481 passed, including seven new tests. Both remaining failures match the baseline (PMP dashboard counters and legacy profile header).
- Changed TS/TSX and dependent helper transpilation and CSS parsing succeeded.
- 20 Chromium layout fixtures at 1668, 1440, 1024, 768 and 390px, PMP and ordinary courses, public and member-like wrappers. All eight cards rendered from actual transpiled detail components using a lightweight JSX mock; router, icons, Radix and hooks are mocked. The fixture uses the project CSS and font faces from the supplied guideline locally for verification. No horizontal overflow, identical guide typography, 44px controls and badge, 14px card radius, and no duplicate labels. This is not a live authenticated Laravel or React runtime, nor a verification of external font delivery.
- Full production build, type check and Laravel integration tests are unverified: vendor/node_modules are absent; previous offline npm installation lacked required packages. No migrations or seeding necessary. Run `npm ci`, `npm run types:check`, `npm run build`, `php artisan optimize:clear`, `php artisan optimize` with a compatible Node version. Preserve `.env` and private storage.
