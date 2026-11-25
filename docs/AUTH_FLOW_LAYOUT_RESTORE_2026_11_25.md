# Restore authentication and guided flow layouts

Restored the eight authentication/onboarding/Discover PM source and CSS files byte-for-byte from Archive 6(2).zip, the last supplied source before the public page banner change. Login, forgot/reset password, all three signup steps and Discover PM retain their original card headings, stepper, form styles and shared navigation. The other public pages retain their shared page banner and homepage header isolation fixes; public Help Centre stays footer-only. No routes, backend logic, database or dependency changes.

Regression assertions now explicitly exclude authentication and Discover PM from the public content page banner requirement and preserve the original signup-scoped typography.
