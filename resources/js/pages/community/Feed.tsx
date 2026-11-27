import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
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
import { FeedScopeTabs, type FeedScope, type FeedScopeCounts } from '@/components/community/FeedScopeTabs';
import { useFeedScopeCounts } from '@/hooks/community/useFeedScopeCounts';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type Props = {
    posts: FeedPage<PostPreview>;
    activeTopic: string;
    virtualFeedEnabled: boolean;
    feedTab: FeedScope;
    feedScopeCounts: FeedScopeCounts;
    search?: string | null;
    todayScenario?: {
        id: number;
        slug: string;
        title: string;
        summary: string;
    } | null;
};

export default function Feed({ posts, activeTopic, feedTab, feedScopeCounts, search, todayScenario, virtualFeedEnabled }: Props) {
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
            const headerBottom = isGuest ? 0 : (document.querySelector('.pm-member-compact-header')?.getBoundingClientRect().bottom ?? 0);
            const offset = Math.min(Math.max(0, headerBottom) + spacing, window.innerHeight - sidebar.getBoundingClientRect().height - spacing);
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
    }, [isGuest]);
    const feed = useSlidingFeed(posts, { tab: feedTab, topic: activeTopic, search, context: 'community', viewerId: auth?.user?.id ?? 0 });
    const { counts, updateSaved, updateHidden } = useFeedScopeCounts(feedScopeCounts);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/community',
            { search: searchTerm, topic: activeTopic !== 'All' ? activeTopic : undefined, tab: feedTab },
            { preserveState: true }
        );
    };

    return (
        <PublicLayout siteLayout={isGuest} active="/community" joinLabel="Join free" banner={{title: 'Better projects start with better conversations.', currentLabel: 'Discussions', description: 'Explore real project challenges, practical lessons and ideas from the PM community.'}}>
            <Head title="Discussions · PM Circle" />

            <div className={`pm-container pm-page pm-community-discussions-page${isGuest ? '' : ' pm-member-discussions'}`}>
                {isGuest ? <>
                <span className="pm-badge-public"><Users size={14}/> Public discussions · Read freely</span>

                </> : <>
                    <header className="pm-member-workspace-heading">
                        <h1>Discussions</h1>
                        <p>Explore real project challenges, practical lessons and ideas from the PM community.</p>
                    </header>
                    <div className="pm-community-feed-tabs pm-member-workspace-tabs">
                        <FeedScopeTabs active={feedTab} counts={counts} hrefFor={(tab) => `/community?${new URLSearchParams({ tab, ...(activeTopic !== 'All' ? { topic: activeTopic } : {}), ...(search ? { search } : {}) })}`} />
                    </div>
                </>}

                {/* Main Two Column Grid */}
                <div className="pm-two-column">
                    <div className="pm-feed-main-col">
                        {/* Search & Sort Bar */}
                        <div className="pm-feed-toolbar">
                            <form className="pm-feed-search-wrap" role="search" onSubmit={handleSearchSubmit}>
                                <label className="sr-only" htmlFor="pm-community-search">Search discussions or topics</label>
                                <input
                                    id="pm-community-search"
                                    type="search"
                                    className="pm-feed-search-input"
                                    placeholder="Search discussions or topics..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button className="pm-community-search-submit" type="submit" aria-label="Search discussions" title="Search discussions">
                                    <Search size={18} aria-hidden="true" />
                                </button>
                            </form>
                        </div>

                        {isGuest && <div className="pm-community-feed-tabs">
                            <nav className="pm-feed-scope-tabs" aria-label="Filter community posts">
                                <Link className="pm-feed-scope-tab active" href="/community" aria-current="page">All</Link>
                                <Link className="pm-feed-scope-tab" href="/login">Following</Link>
                                <Link className="pm-feed-scope-tab" href="/login">My posts</Link>
                            </nav>
                        </div>}

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
                                        onReactionChange={(reaction, count, counts) => feed.updateItem(post.id, { viewer_reaction: reaction, reactions_count: count, reaction_breakdown: counts })}
                                        onCommentAdded={() => feed.updateItem(post.id, current => ({ comments_count: current.comments_count + 1 }))}
                                        onSavedChange={saved => {
                                            updateSaved(Boolean(post.viewer_saved), saved, Boolean(post.viewer_hidden));
                                            if (feedTab === 'saved' && !saved) {
                                                feed.removeItem(post.id);
                                                if (counts.saved <= 1) router.get('/community', { tab: 'all', ...(activeTopic !== 'All' ? { topic: activeTopic } : {}), ...(search ? { search } : {}) }, { preserveScroll: true });
                                            } else feed.updateItem(post.id, { viewer_saved: saved });
                                        }}
                                        onHiddenChange={hidden => {
                                            updateHidden(Boolean(post.viewer_hidden), hidden, Boolean(post.viewer_saved));
                                            feed.removeItem(post.id);
                                            if (feedTab === 'hidden' && !hidden && counts.hidden <= 1) router.get('/community', { tab: 'all', ...(activeTopic !== 'All' ? { topic: activeTopic } : {}), ...(search ? { search } : {}) }, { preserveScroll: true });
                                        }}
                                        onUpdated={updated => updated.status && updated.status !== 'published' ? feed.removeItem(post.id) : feed.updateItem(post.id, { body: updated.body, image_path: updated.image_path })}
                                        onMuteChange={muted => feed.updateItem(post.id, { viewer_muted: muted })} onVoteChanged={(choice, options) => feed.updateItem(post.id, { viewer_vote: choice, poll_options: options })}
                                        onRemoved={() => {
                                            if (post.viewer_hidden) updateHidden(true, false, Boolean(post.viewer_saved));
                                            else if (post.viewer_saved) updateSaved(true, false, false);
                                            feed.removeItem(post.id);
                                        }} />
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
                            <div className="pm-panel pm-empty"><p>{feedTab === 'saved' ? 'No saved posts yet. Use Save on a discussion to find it here.' : feedTab === 'hidden' ? 'No hidden posts. Posts you hide will appear here until you unhide them.' : 'No discussions found in this topic. Try another search or category.'}</p></div>
                        )}
                        {(feed.hasMore || feed.loading || feed.error) && (
                            <div className="pm-load-more-center" aria-live="polite">
                                {feed.error ? (
                                    <button type="button" className="pm-btn-load-more" onClick={feed.retry}>
                                        <RefreshCw size={16} /> {feed.restart ? "Refresh feed" : "Retry loading posts"}
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
                            <p className="pm-community-topic-intro">Explore popular topics from the community.</p>

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
                        {isGuest && <section className="pm-cta-guest-card">
                            <Users size={32} className="pm-cta-guest-icon" />
                            <h3 className="pm-community-cta-heading">
                                Your experience can help someone.
                            </h3>
                            <p className="pm-community-cta-copy">
                                Ask questions. Share lessons. Learn with project professionals.
                            </p>
                            <Link href="/register" className="pm-button pm-btn-full">
                                Join PM Circle — free
                            </Link>
                            <span className="pm-cta-guest-login">
                                Already a member? <Link href="/login">Log in</Link>
                            </span>
                        </section>}
                    </aside>
                </div>
            </div>
            <JoinCommunityDialog action={joinAction} onClose={() => setJoinAction(null)} hasAccount={Boolean(auth?.user)} />
        </PublicLayout>
    );
}
