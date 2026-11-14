/** One footer visibility policy shared by public, auth and member page shells.
 * Do not add footers to the homepage or simulator experiences. */
export function shouldShowSiteFooter(pageUrl: string): boolean {
    const path = (pageUrl.split(/[?#]/, 1)[0] || '/').replace(/\/+$/, '') || '/';
    if (path === '/' || path === '/home' || path === '/dashboard' || path === '/dashboard/home') return false;
    if (/^\/(?:exams|exam-simulator|simulators)(?:\/|$)/.test(path)) return false;
    if (/^\/dashboard\/features\/(?:scrum|simulations)(?:\/|$)/.test(path)) return false;
    return true;
}
