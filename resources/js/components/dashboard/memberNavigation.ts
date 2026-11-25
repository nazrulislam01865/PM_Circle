/** Authenticated member navigation only. Public and administrator menus are unchanged. */
export type MemberSection = 'home' | 'challenge' | 'community' | 'learn' | 'exams';
export type MemberSecondaryLink = { id: string; label: string; href: string; disabled?: boolean };

export type MemberNavigationState = {
    section: MemberSection;
    active: string;
    secondary: MemberSecondaryLink[];
};

const secondary: Record<MemberSection, MemberSecondaryLink[]> = {
    home: [
        { id: 'overview', label: 'Overview', href: '/dashboard' },
        { id: 'profile', label: 'My profile', href: '/settings/profile' },
        { id: 'achievements', label: 'Achievements', href: '/dashboard/features/achievements' },
        { id: 'activity', label: 'Activity Log', href: '/activity-log' },
        { id: 'settings', label: 'Settings', href: '/settings/security' },
    ],
    challenge: [
        { id: 'library', label: 'Daily Challenge', href: '/dashboard/daily-challenge' },
        { id: 'mine', label: 'My participation', href: '/dashboard/daily-challenge?tab=mine' },
    ],
    community: [
        { id: 'feed', label: 'Feed', href: '/dashboard?view=community' },
        { id: 'members', label: 'Members', href: '/members' },
    ],
    learn: [
        { id: 'courses', label: 'Course library', href: '/dashboard/learning?tab=courses' },
        { id: 'paths', label: 'My learning', href: '/dashboard/learning?tab=paths' },
        { id: 'practice', label: 'Practice', href: '/dashboard/learning?tab=practice' },
        { id: 'interview', label: 'Interview preparation', href: '/interview-preparation' },
    ],
    exams: [
        { id: 'pmp', label: 'PMP Exam Simulator', href: '/exams/pmp' },
        { id: 'scrum', label: 'Scrum Simulator', href: '/simulators/scrum' },
        { id: 'ba', label: 'BA Simulator', href: '', disabled: true },
    ],
};

/** Match real Laravel paths rather than maintaining separate state on every page. */
export function memberNavigationForUrl(url: string): MemberNavigationState {
    const parsed = new URL(url, 'https://pm-circle.local');
    const path = parsed.pathname.replace(/\/$/, '') || '/';
    const query = parsed.searchParams;
    let section: MemberSection = 'home';
    let active = 'overview';

    if (path.startsWith('/dashboard/daily-challenge') || path === '/daily-challenge' || path.startsWith('/scenarios/')) {
        section = 'challenge';
        active = query.get('tab') === 'mine' ? 'mine' : 'library';
    } else if (path === '/community' || path.startsWith('/posts/') || path === '/members' || path.startsWith('/members/') || path === '/saved-posts'
        || (path === '/dashboard' && query.get('view') === 'community')) {
        section = 'community';
        active = path === '/members' || path.startsWith('/members/') ? 'members'
            : path === '/saved-posts' ? 'saved'
            : path === '/community' && query.has('topic') ? 'topics'
            : 'feed';
    } else if (path.startsWith('/dashboard/learning') || path === '/learning' || path.startsWith('/learning/')
        || path.startsWith('/interview-preparation') || path.startsWith('/simulators/project')) {
        section = 'learn';
        active = path.startsWith('/interview-preparation') ? 'interview'
            : path.startsWith('/dashboard/learning') || path === '/learning'
                ? query.get('tab') === 'paths' || query.get('tab') === 'my-learning' ? 'paths'
                    : query.get('tab') === 'practice' ? 'practice' : 'courses'
                : 'courses';
    } else if (path.startsWith('/exams/') || path.startsWith('/exam-simulator/') || path.startsWith('/simulators/scrum')) {
        section = 'exams';
        active = path.startsWith('/simulators/scrum') ? 'scrum' : 'pmp';
    } else if (path === '/activity-log') {
        active = 'activity';
    } else if (path === '/settings/profile') {
        active = 'profile';
    } else if (path.startsWith('/settings/')) {
        active = 'settings';
    } else if (path === '/dashboard/features/achievements') {
        active = 'achievements';
    } else if (path === '/dashboard/features/insights') {
        // Legacy profile-insights reports stay available at their existing URL,
        // but the authenticated navigation now reserves this position for Activity Log.
        active = 'overview';
    }

    return { section, active, secondary: secondary[section] };
}
