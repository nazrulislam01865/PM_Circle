/** Approved member menu order, with the requested nested exam navigation. */
export type MemberSidebarId = 'home' | 'learning' | 'courses' | 'exams' | 'pmp' | 'scrum' | 'project' | 'challenge' | 'profile' | 'resume' | 'interview' | 'badges' | 'community' | 'members' | 'saved' | 'plan' | 'settings' | 'activity' | 'help';
export type MemberSidebarItem = { id: MemberSidebarId; label: string; href: string; premium?: boolean };
export type MemberSidebarEntry = MemberSidebarItem | { id: 'exams'; label: string; children: MemberSidebarItem[]; premium: true };
export const memberSidebarGroups: { title: string; items: MemberSidebarEntry[] }[] = [
    { title: 'Learn & practise', items: [
        { id: 'learning', label: 'My learning', href: '/dashboard/learning?tab=my-learning' },
        { id: 'courses', label: 'Browse courses', href: '/learning' },
        { id: 'exams', label: 'Exam Simulator', premium: true, children: [
            { id: 'pmp', label: 'PMP exams', href: '/exams/pmp', premium: true },
            { id: 'scrum', label: 'Scrum / CSM exams', href: '/exams/scrum', premium: true },
        ] },
        { id: 'project', label: 'Project Simulator', href: '/simulators/project' },
        { id: 'challenge', label: 'Daily challenge', href: '/dashboard/daily-challenge' },
    ] },
    { title: 'Profile & career', items: [
        { id: 'profile', label: 'My profile', href: '/settings/profile' },
        { id: 'resume', label: 'AI Resume Assistant', href: '/dashboard/resume-assistant', premium: true },
        { id: 'interview', label: 'Interview preparation', href: '/interview-preparation' },
        { id: 'badges', label: 'Badges', href: '/dashboard/features/achievements' },
    ] },
    { title: 'Community', items: [
        { id: 'community', label: 'Community feed', href: '/community' },
        { id: 'members', label: 'Members', href: '/members' },
        { id: 'saved', label: 'Saved posts', href: '/saved-posts' },
    ] },
    { title: 'Account', items: [
        { id: 'plan', label: 'Plan & usage', href: '/membership' },
        { id: 'settings', label: 'Settings', href: '/settings/security' },
        { id: 'activity', label: 'Activity log', href: '/activity-log' },
    ] },
];

export function memberSidebarContains(entry: MemberSidebarEntry, id: MemberSidebarId | undefined): boolean {
    return entry.id === id || ('children' in entry && entry.children.some(child => child.id === id));
}

export function memberSidebarActive(url: string): MemberSidebarId | undefined {
    const parsed = new URL(url, 'https://pm-circle.local');
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    const within = (base: string) => path === base || path.startsWith(`${base}/`);
    if (path === '/dashboard' || path === '/dashboard/home') return parsed.searchParams.get('view') === 'community' ? 'community' : 'home';
    if (within('/dashboard/learning')) return within('/dashboard/learning/courses') || parsed.searchParams.get('tab') === 'courses' ? 'courses' : 'learning';
    if (within('/learning')) return path === '/learning' || within('/learning/courses') ? 'courses' : 'learning';
    if (within('/dashboard/daily-challenge') || within('/daily-challenge') || within('/scenarios')) return 'challenge';
    if (path === '/simulators' || path === '/exam-simulator') return 'exams';
    if (['/simulators/capm', '/simulators/pmi-acp', '/simulators/business-analysis'].some(within)) return 'exams';
    if (within('/exams/pmp') || within('/exam-simulator/pmp') || path === '/dashboard/features/pmp') return 'pmp';
    if (within('/exams/scrum') || within('/simulators/scrum') || path === '/dashboard/features/scrum') return 'scrum';
    if (within('/simulators/project') || path === '/dashboard/features/simulations') return 'project';
    if (within('/settings/profile')) return 'profile';
    if (within('/dashboard/resume-assistant') || within('/ai-resume-assistant') || path === '/dashboard/features/resume') return 'resume';
    if (within('/interview-preparation')) return 'interview';
    if (path === '/dashboard/features/achievements') return 'badges';
    if (within('/community') || within('/posts')) return 'community';
    if (within('/members')) return 'members';
    if (within('/saved-posts')) return 'saved';
    if (within('/membership') || within('/billing')) return 'plan';
    if (within('/settings') || path === '/dashboard/features/notifications') return 'settings';
    if (within('/activity-log')) return 'activity';
    if (within('/help-center') || within('/contact')) return 'help';
    return undefined;
}
