import { Head, usePage } from '@inertiajs/react';
import { BriefcaseBusiness, ChartNoAxesColumnIncreasing, Lightbulb, Newspaper, Target } from 'lucide-react';
import { useState } from 'react';
import { TrendCard } from '@/components/trends/TrendShared';
import { trendArticles, trendCategories, type TrendCategory } from '@/data/pm-trends';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

const icons = [null, BriefcaseBusiness, ChartNoAxesColumnIncreasing, Target, Lightbulb, Newspaper] as const;

export default function Index() {
    const [category, setCategory] = useState<'All' | TrendCategory>('All');
    const search = new URLSearchParams(usePage().url.split('?')[1] ?? '').get('search')?.trim().toLocaleLowerCase() ?? '';
    const visible = trendArticles.filter(article =>
        (category === 'All' || article.category === category) &&
        (!search || `${article.title} ${article.summary} ${article.category}`.toLocaleLowerCase().includes(search))
    );

    return <PublicLayout siteLayout active="/pm-trends"><Head title="PM Trends & Insights"/>
        <div className="pm-trends pm-container pm-page">
            <section className="pm-trends-hero"><div className="pm-trends-hero-content"><div className="pm-trends-hero-text">
                <h1>PM Trends &amp; Insights</h1>
                <p>Latest job trends, industry updates, challenges, and practical insights for Project Management professionals.</p>
            </div></div></section>
            <div className="pm-trends-listing">
                <nav className="pm-trends-filters" aria-label="Filter PM Trends">
                    {trendCategories.map((item, i) => {
                        const Icon = icons[i];
                        return <button key={item} className={`pm-trend-filter${category === item ? ' is-selected' : ''}`} type="button"
                            aria-pressed={category === item} onClick={() => setCategory(item)}>
                            {Icon && <Icon size={21} strokeWidth={1.7} aria-hidden="true"/>}
                            {item}{item === 'All' ? ` (${trendArticles.length})` : ''}
                        </button>;
                    })}
                </nav>
                {search && <p className="pm-trend-search-caption">Search results for “{search}”</p>}
                <div className="pm-trend-cards">
                    {visible.length ? visible.map(article => <TrendCard key={article.slug} article={article}/>)
                        : <div className="pm-trend-empty">No articles in this category yet.</div>}
                </div>
            </div>
        </div>
    </PublicLayout>;
}
