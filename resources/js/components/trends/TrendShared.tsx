import { Link } from '@inertiajs/react';
import { ArrowRight, CalendarDays, Clock3, ExternalLink, Sparkles } from 'lucide-react';
import { type TrendArticle, trendArticleHref } from '@/data/pm-trends';

export function TrendBadges({ article, articlePage = false }: { article: TrendArticle; articlePage?: boolean }) {
    return <div className="pm-trend-badges">
        {articlePage ? <><span className="pm-trend-badge is-blue">{article.articleCategoryLabel ?? article.category}</span><span className="pm-trend-badge is-purple">AI Insight</span></>
            : <><span className={`pm-trend-badge ${article.classification === 'AI Analysis' ? 'is-purple' : 'is-muted'}`}>{article.classification}</span>
                <span className="pm-trend-badge is-blue">{article.category}</span></>}
    </div>;
}

export function TrendCard({ article }: { article: TrendArticle }) {
    return <article className="pm-trend-card">
        <Link className="pm-trend-image-link" href={trendArticleHref(article.slug)} aria-label={`Read ${article.title}`}>
            <img src={article.thumbnail} alt="" loading="lazy" width="250" height="96"/>
        </Link>
        <div className="pm-trend-card-content">
            <TrendBadges article={article}/>
            <h2><Link href={trendArticleHref(article.slug)}>{article.title}</Link></h2>
            <p>{article.summary}</p>
            <div className="pm-trend-meta">
                <span><CalendarDays aria-hidden="true"/>{article.listingDate ?? article.date}</span>
                <span><Clock3 aria-hidden="true"/>{article.readMinutes} min read</span>
                <span className={article.classification === 'AI Analysis' ? 'is-ai' : 'is-source'}>
                    {article.classification === 'AI Analysis' ? <Sparkles aria-hidden="true"/> : <ExternalLink aria-hidden="true"/>}
                    {article.attribution}
                </span>
            </div>
        </div>
        <Link className="btn small pm-trend-read" href={trendArticleHref(article.slug)}>Read More <ArrowRight size={17}/></Link>
    </article>;
}
