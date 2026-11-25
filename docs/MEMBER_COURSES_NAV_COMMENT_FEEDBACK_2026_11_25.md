# Member courses navigation and comment feedback

- Courses groups My learning, Browse courses and Certificates with independent expansion and route highlighting; course navigation does not require an exam subscription.
- Courses and Exam Simulator display the shared AI indicator. Existing exam locks remain intact. The indicator does not enable or configure AI.
- Project Simulator is removed from sidebar and legacy learning navigation, not from backend routes or unrelated feature cards. Public Learn & Practice retains Browse courses only; homepage AI content and footer remain unchanged.
- Comment and reply composer feedback uses shared inset status surfaces, accessible icons, wrapping, retry control and reduced-motion support. The existing moderation requests, polling, permission checks and messages are unchanged.
- No database migration or new dependencies.

Verification: 413/414 source regression checks passed (unchanged Exam Simulator counter test fails); 28/28 targeted checks passed. Eight TypeScript files transpiled without syntax diagnostics; both changed CSS files parsed. Five offline Chromium layout fixtures passed (320, 390, 768, 1024, 1440px). Fixtures are not authenticated application tests. Full TypeScript type checking, Laravel runtime tests and production compilation are not verified. The archive excludes stale build assets and private runtime files; rebuild with npm ci and npm run build before opening the application.
