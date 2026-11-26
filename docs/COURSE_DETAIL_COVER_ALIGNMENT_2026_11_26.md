# Course detail cover alignment

The shared course detail hero uses a two-column grid. Previously the cover had a preferred 16:10 aspect ratio and start alignment; a taller information column left unused space below the image. The cover now stretches to the grid row, while its image fills the cover with object-fit: cover (no distortion, possible additional cropping). Its preferred aspect ratio is retained as the natural size and on the stacked mobile layout. The heading, tags, action buttons and section navigation are unchanged. Shared spacing, radius, and colors remain in use. Applies to public and member detail pages. No backend, dependencies, or database changes.

Verification: 20 Chromium layout fixture checks using project CSS at five viewport sizes, including PMP and Stakeholder courses in guest and member variants. Full authenticated application and production build not run (dependencies absent).
