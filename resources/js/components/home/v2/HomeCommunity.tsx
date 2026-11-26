import { Link, router } from '@inertiajs/react';
import { Pencil, ArrowRight, Share2 } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';
import { PostCardV2 } from '@/components/community/PostCardV2';
import { ReactionPicker, HomeCommentAction, useHomeShare, type RequestToJoin } from '@/components/home/HomeEngagement';
import { EngagementOverflowMenu } from '@/components/community/EngagementOverflowMenu';
import { EngagementActionBar } from '@/components/community/EngagementActionBar';
import type { ScenarioSummary } from '@/components/home/ScenarioPreview';
import type { HomePost } from '@/components/home/HomePostPreview';
import type { HomeMember } from '@/types/home';
import type { HomepagePresentation } from '@/types/homepage-presentation';
import { HomeSectionTitle } from './HomeUi';
import { PreviewEngagementActions } from './PreviewEngagementActions';

const samplePosts: HomePost[] = [
    { id: -1, title: 'How do you handle a last-minute scope request?', body: 'Our sponsor asked for an extra report two days before launch. What would you ask before deciding whether to take it on?', topic: 'Questions', likes_count: 8, comments_count: 0, published_at: null, author: { name: 'Nadia Rahman', profile: { role: 'Project Coordinator' } } },
    { id: -2, title: 'What makes a retrospective worth attending?', body: 'One change helped our team: we started each retro by checking whether the last action item actually happened.', topic: 'Discussion', likes_count: 5, comments_count: 0, published_at: null, author: { name: 'Tanvir Hasan', profile: { role: 'Scrum Master' } } },
];

function DailyScenarioCard({ scenario, canInteract, onJoin, content, isDemo }: {
    scenario: ScenarioSummary | null; canInteract: boolean; onJoin: RequestToJoin; content: HomepagePresentation['scenario']; isDemo: boolean;
}) {
    const url = scenario ? `/scenarios/${encodeURIComponent(scenario.slug)}` : '/daily-challenge';
    const readUrl = content?.read_url || url;
    const share = useHomeShare({ href: url, canInteract: canInteract && Boolean(scenario), onJoin });
    if (!scenario && !isDemo) return <article className="pm-v2-scenario-card"><div className="pm-v2-post-content"><h3>{content.status_label}</h3><p>{content.empty_message}</p><Link href={readUrl} className="pm-v2-scenario-link">{content.read_label}</Link></div></article>;
    return <article className="pm-v2-scenario-card"><div className="pm-v2-post-author"><span className="pm-v2-official-avatar" aria-label="PM Circle">PM</span><div>
        <strong>PM Circle</strong><small>{content.status_label}</small></div>
        <EngagementOverflowMenu label="More scenario options" actions={[
            { label: share.copied ? 'Copied' : 'Share', icon: <Share2 size={17}/>, onSelect: () => { void share.share(); } },
            { label: 'Read discussion', icon: <ArrowRight size={17}/>, onSelect: () => router.visit(readUrl) },
        ]}/></div>
        <div className="pm-v2-post-content"><h3><Link href={url}>{scenario?.title || 'Balancing scope, cost, and risk on a Bangladesh rail upgrade'}</Link></h3>
            <p>{scenario?.summary || 'A pilot upgrade is running behind. A supplier proposes a cheaper workaround that could affect testing. What would you check before recommending a decision?'}</p>
            <div className="pm-v2-topic-list">{(scenario?.topics?.length ? scenario.topics.slice(0, 2) : ['Scope and change', 'Risk management']).map(topic => <span key={topic}>{topic}</span>)}</div>
            <Link href={content?.read_url || url} className="pm-v2-scenario-link pm-post-desktop-action">{content.read_label}</Link>
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

function CommunitySidebar({ members, content, skills, isDemo }: {
    members: HomeMember[]; content?: HomepagePresentation['members']; skills?: HomepagePresentation['skills']; isDemo: boolean;
}) {
    const people = members.length ? members : isDemo ? [
        { id: 0, name: 'Ayesha Farin', profile: { role: 'Project Coordinator', avatar_path: null } },
        { id: 0, name: 'Rafi Hasan', profile: { role: 'Business Analyst', avatar_path: null } },
    ] : [];
    const icons = {practice:'✓',scrum:'◌',learn:'▤'};
    const styles = {practice:0,scrum:1,learn:2};
    return <aside className="pm-v2-community-sidebar" aria-label="Community resources">
        {content && <section className="pm-v2-aside-box"><h3>{content.heading}</h3><p>{content.description}</p>
            {people.map((person, i) => <div className="pm-v2-member" key={`${person.name}-${i}`}>
                <Avatar name={person.name} src={person.profile?.avatar_path} size={33}/><div><strong>{person.name}</strong><small>{person.profile?.role || 'Community member'}</small></div>
            </div>)}
            {!people.length && <p>{content.empty_message}</p>}
            {isDemo && !members.length && <small className="sr-only">Example member profiles</small>}
            <Link href={content.button_url} className="pm-v2-text-link">{content.button_label} ›</Link></section>}
        {skills && <section className="pm-v2-aside-box"><h3>{skills.heading}</h3>
            {skills.items.map((skill,i) => <Link href={skill.href} className="pm-v2-skill" key={i}>
                <span className={`pm-v2-skill-icon pm-v2-skill-icon-${styles[skill.icon]}`}>{skill.image ? <img src={skill.image} alt=""/> : icons[skill.icon]}</span>{skill.title}<span aria-hidden="true">›</span>
            </Link>)}
        </section>}
    </aside>;
}

export function HomeCommunity({ scenario, posts, members, content, canInteract, onJoin, visibility, isDemo }: {
    scenario: ScenarioSummary | null; posts: HomePost[]; members: HomeMember[]; content: HomepagePresentation; isDemo: boolean;
    canInteract: boolean; onJoin: RequestToJoin;
    visibility: { scenario: boolean; community: boolean; members: boolean; skills: boolean };
}) {
    const showMain = visibility.scenario || visibility.community;
    const showSide = visibility.members || visibility.skills;
    if (!showMain && !showSide) return null;
    return <section className="pm-v2-community-section" id="pm-v2-community" aria-labelledby={content.community_intro.enabled ? "pm-v2-community-title" : undefined} aria-label={!content.community_intro.enabled ? content.community_intro.heading : undefined}><div className="pm-v2-container">
        {content.community_intro.enabled && <HomeSectionTitle id="pm-v2-community-title" title={content.community_intro.heading} description={content.community_intro.description}/>}
        <div className={`pm-v2-community-columns${!showMain || !showSide ? ' pm-v2-community-one-column' : ''}`}>
            {showMain && <div className="pm-v2-community-feed">
                {visibility.community && <button type="button" className="pm-v2-compose" onClick={() => onJoin('start a discussion')}>
                    <span>PM</span><span><Pencil aria-hidden="true"/> {content.community.compose_label}</span></button>}
                {visibility.scenario && <DailyScenarioCard scenario={scenario} canInteract={canInteract} onJoin={onJoin} content={content.scenario} isDemo={isDemo}/>}
                {visibility.community && <div className="pm-v2-community-posts">
                    <div className="pm-v2-subsection-line">{content.community.heading}</div>
                    {(posts.length ? posts : isDemo ? samplePosts.slice(0, content.community.limit) : []).map(post => <PostCardV2 key={post.id} post={post} sample={!posts.length}
                        canInteract={canInteract} onJoin={onJoin}/>) }
                    {!posts.length && !isDemo && <p>{content.community.empty_message}</p>}
                    {!posts.length && isDemo && <p className="sr-only">Example discussions · <Link href="/community">Browse published posts</Link></p>}
                </div>}
            </div>}
            {showSide && <CommunitySidebar members={visibility.members ? members : []}
                content={visibility.members ? content.members : undefined} skills={visibility.skills ? content.skills : undefined} isDemo={isDemo}/>}
        </div>
    </div></section>;
}
