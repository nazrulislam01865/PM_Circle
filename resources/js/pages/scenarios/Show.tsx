import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Bookmark,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Clock,
    Cpu,
    Heart,
    Lock,
    MessageCircle,
    MoreHorizontal,
    Share2,
    Sliders,
    Sparkles,
    Star,
    Target,
    ThumbsUp,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/pm/Avatar';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type NestedReply = {
    id: number;
    body: string;
    created_at: string;
    likes_count?: number;
    user: {
        id: number;
        name: string;
        profile?: {
            role?: string;
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
    ai_feedback?: {
        strength?: string;
        consider?: string;
        next_step?: string;
    } | null;
    likes_count?: number;
    loves_count?: number;
    user: {
        id: number;
        name: string;
        profile?: {
            role?: string;
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
            } | null;
        };
    }>();
    const { auth } = page.props;

    const memberView = page.url.split('?')[0].startsWith('/dashboard/daily-challenge/');
    const libraryRoot = memberView ? '/dashboard/daily-challenge' : '/daily-challenge';
    const isGuest = !auth?.user;
    const canRespond = Boolean(auth?.user && auth.user.onboarding_step >= 3 && scenario.status === 'published');

    // Form for submitting top-level response
    const form = useForm({ body: '', parent_id: null as number | null });

    // Local state for expandable AI feedback boxes (first item expanded by default as in pm2.png)
    const [expandedFeedback, setExpandedFeedback] = useState<Record<number, boolean>>({
        [responses.data[0]?.id ?? 0]: true,
    });

    // Local state for threaded replies expansion
    const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});

    // Active reply composer target
    const [replyingToId, setReplyingToId] = useState<number | null>(null);

    const [shareCopied, setShareCopied] = useState(false);

    const toggleFeedback = (id: number) => {
        setExpandedFeedback((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleReplies = (id: number) => {
        setExpandedReplies((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleShare = () => {
        if (navigator.clipboard) {
            void navigator.clipboard.writeText(window.location.href).then(() => {
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
            });
        }
    };

    const handleSubmitResponse = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/scenarios/${scenario.id}/responses`, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setReplyingToId(null);
            },
        });
    };

    return (
        <PublicLayout active="/daily-challenge" joinLabel="Join the community">
            <Head title={`${scenario.title} · PM Circle`} />

            <div className="pm-container pm-page">
                {/* Breadcrumbs & back navigation */}
                <nav className="pm-crumbs" aria-label="Breadcrumb">
                    <Link href={memberView ? '/dashboard' : '/'}>Home</Link> &nbsp;/&nbsp; <Link href={libraryRoot}>Daily Challenge</Link> &nbsp;/&nbsp;{' '}
                    <span>Scenario</span>
                </nav>

                <div style={{ marginBottom: '18px' }}>
                    <Link href={libraryRoot} className="pm-back" style={{ fontWeight: 'var(--type-weight-semibold)' }}>
                        ← All challenges
                    </Link>
                </div>

                <div className="pm-two-column">
                    {/* Left Column: Scenario Content & Community Responses */}
                    <div className="pm-scenario-main-col">
                        {/* Scenario Article Panel (pm2.png) */}
                        <article className="pm-panel" style={{ padding: '32px', marginBottom: '24px' }}>
                            <div className="pm-scenario-header-badges">
                                <span className="pm-badge-scenario">TODAY'S SCENARIO</span>
                                <span className="pm-badge-open">{scenario.status === 'closed' ? 'Discussion closed' : 'Open for discussion'}</span>
                            </div>

                            <h1 className="pm-scenario-h1">{scenario.title}</h1>

                            <div className="pm-scenario-meta-line">
                                PM Circle Editorial &nbsp;·&nbsp;{' '}
                                {new Date(scenario.published_at).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                })}{' '}
                                &nbsp;·&nbsp; 4 min read
                            </div>

                            {scenario.topics && scenario.topics.length > 0 && (
                                <div className="pm-tag-pills-row" style={{ marginBottom: '24px' }}>
                                    {scenario.topics.map((t) => (
                                        <span key={t} className="pm-tag-pill">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Section: The situation */}
                            <h2 className="pm-scenario-section-heading">The situation</h2>
                            {scenario.situation.split('\n\n').map((paragraph, idx) => (
                                <p key={idx} className="pm-scenario-body-p">
                                    {paragraph}
                                </p>
                            ))}

                            {/* Section: What you know */}
                            <h2 className="pm-scenario-section-heading">What you know</h2>
                            <ul className="pm-bullet-points-list">
                                {scenario.known_facts.map((fact, idx) => (
                                    <li key={idx}>{fact}</li>
                                ))}
                            </ul>

                            {/* Section: Your decision */}
                            <div className="pm-decision-prompt-box">
                                <div className="pm-decision-prompt-header">
                                    <MessageCircle size={22} color="var(--primary)" />
                                    <span>Your decision</span>
                                </div>
                                <p className="pm-decision-prompt-p">
                                    What would you do first, who would you involve, and how would you explain the
                                    trade-off?
                                </p>
                                <span className="pm-decision-prompt-sub">
                                    Several approaches may be reasonable. Explain your assumptions.
                                </span>
                            </div>

                            {/* Action Row */}
                            <div className="pm-card-action-bar" style={{ marginTop: '20px' }}>
                                <div className="pm-action-buttons-group">
                                    <button type="button" className="pm-action-item">
                                        <ThumbsUp size={15} /> Like 42
                                    </button>
                                    <button type="button" className="pm-action-item">
                                        <Heart size={15} /> Love 26
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleShare}
                                        className="pm-action-item"
                                        style={{ color: 'var(--primary)' }}
                                    >
                                        <Share2 size={15} /> {shareCopied ? 'Link copied' : 'Share'}
                                    </button>
                                    <button type="button" className="pm-action-item">
                                        <Bookmark size={15} /> Save
                                    </button>
                                </div>
                            </div>
                        </article>

                        {/* Interactive Response Submitter Box */}
                        <section className="pm-scenario-submit-card">
                            <h3>What would you do?</h3>
                            <form onSubmit={handleSubmitResponse}>
                                <textarea
                                    className="pm-response-textarea"
                                    value={form.data.body}
                                    onChange={(e) => form.setData('body', e.target.value)}
                                    placeholder="Share your approach and explain why..."
                                    minLength={30}
                                    maxLength={10000}
                                    disabled={!canRespond}
                                    required
                                />

                                {form.errors.body && (
                                    <p className="pm-error" role="alert" style={{ marginTop: '8px' }}>
                                        {form.errors.body}
                                    </p>
                                )}

                                {scenario.status === 'closed' ? (
                                    <p className="pm-submit-lock-notice">This discussion is closed. You can still read previous responses.</p>
                                ) : isGuest ? (
                                    <div>
                                        <div className="pm-submit-lock-notice">
                                            <Lock size={14} /> Sign in to submit your response and receive AI feedback.
                                        </div>
                                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                            <Link href="/login" className="pm-button pm-button-sm">
                                                Log in to respond
                                            </Link>
                                            <Link href="/register" className="pm-text-link">
                                                New here? Join free
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button
                                            type="submit"
                                            className="pm-button pm-button-sm"
                                            disabled={form.processing || form.data.body.length < 30}
                                        >
                                            Submit response & get AI evaluation
                                        </button>
                                    </div>
                                )}
                            </form>
                        </section>

                        {/* Community Responses Section (pm2.png) */}
                        <section className="pm-community-responses-block">
                            <div className="pm-community-responses-header">
                                <div>
                                    <h2>Community responses</h2>
                                    <span className="pm-community-responses-count">
                                        {responses.total ?? '128'} responses
                                    </span>
                                </div>

                                <button type="button" className="pm-sort-dropdown" style={{ height: '40px' }}>
                                    Most helpful <ChevronDown size={14} />
                                </button>
                            </div>

                            <div className="pm-responses-list">
                                {responses.data.map((resp) => {
                                    const isExpanded = Boolean(expandedFeedback[resp.id]);
                                    const hasReplies = Boolean(resp.replies && resp.replies.length > 0);
                                    const areRepliesExpanded = Boolean(expandedReplies[resp.id]);

                                    return (
                                        <article key={resp.id} className="pm-response-card">
                                            {/* Response Header */}
                                            <div className="pm-response-card-header">
                                                <div className="pm-author-info-wrap">
                                                    <Avatar name={resp.user.name} size={40} />
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

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                                            <p className="pm-card-body" style={{ margin: '8px 0 14px' }}>
                                                {resp.body}
                                            </p>

                                            {/* AI Reasoning Score & Feedback Pill */}
                                            {resp.ai_score && (
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
                                                                        gap: '8px',
                                                                    }}
                                                                >
                                                                    <Cpu size={16} color="var(--primary)" /> AI feedback
                                                                </span>
                                                                <ChevronUp size={16} />
                                                            </div>

                                                            <ul className="pm-ai-rubric-list">
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
                                                                Scenario-based feedback, not a professional
                                                                certification.
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Action bar for response */}
                                            <div className="pm-card-action-bar" style={{ marginTop: '12px' }}>
                                                <div className="pm-action-buttons-group">
                                                    <button type="button" className="pm-action-item">
                                                        <ThumbsUp size={14} /> Like {resp.likes_count ?? 18}
                                                    </button>
                                                    <button type="button" className="pm-action-item">
                                                        <Heart size={14} /> Love {resp.loves_count ?? 7}
                                                    </button>
                                                    {scenario.status === 'published' && <button
                                                        type="button"
                                                        className="pm-action-item"
                                                        onClick={() =>
                                                            setReplyingToId(
                                                                replyingToId === resp.id ? null : resp.id
                                                            )
                                                        }
                                                    >
                                                        <MessageCircle size={14} /> Reply
                                                    </button>}
                                                    <button type="button" className="pm-action-item">
                                                        <Share2 size={14} /> Share
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Inline Reply Form when clicking Reply */}
                                            {replyingToId === resp.id && (
                                                <div style={{ marginTop: '14px' }}>
                                                    {canRespond ? (
                                                        <form
                                                            onSubmit={(e) => {
                                                                e.preventDefault();
                                                                form.setData('parent_id', resp.id);
                                                                handleSubmitResponse(e);
                                                            }}
                                                        >
                                                            <textarea
                                                                className="pm-response-textarea"
                                                                style={{ minHeight: '80px' }}
                                                                placeholder={`Reply to ${resp.user.name}...`}
                                                                value={form.data.body}
                                                                onChange={(e) => form.setData('body', e.target.value)}
                                                                required
                                                            />
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    gap: '8px',
                                                                    justifyContent: 'flex-end',
                                                                    marginTop: '8px',
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className="pm-button pm-button-outline pm-button-sm"
                                                                    onClick={() => setReplyingToId(null)}
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="submit"
                                                                    className="pm-button pm-button-sm"
                                                                    disabled={form.processing}
                                                                >
                                                                    Send reply
                                                                </button>
                                                            </div>
                                                        </form>
                                                    ) : (
                                                        <div className="pm-submit-lock-notice">
                                                            <Lock size={14} /> <Link href="/login">Log in</Link> or{' '}
                                                            <Link href="/register">join free</Link> to post a reply.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Threaded Nested Replies (pm2.png) */}
                                            {hasReplies && (
                                                <div className="pm-threaded-replies-wrap">
                                                    {resp.replies!.map((reply) => (
                                                        <div key={reply.id} className="pm-nested-reply-card">
                                                            <div
                                                                className="pm-author-info-wrap"
                                                                style={{ marginBottom: '6px' }}
                                                            >
                                                                <Avatar name={reply.user.name} size={28} />
                                                                <div className="pm-author-meta">
                                                                    <strong style={{ fontSize: 'var(--pm-font-size-13px)' }}>
                                                                        {reply.user.name}
                                                                    </strong>
                                                                    <span style={{ fontSize: 'var(--pm-font-size-11px)' }}>
                                                                        {reply.user.profile?.role ?? 'Member'} · 4 hours
                                                                        ago
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <p
                                                                style={{
                                                                    fontSize: 'var(--type-small)',
                                                                    color: 'var(--text)',
                                                                    margin: 0,
                                                                    lineHeight: 'var(--type-line-body)',
                                                                }}
                                                            >
                                                                {reply.body}
                                                            </p>
                                                        </div>
                                                    ))}

                                                    <button
                                                        type="button"
                                                        className="pm-toggle-replies-btn"
                                                        onClick={() => toggleReplies(resp.id)}
                                                    >
                                                        View {resp.replies!.length} replies{' '}
                                                        {areRepliesExpanded ? (
                                                            <ChevronUp size={14} />
                                                        ) : (
                                                            <ChevronDown size={14} />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
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
                        {/* 1. About this scenario */}
                        <section className="pm-sidebar-card">
                            <h3>About this scenario</h3>
                            <div className="pm-info-row">
                                <Sliders size={18} />
                                <span>Difficulty</span>
                                <strong>{scenario.difficulty}</strong>
                            </div>
                            <div className="pm-info-row">
                                <Target size={18} />
                                <span>Focus</span>
                                <strong>{scenario.focus}</strong>
                            </div>
                            <div className="pm-info-row" style={{ borderBottom: 'none' }}>
                                <Clock size={18} />
                                <span>Practice time</span>
                                <strong>5–{scenario.minutes} minutes</strong>
                            </div>
                        </section>

                        {/* 2. How AI feedback works */}
                        <section className="pm-sidebar-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <Cpu size={22} color="var(--primary)" />
                                <h3 style={{ margin: 0, fontSize: 'var(--type-lead)' }}>How AI feedback works</h3>
                            </div>
                            <p style={{ fontSize: 'var(--type-small)', color: 'var(--text)', lineHeight: 'var(--type-line-body)' }}>
                                Responses are reviewed for reasoning, trade-offs, stakeholder involvement and practical
                                next steps.
                            </p>
                            <small
                                style={{ display: 'block', color: 'var(--muted)', fontSize: 'var(--type-caption)', margin: '8px 0' }}
                            >
                                AI feedback can be imperfect. Use your judgment.
                            </small>
                            <a
                                href="#assessment-criteria"
                                className="pm-text-link"
                                style={{ fontSize: 'var(--pm-font-size-13px)', display: 'inline-block', marginTop: '6px' }}
                            >
                                View assessment criteria →
                            </a>
                        </section>

                        {/* 3. Your perspective belongs here */}
                        <section className="pm-cta-guest-card">
                            <Users size={28} className="pm-cta-guest-icon" />
                            <h3 style={{ fontSize: 'var(--type-lead)', fontWeight: 'var(--pm-font-weight-800)', margin: '0 0 8px' }}>
                                Your perspective belongs here.
                            </h3>
                            <p style={{ fontSize: 'var(--type-small)', color: 'var(--muted)', margin: '0 0 16px' }}>
                                Respond, learn from feedback and track your progress.
                            </p>
                            <Link href="/register" className="pm-button pm-btn-full">
                                Join the community — free
                            </Link>
                            {isGuest && (
                                <span className="pm-cta-guest-login">
                                    Already a member? <Link href="/login">Log in</Link>
                                </span>
                            )}
                            <small
                                style={{
                                    display: 'block',
                                    color: 'var(--muted)',
                                    fontSize: 'var(--type-caption)',
                                    marginTop: '16px',
                                }}
                            >
                                Member photos and full profiles are visible after sign-in.
                            </small>
                        </section>

                        {/* 4. Explore another situation */}
                        {related.length > 0 && (
                            <section className="pm-sidebar-card" style={{ marginTop: '20px' }}>
                                <h3>Explore another situation</h3>
                                <nav className="pm-topics-nav-list" aria-label="Other scenarios">
                                    {related.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={`${memberView ? libraryRoot : '/scenarios'}/${encodeURIComponent(item.slug)}`}
                                            className="pm-topic-nav-item"
                                            style={{ padding: '14px 0' }}
                                        >
                                            <span style={{ fontSize: 'var(--type-small)', color: 'var(--text)' }}>{item.title}</span>
                                            <ChevronRight size={16} color="var(--primary)" />
                                        </Link>
                                    ))}
                                </nav>
                            </section>
                        )}
                    </aside>
                </div>
            </div>
        </PublicLayout>
    );
}
