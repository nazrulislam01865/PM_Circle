import { Link } from '@inertiajs/react';
import { ChartNoAxesColumnIncreasing, ChevronRight, ClipboardCheck } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';

type Member = { id: number; name: string; profile?: { role?: string } | null };
export function HomeMembers({ members, demo }: { members: Member[]; demo: boolean }) {
    const ordered = demo ? [...members].sort((a,b) => ['Sara Ahmed','Daniel Chen','Meera Das'].indexOf(a.name) - ['Sara Ahmed','Daniel Chen','Meera Das'].indexOf(b.name)) : members;
    return <section className="pm-sidebar-panel pm-panel"><h3>New to the circle</h3>
        {ordered.length ? ordered.map(member => <Link href="/members" key={member.id} className="pm-member"><Avatar name={member.name} size={43}/><div><strong>{member.name}</strong><p>{member.profile?.role || 'Community member'}</p></div><ChevronRight size={17}/></Link>) : <p className="pm-empty">Be among the first members to join the community.</p>}
        <small>Join to view full profiles and connect.</small><Link href="/members" className="pm-button pm-block">Meet the members</Link>
    </section>;
}
export function SkillSidebar() {
    const skills = [
        { title: 'PMP practice', desc: 'Sample questions and explanations', icon: ClipboardCheck },
        { title: 'Scrum / CSM practice', desc: 'Realistic questions and scenarios', icon: ClipboardCheck },
        { title: 'Project simulations', desc: 'Hands-on scenario-based learning', icon: ChartNoAxesColumnIncreasing },
    ];
    return <section className="pm-sidebar-panel pm-panel"><h3>Build your next skill</h3>{skills.map(skill => <Link key={skill.title} className="pm-skill" href="/learning"><skill.icon/><span><strong>{skill.title}</strong><small>{skill.desc}</small></span><ChevronRight size={16}/></Link>)}</section>;
}
