import { Head, Link } from '@inertiajs/react';
import { Bookmark, ChevronRight, Clock3, Home, Info, Link2, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Brand } from '@/components/pm/Brand';
import { TrendBadges } from '@/components/trends/TrendShared';
import { trendArticles } from '@/data/pm-trends';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

export default function Show({ slug }: { slug: string }) {
    const article = trendArticles.find(item => item.slug === slug);
    const [bookmarked, setBookmarked] = useState(() => {
        try { return typeof window !== 'undefined' && window.localStorage.getItem(`pm-trend-bookmark-${slug}`) === 'true'; }
        catch { return false; }
    });
    const [shareStatus, setShareStatus] = useState('');

    if (!article) return <PublicLayout siteLayout active="/pm-trends"><Head title="Article not found"/><div className="pm-trends pm-container pm-page pm-trends-not-found"><h1>Article not found</h1><Link className="btn secondary" href="/pm-trends">Back to PM Trends</Link></div></PublicLayout>;

    const toggleBookmark = () => {
        const next = !bookmarked;
        try { window.localStorage.setItem(`pm-trend-bookmark-${slug}`, String(next)); } catch { /* Local preference is optional. */ }
        setBookmarked(next);
    };
    const share = async () => {
        try {
            const url = window.location.href;
            if (navigator.share) await navigator.share({ title: article.articleTitle ?? article.title, url });
            else { await navigator.clipboard.writeText(url); setShareStatus('Link copied'); }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setShareStatus('Could not share this article');
        }
    };

    return <PublicLayout siteLayout active="/pm-trends"><Head title={article.articleTitle ?? article.title}/>
        <div className="pm-trends pm-container pm-page pm-trend-article-page">
            <nav className="pm-crumbs pm-trend-breadcrumb" aria-label="Breadcrumb"><Link href="/"><Home size={17}/><span className="sr-only">Home</span></Link><ChevronRight size={15}/><Link href="/pm-trends">PM Trends</Link><ChevronRight size={15}/><span aria-current="page">Article</span></nav>
            <article className="pm-trends-article pm-panel">
                <TrendBadges article={article} articlePage/>
                <h1>{article.articleTitle ?? article.title}</h1>
                <p className="pm-trend-lead">{article.articleLead ?? article.summary}</p>
                <div className="pm-trend-article-toolbar">
                    <div className="pm-trend-article-byline"><Brand small/><strong>PM Circle Insights</strong><span className="pm-trend-separator"/>
                        <span>{article.date}</span><span className="pm-trend-separator"/><span className="pm-trend-reading"><Clock3 size={17}/>{article.readMinutes} min read</span></div>
                    <div className="pm-trend-social"><button className="pm-trend-icon-button" type="button" aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this article'} aria-pressed={bookmarked} title={bookmarked ? 'Remove bookmark' : 'Bookmark'} onClick={toggleBookmark}><Bookmark size={21} fill={bookmarked ? 'currentColor' : 'none'}/></button>
                        <button className="pm-trend-icon-button" type="button" title="Share article" aria-label="Share article" onClick={() => void share()}><Share2 size={20}/></button></div>
                </div>
                {shareStatus && <p className="pm-trend-share-status" role="status">{shareStatus}</p>}
                <img className="pm-trend-cover" src={article.hero ?? article.thumbnail} alt="Project management trends and insights" width="745" height="196"/>
                <div className="pm-trend-article-body"><p>{article.intro}</p>
                    {article.sections.map((section, i) => <section key={`${i}-${section.title}`}>
                        {section.title && <h2>{section.title}</h2>}
                        {section.text && <p>{section.text}</p>}
                        {section.chart && <img className="pm-trend-article-chart" src={section.chart} alt="Illustration from the supplied prototype: PM job demand chart labelled 28 percent, 2024 to 2025" width="744" height="143"/>}
                        {section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
                    </section>)}
                </div>
                {article.sources?.length ? <div className="pm-trend-sources"><Link2 size={19} aria-hidden="true"/><span>Source: {article.sources.map((source, i) => <span key={source.url}>{i ? ', ' : ''}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></span>)}</span></div> : null}
                <aside className="pm-trend-disclaimer"><Info size={25} aria-hidden="true"/><p><strong>Note:</strong> This article is AI-generated for learning and information purposes. The content is based on publicly available sources and general industry insights, and may not be fully accurate or up to date. Please verify key information from the original sources before making any career or business decisions.</p></aside>
            </article>
        </div>
    </PublicLayout>;
}
