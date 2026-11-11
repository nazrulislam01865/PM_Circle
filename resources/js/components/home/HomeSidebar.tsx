import { Link } from '@inertiajs/react';
import { ChartNoAxesColumnIncreasing, ChevronRight, ClipboardCheck, FileCheck2 } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';
import type { HomeContent, HomeMember } from '@/types/home';
import { HomeContentIcon, type HomepageIconAssets } from '@/components/home/HomeContentIcon';

const skillIcons = {
    practice: ClipboardCheck,
    scrum: FileCheck2,
    simulation: ChartNoAxesColumnIncreasing,
};

export function HomeMembers({ members, content }: { members: HomeMember[]; content?: HomeContent['members'] }) {
    return <section className="pm-sidebar-panel pm-panel"><h3>{content?.heading}</h3>
        {members.length ? members.map(member => <Link href={`/members/${member.id}`} key={member.id} className="pm-member">
            <Avatar name={member.name} src={member.profile?.avatar_path} size={43}/>
            <div><strong>{member.name}</strong><p>{member.profile?.role || 'Community member'}</p></div>
            <ChevronRight size={17}/>
        </Link>) : <p className="pm-empty">{content?.empty_message ?? 'Be among the first members to join the community.'}</p>}
        <small>{content?.hint}</small><Link href="/members" className="pm-button pm-block">{content?.button_label}</Link>
    </section>;
}

export function SkillSidebar({ content, iconAssets }: { content?: HomeContent['skills']; iconAssets?: HomepageIconAssets }) {
    return <section className="pm-sidebar-panel pm-panel"><h3>{content?.heading}</h3>
        {(content?.items ?? []).map(skill => {
            const Icon = skillIcons[skill.icon as keyof typeof skillIcons] ?? ClipboardCheck;
            return <Link key={skill.title} className="pm-skill" href={skill.url}>
                <HomeContentIcon category="skills_icon" icon={skill.icon} assets={iconAssets} fallback={Icon}/><span><strong>{skill.title}</strong><small>{skill.description}</small></span><ChevronRight size={16}/>
            </Link>;
        })}
    </section>;
}
