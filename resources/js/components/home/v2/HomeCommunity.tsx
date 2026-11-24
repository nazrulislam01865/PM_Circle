import { Link, router } from '@inertiajs/react';
import { Pencil, ArrowRight, Share2 } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';
import { PostCardV2 } from '@/components/community/PostCardV2';
import { ReactionPicker, HomeCommentAction, useHomeShare, type RequestToJoin } from '@/components/home/HomeEngagement';
import { EngagementOverflowMenu } from '@/components/community/EngagementOverflowMenu';
import { EngagementActionBar } from '@/components/community/EngagementActionBar';
import type { ScenarioSummary } from '@/components/home/ScenarioPreview';
import type { HomePost } from '@/components/home/HomePostPreview';
import type { HomeContent, HomeMember } from '@/types/home';
import { HomeSectionTitle } from './HomeUi';
import { PreviewEngagementActions } from './PreviewEngagementActions';

const samplePosts: HomePost[] = [
    { id: -1, title: 'How do you handle a last-minute scope request?', body: 'Our sponsor asked for an extra report two days before launch. What would you ask before deciding whether to take it on?', topic: 'Questions', likes_count: 8, comments_count: 0, published_at: null, author: { name: 'Nadia Rahman', profile: { role: 'Project Coordinator' } } },
    { id: -2, title: 'What makes a retrospective worth attending?', body: 'One change helped our team: we started each retro by checking whether the last action item actually happened.', topic: 'Discussion', likes_count: 5, comments_count: 0, published_at: null, author: { name: 'Tanvir Hasan', profile: { role: 'Scrum Master' } } },
];

function DailyScenarioCard({ scenario, canInteract, onJoin, content }: {
    scenario: ScenarioSummary | null; canInteract: boolean; onJoin: RequestToJoin; content?: HomeContent['scenario'];
}) {
    const url = scenario ? `/scenarios/${encodeURIComponent(scenario.slug)}` : '/daily-challenge';
    const readUrl = content?.read_url || url;
    const share = useHomeShare({ href: url, canInteract: canInteract && Boolean(scenario), onJoin });
    return <article className="pm-v2-scenario-card"><div className="pm-v2-post-author"><span className="pm-v2-official-avatar" aria-label="PM Circle">PM</span><div>
        <strong>PM Circle</strong><small>Today’s Daily Challenge</small></div>
        <EngagementOverflowMenu label="More scenario options" actions={[
            { label: share.copied ? 'Copied' : 'Share', icon: <Share2 size={17}/>, onSelect: () => { void share.share(); } },
            { label: 'Read discussion', icon: <ArrowRight size={17}/>, onSelect: () => router.visit(readUrl) },
        ]}/></div>
        <div className="pm-v2-post-content"><h3><Link href={url}>{scenario?.title || 'Balancing scope, cost, and risk on a Bangladesh rail upgrade'}</Link></h3>
            <p>{scenario?.summary || 'A pilot upgrade is running behind. A supplier proposes a cheaper workaround that could affect testing. What would you check before recommending a decision?'}</p>
            <div className="pm-v2-topic-list">{(scenario?.topics?.length ? scenario.topics.slice(0, 2) : ['Scope and change', 'Risk management']).map(topic => <span key={topic}>{topic}</span>)}</div>
            <Link href={content?.read_url || url} className="pm-v2-scenario-link pm-post-desktop-action">{content?.read_button_label && content.read_button_label !== 'Read scenario' ? content.read_button_label : 'Read discussion'}</Link>
            {!scenario && <small className="sr-only">Illustrative scenario · View current challenges</small>}
        </div>
        <div className="pm-v2-scenario-actions">{scenario ? <EngagementActionBar className="pm-post-engagement-row pm-scenario-engagement-row">
            <ReactionPicker endpoint={`/scenarios/${scenario.id}/reactions`} initial={scenario.viewer_reaction}
                total={scenario.reactions_count} canInteract={canInteract} onJoin={onJoin} label="scenario"/>
            <HomeCommentAction href={url} label="Comment" canInteract={canInteract} onJoin={onJoin}/>
            <button type="button" className="pm-home-action pm-post-desktop-action" onClick={() => { void share.share(); }}><Share2 size={19} aria-hidden="true"/>{share.copied ? 'Copied' : 'Share'}</button>
            {share.error && <span className="pm-post-secondary-error" role="alert">{share.error}</span>}
            {share.copied && <span className="pm-post-copy-status" role="status">Link copied.</span>}
        </EngagementActionBar> : <PreviewEngagementActions href={url} onJoin={onJoin} reactions={12} mobileCompact/> }</div>
    </article>;
}

function CommunitySidebar({ members, content, skills }: {
    members: HomeMember[]; content?: HomeContent['members']; skills?: HomeContent['skills'];
}) {
    const people = members.length ? members.slice(0, 2) : [
        { id: 0, name: 'Ayesha Farin', profile: { role: 'Project Coordinator' } },
        { id: 0, name: 'Rafi Hasan', profile: { role: 'Business Analyst' } },
    ];
    const skillLinks = skills?.items?.length ? skills.items : [
        { title: 'PMP practice', description: '', url: '/exam-simulator/pmp', icon: 'practice' },
        { title: 'Scrum and CSM practice', description: '', url: '/simulators/scrum', icon: 'scrum' },
        { title: 'Project management courses', description: '', url: '/learning', icon: 'learn' },
    ];
    return <aside className="pm-v2-community-sidebar" aria-label="Community resources">
        <section className="pm-v2-aside-box"><h3>{content?.heading || 'New to the circle'}</h3><p>Meet other professionals learning and practising project management.</p>
            {people.map((person, i) => <div className="pm-v2-member" key={`${person.name}-${i}`}>
                <Avatar name={person.name} src={person.profile?.avatar_path} size={33}/><div><strong>{person.name}</strong><small>{person.profile?.role || 'Community member'}</small></div>
            </div>)}
            {!members.length && <small className="sr-only">Example member profiles</small>}
            <Link href={content?.button_url || '/members'} className="pm-v2-text-link">Meet the members ›</Link></section>
        <section className="pm-v2-aside-box"><h3>{skills?.heading || 'Build your next skill'}</h3>
            {skillLinks.slice(0, 3).map((skill, i) => <Link href={skill.url} className="pm-v2-skill" key={skill.title}>
                <span className={`pm-v2-skill-icon pm-v2-skill-icon-${i}`}>{i === 0 ? '✓' : i === 1 ? '◌' : '▤'}</span>{skill.title}<span aria-hidden="true">›</span>
            </Link>)}
        </section>
    </aside>;
}

export function HomeCommunity({ scenario, posts, members, content, canInteract, onJoin, visibility }: {
    scenario: ScenarioSummary | null; posts: HomePost[]; members: HomeMember[]; content: HomeContent;
    canInteract: boolean; onJoin: RequestToJoin;
    visibility: { scenario: boolean; community: boolean; members: boolean; skills: boolean };
}) {
    const showMain = visibility.scenario || visibility.community;
    const showSide = visibility.members || visibility.skills;
    if (!showMain && !showSide) return null;
    return <section className="pm-v2-community-section" id="pm-v2-community" aria-labelledby="pm-v2-community-title"><div className="pm-v2-container">
        <HomeSectionTitle id="pm-v2-community-title" title="Learn with the community"
            description="Compare approaches to real project decisions and learn from how others handled them."/>
        <div className={`pm-v2-community-columns${!showMain || !showSide ? ' pm-v2-community-one-column' : ''}`}>
            {showMain && <div className="pm-v2-community-feed">
                {visibility.community && <button type="button" className="pm-v2-compose" onClick={() => onJoin('start a discussion')}>
                    <span>PM</span><span><Pencil aria-hidden="true"/> Start a discussion</span></button>}
                {visibility.scenario && <DailyScenarioCard scenario={scenario} canInteract={canInteract} onJoin={onJoin} content={content.scenario}/>}
                {visibility.community && <div className="pm-v2-community-posts">
                    <div className="pm-v2-subsection-line">From the community</div>
                    {(posts.length ? posts : samplePosts).map(post => <PostCardV2 key={post.id} post={post} sample={!posts.length}
                        canInteract={canInteract} onJoin={onJoin}/>) }
                    {!posts.length && <p className="sr-only">Example discussions · <Link href="/community">Browse published posts</Link></p>}
                </div>}
            </div>}
            {showSide && <CommunitySidebar members={visibility.members ? members : []}
                content={visibility.members ? content.members : undefined} skills={visibility.skills ? content.skills : undefined}/>}
        </div>
    </div></section>;
}
