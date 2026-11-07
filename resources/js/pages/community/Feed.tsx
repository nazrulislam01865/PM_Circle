import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpDown,
    Briefcase,
    ChevronDown,
    ChevronRight,
    FileText,
    Lock,
    RefreshCw,
    Search,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PostCard, type PostPreview } from '@/components/community/PostCard';
import { VirtualizedFeed } from '@/components/community/VirtualizedFeed';
import { useSlidingFeed, type FeedPage } from '@/hooks/community/useSlidingFeed';
import { JoinCommunityDialog } from '@/components/home/HomeEngagement';
import { TopicPills } from '@/components/community/TopicPills';
import { FeedScopeTabs, type FeedScope } from '@/components/community/FeedScopeTabs';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type Props = {
    posts: FeedPage<PostPreview>;
    activeTopic: string;
    virtualFeedEnabled: boolean;
    feedTab: FeedScope;
    search?: string | null;
    todayScenario?: {
        id: number;
        slug: string;
        title: string;
        summary: string;
    } | null;
};

export default function Feed({ posts, activeTopic, feedTab, search, todayScenario, virtualFeedEnabled }: Props) {
    const { auth, emailVerificationRequired } = usePage<{
        emailVerificationRequired?: boolean;
        auth: {
            user: {
                id: number;
                name: string;
                onboarding_step: number;
                email_verified_at: string | null;
            } | null;
        };
    }>().props;

    const isGuest = !auth?.user || auth.user.onboarding_step < 3 || (emailVerificationRequired && !auth.user.email_verified_at);
    const [joinAction, setJoinAction] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState(search ?? '');
    const sidebarRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const sidebar = sidebarRef.current;
        if (!sidebar) return;

        const updateStickyOffset = () => {
            // Like the member dashboard: tall sidebars remain accessible using
            // the page scroll rather than introducing a second scrollbar.
            const spacing = parseFloat(getComputedStyle(sidebar).getPropertyValue('--space-4')) || 16;
            const offset = Math.min(spacing, window.innerHeight - sidebar.getBoundingClientRect().height - spacing);
            sidebar.style.setProperty('--pm-community-sidebar-sticky-top', `${Math.round(offset)}px`);
        };

        const observer = new ResizeObserver(updateStickyOffset);
        observer.observe(sidebar);
        window.addEventListener('resize', updateStickyOffset);
        updateStickyOffset();

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateStickyOffset);
        };
    }, []);
    const feed = useSlidingFeed(posts, { tab: feedTab, topic: activeTopic, search, context: 'community', viewerId: auth?.user?.id ?? 0 });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/community',
            { search: searchTerm, topic: activeTopic !== 'All' ? activeTopic : undefined, tab: feedTab },
            { preserveState: true }
        );
    };

    return (
        <PublicLayout siteLayout active="/community" joinLabel="Join free">
            <Head title="Discussions · PM Circle" />

            <div className="pm-container pm-page">
                {/* Breadcrumbs */}
                <nav className="pm-crumbs" aria-label="Breadcrumb">
                    <Link href="/">Home</Link> &nbsp;/&nbsp; <span>Discussions</span>
                </nav>

                {/* Hero Banner (pm1.png) */}
                <section className="pm-feed-hero">
                    <div className="pm-feed-hero-content">
                        <h1>Better projects start with better conversations.</h1>
                        <p>Explore real project challenges, practical lessons and ideas from the PM community.</p>
                        <span className="pm-badge-public">
                            <Users size={14} /> Public discussions · Read freely
                        </span>
                    </div>

                    <div className="pm-feed-hero-illustration" aria-hidden="true">
                        <svg width="220" height="130" viewBox="0 0 220 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Dialogue bubble 1 */}
                            <rect x="30" y="10" width="150" height="60" rx="12" fill="#EAF3FC" stroke="#0A66C2" strokeWidth="1.5" />
                            <line x1="45" y1="26" x2="110" y2="26" stroke="#0A66C2" strokeWidth="2.5" strokeLinecap="round" />
                            <line x1="45" y1="36" x2="150" y2="36" stroke="#8293A8" strokeWidth="2" strokeLinecap="round" />
                            <line x1="45" y1="46" x2="130" y2="46" stroke="#8293A8" strokeWidth="2" strokeLinecap="round" />
                            <path d="M50 70L40 82L60 70H50Z" fill="#EAF3FC" stroke="#0A66C2" strokeWidth="1.5" />

                            {/* Dialogue bubble 2 */}
                            <rect x="70" y="55" width="140" height="55" rx="12" fill="#FFFFFF" stroke="#0A66C2" strokeWidth="1.5" />
                            <line x1="85" y1="72" x2="175" y2="72" stroke="#8293A8" strokeWidth="2" strokeLinecap="round" />
                            <line x1="85" y1="82" x2="150" y2="82" stroke="#8293A8" strokeWidth="2" strokeLinecap="round" />
                            <path d="M185 110L195 122L175 110H185Z" fill="#FFFFFF" stroke="#0A66C2" strokeWidth="1.5" />

                            {/* Little spark / avatar accents */}
                            <circle cx="15" cy="50" r="14" fill="#EAF3FC" />
                            <circle cx="205" cy="30" r="12" fill="#EAF3FC" />
                            <line x1="12" y1="20" x2="20" y2="28" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" />
                            <line x1="200" y1="75" x2="208" y2="83" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                </section>

                {/* Main Two Column Grid */}
                <div className="pm-two-column">
                    <div className="pm-feed-main-col">
                        {/* Search & Sort Bar */}
                        <div className="pm-feed-toolbar">
                            <form className="pm-feed-search-wrap" onSubmit={handleSearchSubmit}>
                                <Search size={18} className="pm-feed-search-icon" />
                                <input
                                    type="text"
                                    className="pm-feed-search-input"
                                    placeholder="Search discussions or topics..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </form>

                            <button type="button" className="pm-sort-dropdown">
                                <ArrowUpDown size={15} /> Latest <ChevronDown size={14} />
                            </button>
                        </div>

                        <div className="pm-community-feed-tabs">
                            {isGuest ? (
                                <nav className="pm-feed-scope-tabs" aria-label="Filter community posts">
                                    <Link className="pm-feed-scope-tab active" href="/community" aria-current="page">All</Link>
                                    <Link className="pm-feed-scope-tab" href="/login">Following</Link>
                                    <Link className="pm-feed-scope-tab" href="/login">My posts</Link>
                                </nav>
                            ) : <FeedScopeTabs active={feedTab} hrefFor={(tab) => `/community?${new URLSearchParams({ tab, ...(activeTopic !== 'All' ? { topic: activeTopic } : {}), ...(search ? { search } : {}) })}`} />}
                        </div>

                        {/* Filter pills */}
                        <TopicPills active={activeTopic} feedTab={feedTab} />

                        {/* Guest Join Callout Banner */}
                        {isGuest && (
                            <section className="pm-guest-banner-card">
                                <div className="pm-guest-banner-left">
                                    <div className="pm-guest-lock-icon">
                                        <Lock size={20} />
                                    </div>
                                    <div className="pm-guest-banner-text">
                                        <strong>Have a question or an experience to share?</strong>
                                        <p>Join free to post, like, clap and comment.</p>
                                    </div>
                                </div>
                                <Link href="/register" className="pm-button pm-button-sm">
                                    Join the conversation
                                </Link>
                            </section>
                        )}

                        {/* Server-hydrated, measured sliding window. Cards and guest prompt remain unchanged. */}
                        {feed.items.length ? (
                            <VirtualizedFeed items={feed.items} onNearEnd={feed.loadMore}
                                className="pm-feed-posts-list" enabled={virtualFeedEnabled}
                                renderItem={(post, index) => <>
                                    <PostCard post={post} isGuest={isGuest} onJoin={setJoinAction}
                                        onReactionChange={(reaction, count) => feed.updateItem(post.id, { viewer_reaction: reaction, reactions_count: count })}
                                        onCommentAdded={() => feed.updateItem(post.id, { comments_count: post.comments_count + 1 })} />
                                    {index === 0 && isGuest && (
                                        <div className="pm-inline-guest-prompt">
                                            <div className="pm-inline-guest-header"><Lock size={16} /> Join the community to add your response</div>
                                            <input type="text" className="pm-inline-guest-textarea"
                                                placeholder="Share your thoughts, experience or advice..." disabled />
                                            <div className="pm-inline-guest-actions">
                                                <Link href="/register" className="pm-button pm-button-sm">Create free account</Link>
                                                <span className="pm-inline-guest-login">Already a member? <Link href="/login">Log in</Link></span>
                                            </div>
                                        </div>
                                    )}
                                </>} />
                        ) : (
                            <div className="pm-panel pm-empty"><p>No discussions found in this topic. Try another search or category.</p></div>
                        )}
                        {(feed.hasMore || feed.loading || feed.error) && (
                            <div className="pm-load-more-center" aria-live="polite">
                                {feed.error ? (
                                    <button type="button" className="pm-btn-load-more" onClick={feed.retry}>
                                        <RefreshCw size={16} /> Retry loading posts
                                    </button>
                                ) : feed.loading ? <span className="helper" role="status">Loading discussions…</span>
                                    : <button type="button" className="pm-btn-load-more" onClick={feed.loadMore}>
                                        Load more discussions <ChevronDown size={16} />
                                    </button>}
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <aside ref={sidebarRef} className="pm-sidebar-col pm-community-sticky-sidebar">
                        {/* 1. Practise your judgement card */}
                        <section className="pm-sidebar-card">
                            <div className="pm-sidebar-kicker">PRACTISE YOUR JUDGEMENT</div>
                            <FileText size={40} className="pm-sidebar-doc-icon" />
                            <h3>{todayScenario?.title ?? 'The deadline stays. The scope grows.'}</h3>
                            <p>
                                {todayScenario?.summary ??
                                    'A sponsor adds a must-have feature two weeks before launch. What would you do next?'}
                            </p>
                            <Link
                                href={
                                    todayScenario
                                        ? `/scenarios/${todayScenario.slug}`
                                        : '/scenarios/a-late-change-a-fixed-deadline'
                                }
                                className="pm-button pm-btn-full"
                            >
                                Read scenario & responses →
                            </Link>
                        </section>

                        {/* 2. Find your next conversation */}
                        <section className="pm-sidebar-card">
                            <h3>Find your next conversation</h3>
                            <p style={{ margin: 0, fontSize: '13px' }}>Explore popular topics from the community.</p>

                            <nav className="pm-topics-nav-list" aria-label="Popular topics">
                                <Link
                                    href="/community?topic=Questions&search=stakeholder"
                                    className="pm-topic-nav-item"
                                >
                                    <div className="pm-topic-nav-left">
                                        <Users size={18} />
                                        <span>Stakeholder management</span>
                                    </div>
                                    <ChevronRight size={16} color="var(--muted)" />
                                </Link>

                                <Link
                                    href="/community?topic=I+learned&search=agile"
                                    className="pm-topic-nav-item"
                                >
                                    <div className="pm-topic-nav-left">
                                        <RefreshCw size={18} />
                                        <span>Agile & Scrum</span>
                                    </div>
                                    <ChevronRight size={16} color="var(--muted)" />
                                </Link>

                                <Link
                                    href="/community?topic=From+my+project&search=risk"
                                    className="pm-topic-nav-item"
                                >
                                    <div className="pm-topic-nav-left">
                                        <AlertTriangle size={18} />
                                        <span>Risk & change</span>
                                    </div>
                                    <ChevronRight size={16} color="var(--muted)" />
                                </Link>

                                <Link
                                    href="/community?topic=Questions&search=career"
                                    className="pm-topic-nav-item"
                                >
                                    <div className="pm-topic-nav-left">
                                        <Briefcase size={18} />
                                        <span>Careers in PM</span>
                                    </div>
                                    <ChevronRight size={16} color="var(--muted)" />
                                </Link>
                            </nav>
                        </section>

                        {/* 3. Your experience can help someone */}
                        <section className="pm-cta-guest-card">
                            <Users size={32} className="pm-cta-guest-icon" />
                            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>
                                Your experience can help someone.
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 16px' }}>
                                Ask questions. Share lessons. Learn with project professionals.
                            </p>
                            <Link href="/register" className="pm-button pm-btn-full">
                                Join PM Circle — free
                            </Link>
                            {isGuest && (
                                <span className="pm-cta-guest-login">
                                    Already a member? <Link href="/login">Log in</Link>
                                </span>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
            <JoinCommunityDialog action={joinAction} onClose={() => setJoinAction(null)} hasAccount={Boolean(auth?.user)} />
        </PublicLayout>
    );
}
