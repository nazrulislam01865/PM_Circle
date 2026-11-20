/** Single policy for ordinary public, auth and member pages.
 * Dashboard and uninterrupted in-progress exams remain footer-free by design.
 * Completed exam reports, simulator landings and feature pages are content pages.
 */
export function shouldShowSiteFooter(pageUrl: string): boolean {
    const path = (pageUrl.split(/[?#]/, 1)[0] || '/').replace(/\/+$/, '') || '/';
    if (path === '/dashboard' || path === '/dashboard/home') return false;
    if (/^\/admin(?:\/|$)/.test(path)) return false;
    // The live exam is an uninterrupted timed workspace, not a normal content page.
    if (/^\/exams\/pmp\/attempts\/\d+$/.test(path)) return false;
    return true;
}
