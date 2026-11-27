export type TrendArticle = {
    slug: string;
    title: string;
    articleTitle?: string;
    articleLead?: string;
    articleCategoryLabel?: string;
    summary: string;
    date: string;
    listingDate?: string;
    readMinutes: number;
    category: string;
    classification: 'AI Analysis' | 'Industry Source' | 'Editorial report';
    thumbnail: string;
    hero?: string;
    attribution: string;
    sources?: { title: string; url: string; reportTitle?: string; description?: string }[];
    intro?: string;
    sample?: boolean;
    bodyHtml?: string;
    sections?: { title: string; text?: string; bullets?: string[]; chart?: string; image?: string; imageAlt?: string }[];
};

export const trendArticleHref = (slug: string) => `/pm-trends/${encodeURIComponent(slug)}`;
