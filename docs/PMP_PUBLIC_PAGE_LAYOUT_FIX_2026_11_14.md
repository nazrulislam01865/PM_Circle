# PMP public page layout and footer correction - 14 November 2026

## Scope
- Corrected two-column overlap by removing 100% min-height from question/AI subpanels and making sample question and AI study assistance separate full-width SectionCard components.
- Replaced the non-interactive learner video image with a real HTML5 video player, controls, responsive sizing and a visible load-error fallback. No image is used as a video substitute.
- Removed the testimonial "Sample layout" badge without changing carousel interactions.
- Aligned footer gradient, spacing and colored social controls closer to the supplied prototype. Explore, Help Center, Contact, Privacy and Terms are all working navigation links; social icons are external platform links.
- Added minimal static /help-center and /contact destinations (a shared Inertia Support page) to avoid linking to nonexistent routes. No database, API, queue or migration changes.

## Video source and operational note
The uploaded project contains **no real video file**. The page now has an HTML5 `<video controls>` player with sample stock footage URL from Pexels (woman speaking to camera). It is *not an actual PM Circle learner testimonial*. Its remote playback could not be verified in this sandbox. To use approved footage, place the MP4 in `public/video/pmp-learner-story.mp4` and set `VITE_PMP_LEARNER_VIDEO_URL=/video/pmp-learner-story.mp4` in `.env`, then rebuild frontend assets. Keep the filename and content administrator-approved; do not present staged footage as a customer endorsement. The player fails gracefully if the video cannot load.

## External links
The archive does not contain PM Circle's verified social profile URLs. Social icons therefore link to their platforms' homepages and are named accordingly ("Open LinkedIn" etc.), **not** asserted to be official PM Circle accounts. Replace these destinations with confirmed account URLs before production release.

Help Center links to the public PMP FAQ, courses and community. Contact is an informative public destination, but a support email/form was not invented because the project contains no approved address or support submission endpoint.

## Verification
Run `php tests/Regression/PublicPmpPrototypeStaticCheck.php` and `npm run build` locally. Then browser-check desktop/tablet/mobile layout, click all footer links, and test video playback with a network connection. Existing `/exams/pmp` exam functionality is unchanged.
