/** Member breadcrumb policy. Only verified application routes are used as destinations. */
export type MemberCrumb = { label: string; href?: string };
export type BreadcrumbFallback = { title: string; currentLabel?: string; parents?: readonly MemberCrumb[] };
const home: MemberCrumb = { label: 'Home', href: '/dashboard' };
const learn: MemberCrumb = { label: 'Learn & Practice', href: '/learning' };
const exams: MemberCrumb = { label: 'Exam Simulator' }; // Sidebar group, not a navigable member page.
const profile: MemberCrumb = { label: 'My profile', href: '/settings/profile' };
const account: MemberCrumb = { label: 'Account' };
const career: MemberCrumb = { label: 'Profile & career' };
const community: MemberCrumb = { label: 'Community' };
const browse: MemberCrumb = { label: 'Browse courses', href: '/learning' };
const myLearning: MemberCrumb = { label: 'My learning', href: '/dashboard/learning/my-learning' };
const certificates: MemberCrumb = { label: 'Certificates', href: '/dashboard/learning/certificates' };
const pmp: MemberCrumb = { label: 'PMP exams', href: '/exams/pmp' };
const interview: MemberCrumb = { label: 'Interview preparation', href: '/interview-preparation' };
const challenge: MemberCrumb = { label: 'Daily challenge', href: '/dashboard/daily-challenge' };
const members: MemberCrumb = { label: 'Members', href: '/members' };
const feed: MemberCrumb = { label: 'Community feed', href: '/community' };
const help: MemberCrumb = { label: 'Help Centre', href: '/help-center' };
const settings: MemberCrumb = { label: 'Settings', href: '/settings/account' };
const text = (value: unknown, fallback: string): string => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const field = (value: unknown, key: string): unknown => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
const current = (label: string): MemberCrumb => ({ label });
const trail = (...parts: MemberCrumb[]): MemberCrumb[] => [home, ...parts].map((item, index, all) => index === all.length - 1 ? current(item.label) : item);

export function memberBreadcrumbs(url: string, props: Record<string, unknown> = {}, fallback?: BreadcrumbFallback): MemberCrumb[] {
    const parsed = new URL(url, 'https://pm-circle.local');
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    const tab = parsed.searchParams.get('tab');
    const within = (base: string) => path === base || path.startsWith(`${base}/`);
    if (path === '/' || path === '/dashboard' || path === '/dashboard/home') return parsed.searchParams.get('view') === 'community' ? trail(community, feed) : [];
    const learning = path.replace(/^\/dashboard(?=\/learning(?:\/|$))/, '');
    if (learning === '/learning') {
        if (tab === 'my-learning') return trail(learn, myLearning);
        if (tab === 'certificates') return trail(learn, certificates);
        if (tab === 'paths' || tab === 'practice' || tab === 'exams') return trail(learn, current(({paths:'Learning paths',practice:'Practice',exams:'Exam simulators'})[tab]));
        return trail(learn, browse);
    }
    if (learning === '/learning/my-learning') return trail(learn, myLearning);
    if (learning === '/learning/certificates') return trail(learn, certificates);
    if (learning.startsWith('/learning/certificates/')) return trail(learn, certificates, current('Certificate'));
    const course = learning.match(/^\/learning\/courses\/([^/]+)(?:\/(lessons|practice)\/\d+(\/result)?)?$/);
    if (course) {
        const title = text(field(props.course, 'title'), 'Course details');
        const detail = { label: title, href: `/learning/courses/${course[1]}` };
        if (course[2] === 'lessons') return trail(learn, myLearning, detail, current(text(field(props.lesson, 'title'), 'Lesson')));
        if (course[2] === 'practice') return trail(learn, browse, detail, current(course[3] ? 'Practice result' : 'Course practice'));
        return trail(learn, browse, detail);
    }
    if (learning === '/learning/skills-check') return trail(learn, current('Skills check'));
    if (learning === '/learning/starting-point-result') return trail(learn, current('Starting point recommendation'));
    const learningPath = learning.match(/^\/learning\/([^/]+)(?:\/modules\/\d+\/activities\/\d+)?$/);
    if (learningPath) {
        const parent = { label: 'Learning paths', href: '/dashboard/learning?tab=paths' };
        const detail = { label: text(field(props.path, 'title'), text(field(props.path, 'level'), 'Learning path')), href: `/learning/${learningPath[1]}` };
        return learning.includes('/activities/') ? trail(learn, parent, detail, current(text(field(props.activity, 'title'), 'Learning activity'))) : trail(learn, parent, detail);
    }
    if (within('/exams/pmp')) {
        if (path.endsWith('/review')) return trail(learn, exams, pmp, current('Question review'));
        if (path.endsWith('/result')) return trail(learn, exams, pmp, current('Exam result'));
        if (path.includes('/attempts/')) return trail(learn, exams, pmp, current('Mock exam'));
        return trail(learn, exams, pmp);
    }
    if (within('/exams/scrum') || within('/simulators/scrum')) return trail(learn, exams, current('Scrum / CSM exams'));
    if (path === '/simulators' || path === '/exam-simulator' || path === '/exam-simulator/pmp') return trail(learn, current('Browse Exam Simulators'));
    if (path === '/exam-simulator/pmp/details') return trail(learn, {label:'Browse Exam Simulators',href:'/simulators'}, current('PMP Exam Simulator'));
    if (within('/simulators')) return trail(learn, {label:'Browse Exam Simulators',href:'/simulators'}, current(text(props.title, fallback?.title ?? 'Exam simulator')));
    if (within('/dashboard/daily-challenge') || within('/daily-challenge') || within('/scenarios')) return props.scenario && (path.startsWith('/scenarios/') || path.startsWith('/dashboard/daily-challenge/')) ? trail(learn, challenge, current(text(field(props.scenario, 'title'), 'Challenge details'))) : trail(learn, challenge);
    if (path === '/settings/profile') {
        if (tab === 'assistant') return trail(career, current('AI Resume Assistant'));
        if (tab === 'edit' || tab === 'privacy') return trail(career, profile, current(tab === 'edit' ? 'Edit profile' : 'Privacy'));
        return trail(career, profile);
    }
    if (path === '/dashboard/resume-assistant' || path === '/ai-resume-assistant') return trail(career, current('AI Resume Assistant'));
    if (within('/interview-preparation')) {
        if (path.startsWith('/interview-preparation/sessions/')) return trail(career, interview, current('Practice interview'));
        if (path.startsWith('/interview-preparation/results/')) return trail(career, interview, {label:'Interview results',href:'/interview-preparation/results'}, current('Session results'));
        if (path.endsWith('/results')) return trail(career, interview, current('Interview results'));
        return trail(career, interview);
    }
    if (path === '/dashboard/features/achievements') return trail(career, current('Achievements'));
    if (path === '/dashboard/features/insights') return trail(career, profile, current('Profile insights'));
    if (path === '/dashboard/features/notifications') return trail(account, current('Notifications'));
    if (within('/members')) return path === '/members' ? trail(community, members) : trail(community, members, current(text(field(props.member,'name'), 'Member profile')));
    if (path === '/saved-posts') return trail(community, current('Saved posts'));
    if (path === '/saved-courses') return trail(career, current('Saved courses'));
    if (within('/posts')) return trail(community, feed, current('Member post'));
    if (within('/community')) return trail(community, feed);
    if (/^\/events\/host\/\d+\/registrants$/.test(path)) return trail(community, {label:'Events',href:'/events'}, {label:'My events',href:'/events/create'}, current('Registrants'));
    if (within('/events')) return path === '/events' ? trail(community, current('Events')) : trail(community, {label:'Events',href:'/events'}, current(path === '/events/create' ? 'Create event' : text(field(props.event,'title'), 'Event details')));
    if (path === '/membership' || path === '/pricing') return trail(account, current(path === '/pricing' ? 'Compare plans' : 'Plan & usage'));
    if (path === '/settings/account') return trail(account, settings);
    if (path === '/settings/security' || path === '/settings/appearance') return trail(account, settings, current(path.endsWith('security') ? 'Security' : 'Appearance'));
    if (path === '/activity-log') return trail(account, current('Activity log'));
    if (within('/help-center')) {
        if (path === '/help-center') return trail(help);
        if (path === '/help-center/requests') return trail(help, current('My support requests'));
        if (path.startsWith('/help-center/requests/')) return trail(help, {label:'My support requests',href:'/help-center/requests'}, current('Support request'));
        return trail(help, current(path.endsWith('/guides') ? 'Guides' : 'Contact support'));
    }
    if (within('/pm-trends')) return path === '/pm-trends' ? trail(current('Trends')) : trail({label:'Trends',href:'/pm-trends'}, current(fallback?.currentLabel ?? 'Report'));
    const publicLabels: Record<string, string> = {'/about':'About Us','/terms':'Terms and Conditions','/privacy':'Privacy Policy','/refund-policy':'Refund Policy','/contact':'Contact Us','/discover-pm':'Discover project management'};
    if (path === '/terms' || path === '/privacy') return trail(current(text(field(field(props.legalPage, 'content'), 'title'), publicLabels[path])));
    if (publicLabels[path]) return trail(current(publicLabels[path]));
    if (fallback) return trail(...(fallback.parents ?? []), current(fallback.currentLabel ?? fallback.title));
    if (typeof props.title === 'string' && props.title.trim()) return trail(current(props.title));
    // Never hide a legacy breadcrumb or invent a destination on an unregistered route.
    return [];
}
