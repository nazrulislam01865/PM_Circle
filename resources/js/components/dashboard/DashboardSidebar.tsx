import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState, type MouseEvent } from 'react';
import {
    Award, Bookmark, BookOpen, CalendarDays, ClipboardCheck, FileCheck2,
    ChevronDown, ChevronLeft, ClipboardList, Crown, History,
    Home, Info, LayoutGrid, CirclePlay, LockKeyhole, MessagesSquare, Mic, Settings, Sparkle, Sparkles,
    UserRound, UsersRound, X,
} from 'lucide-react';
import { Brand } from '@/components/pm/Brand';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { DashboardShellData } from '@/types/dashboard';
import { memberSidebarActive, memberSidebarContains, memberSidebarGroups, memberSidebarHasAi, type MemberSidebarItem, type MemberSidebarEntry } from './memberSidebarNavigation';

const icons = { home: Home, learning: CirclePlay, 'course-group': BookOpen, courses: LayoutGrid, certificates: Award, exams: ClipboardList, pmp: ClipboardCheck, scrum: FileCheck2,
    challenge: CalendarDays, profile: UserRound,
    resume: Sparkles, interview: Mic, badges: Award, community: MessagesSquare, members: UsersRound,
    saved: Bookmark, 'saved-courses': Bookmark, plan: Crown, settings: Settings, activity: History, help: Info };

function AiBadge() {
    return <span className="pm-member-ai-badge" aria-hidden="true"><Sparkle aria-hidden="true"/>AI</span>;
}

function SidebarLabel({ item }: { item: Pick<MemberSidebarItem, 'id' | 'label'> }) {
    const hasAi = memberSidebarHasAi(item.id);
    return <><span className={hasAi ? 'pm-member-parent-label' : undefined}>{item.label}</span>{hasAi && <AiBadge/>}</>;
}

export function DashboardSidebar({ dashboard, open, close, collapsed, onToggle }: {
    dashboard: DashboardShellData;
    open: boolean;
    close: () => void;
    collapsed: boolean;
    onToggle: () => void;
}) {
    const { url, props } = usePage<{ memberShell?: DashboardShellData }>();
    const access = props.memberShell?.featureAccess ?? dashboard.featureAccess;
    const active = memberSidebarActive(url);
    const activeGroup = memberSidebarGroups.find(group => group.items.some(item => memberSidebarContains(item, active)))?.title;
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(memberSidebarGroups.map(group => [group.title, group.title === 'Learn & practise' || group.title === activeGroup])),
    );
    const [expandedSubmenus, setExpandedSubmenus] = useState<Record<string, boolean>>(() => ({
        'course-group': true, exams: memberSidebarGroups[0].items.some(item => item.id === 'exams' && memberSidebarContains(item, active)),
    }));
    useEffect(() => {
        const destination = memberSidebarGroups.flatMap(group => group.items).find(item => 'children' in item && memberSidebarContains(item, active));
        if (destination) setExpandedSubmenus(previous => previous[destination.id] ? previous : { ...previous, [destination.id]: true });
    }, [active, url]);
    // Open the destination group on navigation, but allow users to collapse it manually.
    useEffect(() => {
        if (activeGroup) setExpandedGroups(previous => previous[activeGroup] ? previous : { ...previous, [activeGroup]: true });
    }, [activeGroup, url]);
    const compact = collapsed && !open;
    const toggleGroup = (event: MouseEvent<HTMLElement>, title: string) => {
        event.preventDefault();
        setExpandedGroups(previous => ({ ...previous, [title]: !previous[title] }));
    };
    const renderItem = (item: MemberSidebarItem, support = false, nested = false) => {
        const Icon = icons[item.id];
        const locked = Boolean(item.premium && !(item.id === 'interview' ? access?.interview : item.id === 'badges' ? access?.achievements : item.id === 'activity' ? access?.activity : access?.examSimulator));
        const requiredPlan = 'Plus or Pro';
        const selected = active === item.id || (item.id === 'exams' && memberSidebarGroups[0].items.some(entry => entry.id === 'exams' && memberSidebarContains(entry, active)));
        const className = `pm-dash-nav-link${support ? ' pm-member-support-link' : ''}${nested ? ' pm-member-exam-child' : ''}${selected ? ' is-active' : ''}`;
        const content = <><Icon className="pm-member-nav-icon" size={20} strokeWidth={1.9} aria-hidden="true"/><SidebarLabel item={item}/>
            {locked && <LockKeyhole className="pm-dash-nav-lock" size={14} aria-hidden="true"/>}</>;
        if (locked) return <Dialog key={item.id}>
            <DialogTrigger asChild><button type="button" className={className} aria-label={`${item.label} — ${requiredPlan} required`} aria-description={memberSidebarHasAi(item.id) ? 'Includes AI features' : undefined} title={`${requiredPlan} required`}>{content}</button></DialogTrigger>
            <DialogContent className="pm-member-policy-dialog">
                <DialogHeader><DialogTitle>{item.label}</DialogTitle><DialogDescription>This feature requires {requiredPlan}. View Plan &amp; usage to compare access.</DialogDescription></DialogHeader>
                <DialogFooter>{item.id === 'interview' && <DialogClose asChild><Link href="/interview-preparation/results" onClick={close} className="pm-button pm-button-outline">Previous results</Link></DialogClose>}<DialogClose asChild><button type="button" className="pm-button pm-button-outline">Close</button></DialogClose><DialogClose asChild><Link href="/membership" onClick={close} className="pm-button">View Plan &amp; usage</Link></DialogClose></DialogFooter>
            </DialogContent>
        </Dialog>;
        return <Link key={item.id} href={item.href} onClick={close} className={className}
            aria-current={selected ? 'page' : undefined} aria-label={item.label} aria-description={memberSidebarHasAi(item.id) ? 'Includes AI features' : undefined} title={compact ? item.label : undefined}>{content}</Link>;
    };
    const renderEntry = (entry: MemberSidebarEntry) => {
        if (!('children' in entry)) return renderItem(entry);
        // Free members may browse simulators and use public samples; full exam APIs remain gated.
        if (entry.id === 'exams' && !access?.examSimulator) return renderItem({ id: entry.id, label: entry.label, href: '/simulators' });
        const Icon = icons[entry.id];
        const expanded = Boolean(expandedSubmenus[entry.id]);
        const selected = memberSidebarContains(entry, active);
        const submenuId = `pm-member-${entry.id}-submenu`;
        return <div className="pm-member-exam-group" key={entry.id}>
            <button type="button" className={`pm-dash-nav-link pm-member-exam-toggle${(active === entry.id || (selected && !expanded)) ? ' is-active' : ''}`}
                aria-label={entry.label} aria-description={memberSidebarHasAi(entry.id) ? 'Includes AI features' : undefined} title={compact ? entry.label : undefined}
                aria-expanded={expanded} aria-controls={submenuId}
                onClick={() => setExpandedSubmenus(previous => ({ ...previous, [entry.id]: !expanded }))}>
                <Icon className="pm-member-nav-icon" size={20} strokeWidth={1.9} aria-hidden="true"/>
                <SidebarLabel item={entry}/><ChevronDown className="pm-member-exam-chevron" size={16} aria-hidden="true"/>
            </button>
            <div id={submenuId} className="pm-member-exam-submenu" hidden={!expanded}>
                {entry.children.map(item => renderItem(item, false, true))}
            </div>
        </div>;
    };
    return <>
        {open && <button className="pm-dash-scrim" type="button" aria-label="Close member navigation" onClick={close}/>}
        <aside id="pm-member-sidebar" className={`pm-dash-sidebar pm-member-restored-sidebar${open ? ' is-open' : ''}${compact ? ' is-collapsed' : ''}`} aria-label="Member navigation">
            <div className="pm-dash-side-logo">
                <Brand href="/dashboard"/>
                {!compact && <button type="button" className="pm-dash-sidebar-close" aria-label="Collapse navigation" aria-expanded={true} aria-controls="pm-member-sidebar" onClick={onToggle}>
                    <ChevronLeft size={20}/>
                </button>}
                <button type="button" className="pm-dash-drawer-close" aria-label="Close navigation" onClick={close}><X size={22}/></button>
            </div>
            <nav className="pm-dash-sidebar-links" aria-label="Member sections">
                {renderItem({ id: 'home', label: 'Home', href: '/dashboard' })}
                {memberSidebarGroups.map(group => <details className="pm-member-sidebar-group" key={group.title} open={compact || expandedGroups[group.title]}>
                    <summary onClick={event => toggleGroup(event, group.title)}><span>{group.title}</span><ChevronDown size={16} aria-hidden="true"/></summary>
                    <div className="pm-member-sidebar-submenu">{group.items.map(renderEntry)}</div>
                </details>)}
            </nav>
            <div className="pm-member-sidebar-support">{renderItem({ id: 'help', label: 'Help Centre', href: '/help-center' }, true)}</div>
        </aside>
    </>;
}
