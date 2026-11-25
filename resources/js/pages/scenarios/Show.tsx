import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Bookmark,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Cpu,
    Lock,
    MessageCircle,
    MoreHorizontal,
    Share2,
    Sparkles,
    Star,
    Target,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/pm/Avatar';
import { ScenarioStoryContent } from '@/components/scenarios/ScenarioStoryContent';
import { ScenarioDetailsAside } from '@/components/scenarios/ScenarioDetailsAside';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { EngagementOverflowMenu } from '@/components/community/EngagementOverflowMenu';
import { EngagementActionBar } from '@/components/community/EngagementActionBar';
import { CommentEngagementActions } from '@/components/community/CommentEngagementActions';
import { CommentComposer } from '@/components/community/CommentComposer';
import { useHomeShare, JoinCommunityDialog, ReactionPicker, type ReactionType } from '@/components/home/HomeEngagement';

type NestedReply = {
    id: number;
    body: string;
    created_at: string;
    reactions_count?: number;
    reactions?: { type: ReactionType }[];
    user: {
        id: number;
        name: string;
        profile?: {
            role?: string;
            avatar_path?: string | null;
        } | null;
    };
};

type ScenarioResponseItem = {
    id: number;
    body: string;
    created_at: string;
    is_community_helpful?: boolean;
    is_question?: boolean;
    ai_score?: number | null;
    ai_review_status?: 'queued' | 'completed' | 'failed' | null;
    ai_feedback?: {
        strengths?: string[];
        gaps?: string[];
        next_actions?: string[];
        disclaimer?: string;
        criteria?: { key: string; points: number; evidence: string }[];
        strength?: string;
        consider?: string;
        next_step?: string;
    } | null;
    likes_count?: number;
    loves_count?: number;
    reactions_count?: number;
    reactions?: { type: ReactionType }[];
    user: {
        id: number;
        name: string;
        profile?: {
            role?: string;
            avatar_path?: string | null;
        } | null;
    };
    replies?: NestedReply[];
};

type Scenario = {
    id: number;
    slug: string;
    title: string;
    summary: string;
    situation: string;
    known_facts: string[];
    topics: string[];
    difficulty: string;
    focus: string;
    minutes: number;
    published_at: string;
    status: 'published' | 'closed';
    ai_generated: boolean;
    daily_slot?: string | null;
    expires_at?: string | null;
    reactions_count?: number;
    viewer_reaction?: ReactionType | null;
    viewer_bookmarked?: boolean;
};

type Props = {
    scenario: Scenario;
    responses: {
        data: ScenarioResponseItem[];
        total?: number;
        next_page_url: string | null;
    };
    related: {
        id: number;
        slug: string;
        title: string;
        difficulty?: string;
        focus?: string;
    }[];
};

export default function Show({ scenario, responses, related }: Props) {
    const page = usePage<{
        auth: {
            user: {
                id: number;
                name: string;
                onboarding_step: number;
                email_verified_at: string | null;
                avatar_path?: string | null;
            } | null;
        };
    }>();
    const { auth } = page.props;

    const ownQueued = responses.data.filter(item => item.ai_review_status === 'queued'
        && item.user.id === auth?.user?.id).map(item => item.id).join(',');
    useEffect(() => {
        if (!ownQueued) return;
        let attempts = 0;
        const timer = window.setInterval(() => {
            if (attempts++ >= 19) { window.clearInterval(timer); return; }
            router.reload({ only: ['responses'] });
        }, 8000);
        return () => window.clearInterval(timer);
    }, [ownQueued]);

    const memberView = page.url.split('?')[0].startsWith('/dashboard/daily-challenge/');
    const libraryRoot = memberView ? '/dashboard/daily-challenge' : '/daily-challenge';
    const isGuest = !auth?.user;
    const expired = Boolean(scenario.expires_at && new Date(scenario.expires_at).getTime() <= Date.now());
    const canRespond = Boolean(auth?.user && auth.user.onboarding_step >= 3
        && scenario.status === 'published' && !expired);

    // Independent form state prevents typing in a reply from changing the main response.
    const form = useForm({ body: '' });

    // Local state for expandable AI feedback boxes (first item expanded by default as in pm2.png)
    const [expandedFeedback, setExpandedFeedback] = useState<Record<number, boolean>>({
        [responses.data[0]?.id ?? 0]: true,
    });

    // Local state for threaded replies expansion
    const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});

    // Active reply composer target
    const [replyingTo, setReplyingTo] = useState<{ rootId: number; targetId: number; name: string } | null>(null);
    const [addedReplies, setAddedReplies] = useState<Record<number, NestedReply[]>>({});

    const canReact = Boolean(auth?.user && auth.user.onboarding_step >= 3);
    const [joinAction, setJoinAction] = useState<string | null>(null);
    const [bookmarked, setBookmarked] = useState(Boolean(scenario.viewer_bookmarked));
    const [bookmarkBusy, setBookmarkBusy] = useState(false);
    const scenarioUrl = `/scenarios/${encodeURIComponent(scenario.slug)}`;
    const scenarioShare = useHomeShare({ href: scenarioUrl, canInteract: canReact, onJoin: setJoinAction });
    const toggleBookmark = () => {
        if (!canReact) { setJoinAction('save a scenario'); return; }
        if (bookmarkBusy) return;
        setBookmarkBusy(true);
        const options = {
            preserveScroll: true,
            onSuccess: () => setBookmarked(previous => !previous),
            onFinish: () => setBookmarkBusy(false),
        };
        if (bookmarked) router.delete(`/scenarios/${scenario.id}/bookmark`, options);
        else router.post(`/scenarios/${scenario.id}/bookmark`, {}, options);
    };

    const toggleFeedback = (id: number) => {
        setExpandedFeedback((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleReplies = (id: number) => {
        setExpandedReplies((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleReplyComposer = (rootId: number, targetId: number, name: string) => {
        if (!canRespond) { setJoinAction('reply to a discussion'); return; }
        setReplyingTo(previous => previous?.targetId === targetId ? null : { rootId, targetId, name });
        setExpandedReplies(previous => ({ ...previous, [rootId]: true }));
    };

    const submitScenarioReply = async (rootId: number, body: string): Promise<void> => {
        const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        const response = await fetch(`/scenarios/${scenario.id}/responses`, {
            method: 'POST', credentials: 'same-origin',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token },
            body: JSON.stringify({ body, parent_id: rootId }),
        });
        if (!response.ok) {
            if (response.status === 419) throw new Error('Session expired. Refresh and try again.');
            if (response.status === 422) {
                const details = await response.json().catch(() => ({})) as { errors?: Record<string, string[]>; message?: string };
                throw new Error(Object.values(details.errors ?? {})[0]?.[0] ?? details.message ?? 'Please check your reply.');
            }
            throw new Error(response.status === 403 ? 'You cannot reply to this discussion.' : 'Unable to post your reply. Please try again.');
        }
        const data = await response.json() as { reply: NestedReply };
        setAddedReplies(previous => ({ ...previous, [rootId]: [...(previous[rootId] ?? []), data.reply] }));
        setExpandedReplies(previous => ({ ...previous, [rootId]: true }));
        setReplyingTo(null);
    };

    const handleSubmitResponse = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/scenarios/${scenario.id}/responses`, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
            },
        });
    };

    return (
        <PublicLayout active="/daily-challenge" joinLabel="Join the community" banner={{title: scenario.title, parents: [{label: 'Daily Challenge', href: '/daily-challenge'}]}}>
            <Head title={`${scenario.title} · PM Circle`} />

            <div className="pm-container pm-page pm-scenario-detail-page">
                {/* Breadcrumbs & back navigation */}
                <LegacyPageHeading><nav className="pm-crumbs" aria-label="Breadcrumb">
                    <Link href={memberView ? '/dashboard' : '/'}>Home</Link> &nbsp;/&nbsp; <Link href={libraryRoot}>Daily Challenge</Link> &nbsp;/&nbsp;{' '}
                    <span>Scenario</span>
                </nav></LegacyPageHeading>

                <div style={{ marginBottom: 'var(--s4)' }}>
                    <Link href={libraryRoot} className="pm-back" style={{ fontWeight: 'var(--type-weight-semibold)' }}>
                        ← All challenges
                    </Link>
                </div>

                <div className="pm-two-column pm-scenario-detail-layout">
                    {/* Left Column: Scenario Content & Community Responses */}
                    <div className="pm-scenario-main-col">
                        {/* Scenario article — shared presentation component */}
                        <article className="pm-panel pm-scenario-detail-article">
                            <ScenarioStoryContent scenario={scenario} actions={<EngagementOverflowMenu label="More scenario options" actions={[
                                { label: scenarioShare.copied ? 'Copied' : 'Share', icon: <Share2 size={17}/>, onSelect: () => { void scenarioShare.share(); } },
                                { label: bookmarked ? 'Saved' : 'Save', icon: <Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'}/>, onSelect: toggleBookmark, disabled: bookmarkBusy },
                            ]}/>}/>

                            {/* Action Row */}
                            <div className="pm-card-action-bar pm-scenario-engagement">
                                <EngagementActionBar className="pm-post-engagement-row pm-scenario-engagement-row">
                                    <ReactionPicker endpoint={`/scenarios/${scenario.id}/reactions`} initial={scenario.viewer_reaction}
                                        total={scenario.reactions_count ?? 0} canInteract={canReact} onJoin={setJoinAction} label="scenario" />
                                    <button type="button" className="pm-home-action" onClick={() => {
                                        document.getElementById('scenario-responses')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}><MessageCircle size={19} aria-hidden="true"/> {responses.total ?? responses.data.length} {(responses.total ?? responses.data.length) === 1 ? 'response' : 'responses'}</button>
                                    <button type="button" className="pm-home-action pm-post-desktop-action" onClick={() => { void scenarioShare.share(); }}><Share2 size={19} aria-hidden="true"/>{scenarioShare.copied ? 'Copied' : 'Share'}</button>
                                    <button type="button" className="pm-home-action pm-post-desktop-action" disabled={bookmarkBusy}
                                        aria-pressed={bookmarked} onClick={toggleBookmark}>
                                        <Bookmark size={19} fill={bookmarked ? 'currentColor' : 'none'} aria-hidden="true"/>
                                        {bookmarked ? 'Saved' : 'Save'}
                                    </button>
                                    {scenarioShare.error && <span className="pm-post-secondary-error" role="alert">{scenarioShare.error}</span>}
                                    {scenarioShare.copied && <span className="pm-post-copy-status" role="status">Link copied.</span>}
                                </EngagementActionBar>
                            </div>
                        </article>

                        {/* Interactive Response Submitter Box */}
                        <section className="pm-scenario-submit-card">
                            <h3 id="scenario-response-heading">What would you do?</h3>
                            <form onSubmit={handleSubmitResponse}>
                                <textarea
                                    className="pm-response-textarea"
                                    aria-invalid={Boolean(form.errors.body)}
                                    aria-labelledby="scenario-response-heading"
                                    aria-describedby={form.errors.body ? "scenario-response-error" : undefined}
                                    value={form.data.body}
                                    onChange={(e) => form.setData('body', e.target.value)}
                                    placeholder="Share your approach and explain why..."
                                    minLength={2}
                                    maxLength={10000}
                                    disabled={!canRespond}
                                    required
                                />

                                {form.errors.body && (
                                    <p id="scenario-response-error" className="pm-error" role="alert" style={{ marginTop: 'var(--s2)' }}>
                                        {form.errors.body}
                                    </p>
                                )}

                                {scenario.status === 'closed' || expired ? (
                                    <p className="pm-submit-lock-notice">This discussion is closed. You can still read previous responses.</p>
                                ) : isGuest ? (
                                    <div>
                                        <div className="pm-submit-lock-notice">
                                            <Lock size={14} /> Sign in to submit your response and receive AI feedback.
                                        </div>
                                        <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Link href="/login" className="pm-button pm-button-sm">
                                                Log in to respond
                                            </Link>
                                            <Link href="/register" className="pm-text-link">
                                                New here? Join free
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: 'var(--s3)', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button
                                            type="submit"
                                            className="pm-button pm-button-sm"
                                            disabled={form.processing || form.data.body.trim().length < 2}
                                        >
                                            Submit response & get AI evaluation
                                        </button>
                                    </div>
                                )}
                            </form>
                        </section>

                        {/* Community Responses Section (pm2.png) */}
                        <section className="pm-community-responses-block" id="scenario-responses">
                            <div className="pm-community-responses-header">
                                <div>
                                    <h2>Community responses</h2>
                                    <span className="pm-community-responses-count">
                                        {responses.total ?? '128'} responses
                                    </span>
                                </div>

                                <button type="button" className="pm-sort-dropdown">
                                    Most helpful <ChevronDown size={14} />
                                </button>
                            </div>

                            <div className="pm-responses-list">
                                {responses.data.map((resp) => {
                                    const isExpanded = Boolean(expandedFeedback[resp.id]);
                                    const serverReplyIds = new Set((resp.replies ?? []).map(reply => reply.id));
                                    const currentReplies = [...(resp.replies ?? []), ...(addedReplies[resp.id] ?? []).filter(reply => !serverReplyIds.has(reply.id))];
                                    const hasReplies = currentReplies.length > 0;
                                    const areRepliesExpanded = Boolean(expandedReplies[resp.id]);

                                    return (
                                        <article key={resp.id} className="pm-response-card">
                                            {/* Response Header */}
                                            <div className="pm-response-card-header">
                                                <div className="pm-author-info-wrap">
                                            <Avatar name={resp.user.name} src={resp.user.profile?.avatar_path} size={40} />
                                                    <div className="pm-author-meta">
                                                        <strong>{resp.user.name}</strong>
                                                        <span>
                                                            {resp.user.profile?.role ?? 'Project Professional'} ·{' '}
                                                            {resp.created_at
                                                                ? new Date(resp.created_at).toLocaleDateString(
                                                                      'en-GB',
                                                                      { day: 'numeric', month: 'short' }
                                                                  )
                                                                : '2 hours ago'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap' }}>
                                                    {resp.is_community_helpful && (
                                                        <span className="pm-helpful-badge">
                                                            <Star size={14} fill="currentColor" /> Community helpful
                                                        </span>
                                                    )}
                                                    {resp.is_question && (
                                                        <span className="pm-question-badge">Community question</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="pm-action-item"
                                                        aria-label="More options"
                                                    >
                                                        <MoreHorizontal size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Response Body */}
                                            <p className="pm-card-body">
                                                {resp.body}
                                            </p>

                                            {resp.ai_review_status === 'queued' && <p className="pm-ai-review-status" role="status">
                                                <Sparkles size={15}/> AI evaluation is queued. Your response is already posted; return shortly to see the score.
                                            </p>}
                                            {resp.ai_review_status === 'failed' && <p className="pm-ai-review-status is-failed">
                                                AI evaluation is currently unavailable. Your response remains published.
                                            </p>}
                                            {/* AI Reasoning Score & Feedback Pill */}
                                            {resp.ai_score !== null && resp.ai_score !== undefined && (
                                                <div className="pm-ai-score-container">
                                                    <div className="pm-ai-score-row">
                                                        <span className="pm-ai-score-pill">
                                                            <Sparkles size={14} /> AI reasoning score {resp.ai_score}/10
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="pm-ai-feedback-toggle"
                                                            onClick={() => toggleFeedback(resp.id)}
                                                        >
                                                            {isExpanded ? 'About this score' : 'Read assessment ˇ'}
                                                        </button>
                                                    </div>

                                                    {/* Expandable AI Feedback Box (pm2.png) */}
                                                    {isExpanded && resp.ai_feedback && (
                                                        <div className="pm-ai-feedback-card">
                                                            <div
                                                                className="pm-ai-feedback-header"
                                                                onClick={() => toggleFeedback(resp.id)}
                                                            >
                                                                <span
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 'var(--s2)',
                                                                    }}
                                                                >
                                                                    <Cpu size={16} color="var(--primary)" /> AI feedback
                                                                </span>
                                                                <ChevronUp size={16} />
                                                            </div>

                                                            <ul className="pm-ai-rubric-list">
                                                                {resp.ai_feedback.criteria?.map(criterion => <li key={criterion.key}>
                                                                    <Target size={16}/><span><strong>{criterion.key.replaceAll('_', ' ')} — {criterion.points} points:</strong> {criterion.evidence}</span>
                                                                </li>)}
                                                                {resp.ai_feedback.strengths?.map((item, i) => <li key={`strength-${i}`}>
                                                                    <Check size={16}/><span><strong>Strength:</strong> {item}</span>
                                                                </li>)}
                                                                {resp.ai_feedback.gaps?.map((item, i) => <li key={`gap-${i}`}>
                                                                    <Target size={16}/><span><strong>Improve:</strong> {item}</span>
                                                                </li>)}
                                                                {resp.ai_feedback.next_actions?.map((item, i) => <li key={`next-${i}`}>
                                                                    <ChevronRight size={16}/><span><strong>Next action:</strong> {item}</span>
                                                                </li>)}
                                                                {resp.ai_feedback.strength && (
                                                                    <li>
                                                                        <Check size={16} />
                                                                        <span>
                                                                            <strong>Strength:</strong>{' '}
                                                                            {resp.ai_feedback.strength}
                                                                        </span>
                                                                    </li>
                                                                )}
                                                                {resp.ai_feedback.consider && (
                                                                    <li>
                                                                        <Check size={16} />
                                                                        <span>
                                                                            <strong>Consider:</strong>{' '}
                                                                            {resp.ai_feedback.consider}
                                                                        </span>
                                                                    </li>
                                                                )}
                                                                {resp.ai_feedback.next_step && (
                                                                    <li>
                                                                        <Check size={16} />
                                                                        <span>
                                                                            <strong>Next step:</strong>{' '}
                                                                            {resp.ai_feedback.next_step}
                                                                        </span>
                                                                    </li>
                                                                )}
                                                            </ul>

                                                            <div className="pm-ai-feedback-footer-note">
                                                                Scenario-based AI educational feedback, not a professional
                                                                certification.
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* The same reaction/reply controls used by post comments. */}
                                            <div className="pm-card-action-bar pm-scenario-engagement">
                                                <CommentEngagementActions endpoint={`/scenarios/${scenario.id}/responses/${resp.id}/reactions`}
                                                    initial={resp.reactions?.[0]?.type ?? null} total={resp.reactions_count ?? 0}
                                                    canInteract={canRespond} onJoin={setJoinAction}
                                                    onReply={() => toggleReplyComposer(resp.id, resp.id, resp.user.name)}
                                                    replying={replyingTo?.targetId === resp.id}
                                                    showReply={scenario.status === 'published'}/>
                                            </div>

                                            {replyingTo?.targetId === resp.id && <div className="pm-scenario-reply-thread">
                                                <CommentComposer key={`scenario-root-reply-${resp.id}`} compact parentId={resp.id}
                                                    avatarName={auth.user?.name ?? 'Member'} avatarSrc={auth.user?.avatar_path} canInteract={canRespond}
                                                    onJoin={setJoinAction} replyToName={resp.user.name}
                                                    onCancel={() => setReplyingTo(null)} allowMedia={false} maxLength={10000}
                                                    onSubmitText={body => submitScenarioReply(resp.id, body)}/>
                                            </div>}

                                            {hasReplies && <div className="pm-threaded-replies-wrap">
                                                <div id={`scenario-replies-${resp.id}`} hidden={!areRepliesExpanded}>
                                                    {areRepliesExpanded && currentReplies.map(reply => <div key={reply.id} className="pm-nested-reply-card">
                                                        <div className="pm-author-info-wrap">
                                                            <Avatar name={reply.user.name} src={reply.user.profile?.avatar_path} size={32}/>
                                                            <div className="pm-author-meta">
                                                                <strong>{reply.user.name}</strong>
                                                                <span>{reply.user.profile?.role ?? 'Member'} · {new Date(reply.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                                            </div>
                                                        </div>
                                                        <p className="pm-scenario-reply-text">{reply.body}</p>
                                                        <CommentEngagementActions endpoint={`/scenarios/${scenario.id}/responses/${reply.id}/reactions`}
                                                            initial={reply.reactions?.[0]?.type ?? null} total={reply.reactions_count ?? 0}
                                                            canInteract={canRespond} onJoin={setJoinAction}
                                                            onReply={() => toggleReplyComposer(resp.id, reply.id, reply.user.name)}
                                                            replying={replyingTo?.targetId === reply.id}
                                                            showReply={scenario.status === 'published'}/>
                                                        {replyingTo?.targetId === reply.id && <CommentComposer compact key={`scenario-reply-${reply.id}`}
                                                            parentId={resp.id} avatarName={auth.user?.name ?? 'Member'} avatarSrc={auth.user?.avatar_path}
                                                            canInteract={canRespond} onJoin={setJoinAction}
                                                            replyToName={reply.user.name} onCancel={() => setReplyingTo(null)}
                                                            allowMedia={false} maxLength={10000}
                                                            onSubmitText={body => submitScenarioReply(resp.id, body)}/>}
                                                    </div>)}
                                                </div>
                                                <button type="button" className="pm-toggle-replies-btn"
                                                    onClick={() => toggleReplies(resp.id)} aria-expanded={areRepliesExpanded}
                                                    aria-controls={`scenario-replies-${resp.id}`}>
                                                    {areRepliesExpanded ? 'Hide' : 'View'} {currentReplies.length} {currentReplies.length === 1 ? 'reply' : 'replies'}
                                                    {areRepliesExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                                </button>
                                            </div>}
                                        </article>
                                    );
                                })}
                            </div>

                            {/* Load more responses button */}
                            <div className="pm-load-more-center">
                                <button type="button" className="pm-btn-load-more">
                                    Load more responses
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Scenario Metadata Sidebar (pm2.png) */}
                    <aside className="pm-scenario-sidebar-col">
                        <ScenarioDetailsAside scenario={scenario} isGuest={isGuest} />

                        {/* 4. Explore another situation */}
                        {related.length > 0 && (
                            <section className="pm-sidebar-card pm-scenario-related-card">
                                <h3>Explore another situation</h3>
                                <nav className="pm-topics-nav-list" aria-label="Other scenarios">
                                    {related.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={`${memberView ? libraryRoot : '/scenarios'}/${encodeURIComponent(item.slug)}`}
                                            className="pm-topic-nav-item"
                                        >
                                            <span>{item.title}</span>
                                            <ChevronRight size={16} color="var(--primary)" />
                                        </Link>
                                    ))}
                                </nav>
                            </section>
                        )}
                    </aside>
                </div>
            </div>
            <JoinCommunityDialog action={joinAction} onClose={() => setJoinAction(null)} hasAccount={Boolean(auth?.user)} />
        </PublicLayout>
    );
}
