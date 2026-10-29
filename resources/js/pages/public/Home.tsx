import { Head, Link, usePage } from '@inertiajs/react';
import { BriefcaseBusiness, ChartNoAxesColumnIncreasing, ClipboardCheck, Users } from 'lucide-react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { SectionHead } from '@/components/pm/SectionHead';
import { PostCard, type PostPreview } from '@/components/community/PostCard';
import { TopicPills } from '@/components/community/TopicPills';
import { CommunityOrbit } from '@/components/home/CommunityOrbit';
import { ScenarioPreview, type ScenarioSummary } from '@/components/home/ScenarioPreview';
import { HomeMembers, SkillSidebar } from '@/components/home/HomeSidebar';
import { CareerHighlights } from '@/components/home/CareerHighlights';
import { NotebookPen } from 'lucide-react';

type Member = { id: number; name: string; profile?: { role?: string } | null };
type Response = { id: number; body: string; created_at: string; user: { name: string } };
type Props = {
    scenario: ScenarioSummary | null; scenarioResponses: Response[];
    posts: PostPreview[]; members: Member[];
    counts: { members: number; discussions: number; scenarios: number };
    showDemoStatistics: boolean;
};
export default function Home({ scenario, scenarioResponses = [], posts, members, counts, showDemoStatistics }: Props) {
    const { auth } = usePage<{ auth: { user: unknown | null } }>().props;
    const summary = [
        { label: 'Community members', value: showDemoStatistics ? 12480 : counts.members, icon: Users },
        { label: 'Jobs posted to date', value: showDemoStatistics ? 1260 : 0, icon: BriefcaseBusiness },
        { label: 'Learning hours logged', value: showDemoStatistics ? 38650 : 0, icon: ChartNoAxesColumnIncreasing },
        { label: 'Scenarios completed', value: showDemoStatistics ? 8420 : counts.scenarios, icon: ClipboardCheck },
    ];
    return <PublicLayout><Head title="Learn together. Practise daily. Grow your career"/>
        <section className="pm-hero"><div className="pm-container pm-hero-inner"><div className="pm-hero-copy">
            <p className="pm-kicker">The 360° community for project managers</p><h1>Your next chapter in<br className="pm-desktop-break"/> project management<br className="pm-desktop-break"/> starts here.</h1>
            <p>Learn by doing. Share what works. Meet your people. Build your career.</p>
            <div className="pm-hero-actions"><Link href={auth?.user ? '/dashboard' : '/register'} className="pm-button">Join the community — free</Link><Link href="/community" className="pm-button pm-button-outline">Explore today's discussion</Link></div>
        </div><CommunityOrbit/></div></section>
        <div className="pm-container"><section className="pm-stat-panel pm-panel"><h2>Growing together. Making a difference.</h2><div className="pm-stats">{summary.map(item => <div className="pm-stat" key={item.label}><item.icon/><div><strong>{item.value.toLocaleString('en-US')}</strong><small>{item.label}</small></div></div>)}</div>
            {showDemoStatistics && <p className="pm-stats-caption">Illustrative figures for this concept. Live totals will appear at launch.</p>}
        </section>
        <div className="pm-two-column pm-home-section"><div className="pm-stack">
            <ScenarioPreview scenario={scenario} responses={scenarioResponses} demo={showDemoStatistics}/>
            <section className="pm-panel pm-community-panel"><SectionHead href="/community" linkText="View all posts">From the community</SectionHead><TopicPills active="All" />
                {posts.length ? posts.slice(0, 2).map(post => <PostCard key={post.id} post={post}/>) : <p className="pm-empty">The discussion is just getting started. Share your first lesson or question to help others grow.</p>}
                <div className="pm-join-strip"><NotebookPen size={31} color="var(--pm-primary)"/><div><strong>Have a lesson worth sharing?</strong><small>Share your experience, ask a question or get feedback from the community.</small></div><Link href={auth?.user ? '/community' : '/register'} className="pm-button pm-button-sm">Join to share</Link></div>
            </section>
        </div><aside className="pm-stack"><HomeMembers members={members} demo={showDemoStatistics}/><SkillSidebar/></aside></div></div>
        <CareerHighlights demo={showDemoStatistics}/>
    </PublicLayout>;
}
