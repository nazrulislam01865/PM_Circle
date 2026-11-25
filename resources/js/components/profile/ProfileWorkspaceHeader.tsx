import { Link } from '@inertiajs/react';
import { Eye, Pencil } from 'lucide-react';

export type ProfileTab = 'overview' | 'edit' | 'imports' | 'privacy' | 'assistant';
const descriptions: Record<ProfileTab, string> = {
    overview: 'Manage your professional profile and build your résumé.',
    edit: 'Manage your professional profile and who can see it.',
    imports: 'Manage your information, skills and preferences to get the most out of PM Circle.',
    privacy: 'Manage your professional profile and who can see it.',
    assistant: 'Manage your professional profile and build your résumé.',
};
const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'edit', label: 'Edit profile' },
    { id: 'imports', label: 'Resume & imports' }, { id: 'assistant', label: 'AI Resume Assistant' },
    { id: 'privacy', label: 'Privacy' },
];
export function ProfileWorkspaceHeader({ tab, memberId, canUseAssistant, onTab }: { tab: ProfileTab; memberId: number; canUseAssistant: boolean; onTab: (tab: ProfileTab) => void }) {
    return <>
        <header className="pm-profile-top-bar">
            <div className="pm-profile-top-titles"><h1>My profile</h1><p>{descriptions[tab]}</p></div>
            <div className="pm-profile-top-actions">
                {tab === 'overview' && <Link href={`/members/${memberId}`} className="pm-btn pm-btn-secondary" title="Preview your public profile"><Eye size={17}/> Preview public profile</Link>}
                {(tab === 'overview' || tab === 'assistant') && <button type="button" className="pm-btn pm-btn-primary" onClick={()=>onTab('edit')}><Pencil size={17}/> Edit profile</button>}
            </div>
        </header>
        <nav className="pm-profile-nav-tabs pm-member-tertiary-sticky" aria-label="Profile tabs">
            {tabs.filter(item=>item.id !== 'assistant' || canUseAssistant).map(item=><button key={item.id} type="button" onClick={()=>onTab(item.id)} className={`pm-profile-tab-item ${tab===item.id?'is-active':''}`} aria-current={tab===item.id?'page':undefined}>{item.label}</button>)}
        </nav>
    </>;
}
