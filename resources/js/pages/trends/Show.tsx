import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { HomePhoto } from '@/components/home/v2/HomePhoto';
import { trendArticleHref, type TrendArticle } from '@/data/pm-trends';
import type { TrendDetailSettings } from '@/types/public-content';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import '../../../css/pm-trends-public.css';
import '../../../css/pm-trends-detail.css';

type ReportComment = { text: string };
const commentsKey = (slug: string) => `pm-trend-comments-${slug}`;

function readComments(slug: string): ReportComment[] {
    try {
        const raw: unknown = JSON.parse(window.localStorage.getItem(commentsKey(slug)) ?? '[]');
        return Array.isArray(raw) ? raw.filter((item): item is ReportComment =>
            item !== null && typeof item === 'object' && typeof item.text === 'string' && item.text.trim().length > 0 && item.text.length <= 2000).slice(-100) : [];
    } catch { return []; }
}

type Props = { article: TrendArticle; related: {slug: string; title: string}[]; settings: TrendDetailSettings; pageTitle: string };

function ReportDetail({ article, related, settings }: Omit<Props, 'pageTitle'>) {
    const { auth } = usePage().props;
    const slug = article.slug;
    const isSample = Boolean(article.sample);
    const title = article.articleTitle || article.title;
    const lead = article.articleLead || article.summary;
    const [bookmarked, setBookmarked] = useState(() => {
        try { return window.localStorage.getItem(`pm-trend-bookmark-${slug}`) === 'true'; }
        catch { return false; }
    });
    const [actionStatus, setActionStatus] = useState('');
    const [comments, setComments] = useState(() => readComments(slug));
    const [draft, setDraft] = useState('');
    const [commentError, setCommentError] = useState('');
    const fallback = article.category === 'Career Paths' ? 'stakeholder' : article.category === 'Skills' ? 'scrum' : 'tutor';

    function toggleBookmark() {
        try {
            window.localStorage.setItem(`pm-trend-bookmark-${slug}`, String(!bookmarked));
            setBookmarked(!bookmarked);
            setActionStatus('');
        } catch { setActionStatus('Could not update saved reports. Browser storage may be unavailable.'); }
    }

    async function share() {
        setActionStatus('');
        try {
            const url = window.location.href.split('#')[0];
            if (navigator.share) await navigator.share({ title, url });
            else { await navigator.clipboard.writeText(url); setActionStatus('Link copied'); }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setActionStatus('Could not share this report. You can copy the address from your browser.');
        }
    }

    function submitComment(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!auth?.user) return;
        const text = draft.trim();
        if (!text || text.length > 2000) { setCommentError('Enter a comment of 1–2000 characters.'); return; }
        const next = [...readComments(slug), { text }].slice(-100);
        try {
            window.localStorage.setItem(commentsKey(slug), JSON.stringify(next));
            setComments(next);
            setDraft('');
            setCommentError('');
        } catch { setCommentError('Could not save your comment in this browser.'); }
    }

    return <>
        <Head title={title}><meta name="description" content={lead}/></Head>
        <div className="pm-public-trends-wrap pm-report-main">
            <article className="pm-report-reading">
                <p className="pm-public-trends-meta"><strong>{article.articleCategoryLabel || article.category}</strong> · {isSample ? 'Sample report' : article.classification} · {article.readMinutes} min read</p>
                <p className="pm-public-trends-meta pm-report-publication">Published on PM Circle {article.date}{article.sources?.length ? <> · Source: {article.sources.map((source, index) => <span key={source.url}>{index ? ', ' : ''}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></span>)}</> : null}</p>
                {(settings.saveEnabled || settings.shareEnabled || settings.commentsEnabled) && <div className="pm-report-actions">
                    {settings.saveEnabled && <button type="button" className="pm-guide-button is-outline" aria-pressed={bookmarked} onClick={toggleBookmark}>{bookmarked ? 'Saved report' : 'Save report'}</button>}
                    {settings.shareEnabled && <button type="button" className="pm-guide-button is-outline" onClick={() => void share()}>Share</button>}
                    {settings.commentsEnabled && <a href="#report-comments">Comments ({comments.length})</a>}
                </div>}
                {actionStatus && <p className="pm-public-trends-meta" role="status">{actionStatus}</p>}
                <HomePhoto photo={fallback} source={article.hero ?? article.thumbnail} alt="Project management report illustration" className="pm-report-photo" eager/>
                <div className="pm-report-body">
                    {article.intro && <p>{article.intro}</p>}
                    {article.sections?.map((section, index) => <section className="pm-report-section" key={index}>
                        {section.title && <h2>{section.title}</h2>}
                        {section.text && <p>{section.text}</p>}
                        {section.image && <HomePhoto photo={fallback} source={section.image} alt={section.imageAlt ?? ''} className="pm-report-photo"/>}
                        {section.chart && <img className="pm-report-chart" src={section.chart} alt={section.imageAlt || section.title || 'Report chart'} loading="lazy"/>}
                        {section.bullets && <ul>{section.bullets.map((item, i) => <li key={i}>{item}</li>)}</ul>}
                    </section>)}
                    {article.bodyHtml && <div className="pm-report-markdown" dangerouslySetInnerHTML={{__html: article.bodyHtml}}/>}
                    {article.sources?.length ? <section className="pm-report-section"><h2>{settings.sourceTitle}</h2>{article.sources.map(source => <div key={source.url}><p><a href={source.url} target="_blank" rel="noopener noreferrer">{source.reportTitle || source.title}</a>{source.reportTitle && <> · {source.title}</>}</p>{source.description && <p>{source.description}</p>}</div>)}</section> : null}
                </div>
                <aside className="pm-report-notice">
                    <strong>{isSample ? settings.sampleNoticeTitle : settings.noticeTitle}</strong>
                    <p>{isSample ? settings.sampleNoticeText : settings.noticeText}</p>
                </aside>
                {settings.commentsEnabled && <section className="pm-report-comments" id="report-comments" aria-labelledby="report-comments-title">
                    <h2 id="report-comments-title">Comments</h2>
                    <p className="pm-public-trends-meta">Comments you post in this prototype are visible only in this browser.</p>
                    {auth?.user ? <form className="pm-report-comment-form" onSubmit={submitComment}>
                        <label className="pm-guide-field-label" htmlFor="report-comment">Write a comment</label>
                        <textarea id="report-comment" className="pm-guide-control" rows={3} maxLength={2000} required value={draft} onChange={event => setDraft(event.target.value)} aria-invalid={Boolean(commentError)} aria-describedby={commentError ? 'report-comment-error' : undefined}/>
                        {commentError && <p className="pm-report-error" id="report-comment-error" role="alert">{commentError}</p>}
                        <button className="pm-guide-button" type="submit">Post comment</button>
                    </form> : <div className="pm-report-comment-login"><p>Log in to join the discussion.</p><Link href="/login" className="pm-guide-button is-outline">Log in to comment</Link></div>}
                    {comments.length ? <ul className="pm-report-comment-list">{comments.map((comment, index) => <li key={index}>{comment.text}</li>)}</ul> : <p>No comments yet. Be the first to share a thought.</p>}
                </section>}
                {settings.relatedEnabled && <nav className="pm-report-related" aria-labelledby="report-related-title">
                    <h2 id="report-related-title">{settings.relatedTitle}</h2>
                    <ul>{related.map(report => <li key={report.slug}><Link href={trendArticleHref(report.slug)}>{report.title}</Link></li>)}</ul>
                    <Link href="/pm-trends">{settings.allReportsLabel}</Link>
                </nav>}
            </article>
        </div>
    </>;
}

export default function Show({ article, related, settings, pageTitle }: Props) {
    return <PublicLayout siteLayout homePrototype guideLayout active="/pm-trends" banner={{title: article.articleTitle || article.title, description: article.articleLead || article.summary, parents: [{label: pageTitle, href: '/pm-trends'}], currentLabel: 'Report', titleId: 'pm-report-title'}}>
        <div className="pm-public-trends-page pm-public-trends-detail pm-guide-public-shell">
            <LegacyPageHeading><section className="pm-terms-banner" aria-labelledby="pm-report-title"><div className="pm-public-trends-wrap"><nav className="pm-terms-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/pm-trends">{pageTitle}</Link><span aria-hidden="true">/</span><span aria-current="page">Report</span></nav><h1 id="pm-report-title">{article.articleTitle || article.title}</h1><p>{article.articleLead || article.summary}</p></div></section></LegacyPageHeading>
            <ReportDetail key={article.slug} article={article} related={related} settings={settings}/></div>
    </PublicLayout>;
}
