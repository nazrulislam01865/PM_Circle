/** Static prototype content. No network calls or database access. */
export const trendCategories = ['All', 'Job Trends', 'Market Insights', 'Challenges', 'How to Adapt', 'Industry News'] as const;
export type TrendCategory = Exclude<(typeof trendCategories)[number], 'All'>;

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
    category: TrendCategory;
    classification: 'AI Analysis' | 'Industry Source';
    thumbnail: string;
    hero?: string;
    attribution: string;
    sources?: { title: string; url: string }[];
    intro: string;
    sections: { title: string; text?: string; bullets?: string[]; chart?: string }[];
};

const imageBase = '/images/trends/';
export const trendArticles: TrendArticle[] = [
    {
        slug: 'top-project-management-job-trends-2025',
        title: 'Top 7 Project Management Job Trends in 2025',
        summary: 'A data-backed look at the most in-demand PM roles, required skills, and where the opportunities are growing.',
        date: '8 Nov 2026', readMinutes: 6, category: 'Job Trends', classification: 'AI Analysis',
        thumbnail: `${imageBase}job-trends.webp`, attribution: 'AI-generated analysis based on industry reports',
        intro: 'Project management continues to evolve as organizations build complex, digital and cross-functional teams.',
        sections: [
            { title: 'Where opportunities are growing', text: 'Technology, healthcare and sustainability-focused projects are highlighted as important areas for project management professionals.' },
            { title: 'Skills that matter', text: 'Adaptable delivery approaches, stakeholder communication, risk management and collaboration remain useful capabilities for project managers.' },
            { title: 'What It Means for You', text: 'Build practical experience, strengthen your communication skills and keep learning approaches that combine agile and predictive planning.' },
        ],
    },
    {
        slug: 'project-management-job-demand-2025',
        title: 'Global Demand for Project Managers Expected to Grow 28% in 2025',
        articleTitle: 'Project Management Job Demand to Grow 28% in 2025',
        articleLead: 'Global demand for PM professionals continues to rise, especially in Tech, Healthcare, and Green Energy projects.',
        articleCategoryLabel: 'Job Trends',
        summary: 'New industry findings show continued growth in PM roles across Tech, Healthcare, and Green Energy sectors.',
        date: '5 Nov 2026', listingDate: '6 Nov 2026', readMinutes: 4, category: 'Market Insights', classification: 'Industry Source',
        thumbnail: `${imageBase}growth.webp`, hero: `${imageBase}office-project-plan.webp`,
        attribution: 'Source: PMI, LinkedIn Economic Graph',
        sources: [
            { title: 'PMI', url: 'https://www.pmi.org/' },
            { title: 'LinkedIn Economic Graph', url: 'https://economicgraph.linkedin.com/' },
        ],
        intro: 'The demand for Project Management (PM) professionals is expected to grow by around 28% in 2025, according to recent industry reports. Organizations across technology, healthcare, and green energy sectors are investing in more projects, creating new opportunities for skilled PMs.',
        sections: [
            { title: 'Why the Demand Is Rising', text: 'Businesses are running more complex, digital, and cross-functional projects. This has increased the need for professionals who can plan, coordinate, manage risks, and ensure successful delivery.' },
            { title: '', chart: `${imageBase}project-manager-demand.webp` },
            { title: 'Key Areas of Growth', bullets: ['Technology and digital transformation projects.', 'Healthcare and life sciences initiatives.', 'Renewable and green energy programs.'] },
            { title: 'What It Means for You', text: 'This is a great time to build or strengthen your project management skills. Gaining hands-on experience, learning Agile/Hybrid approaches, and pursuing relevant certifications (such as PMP® or CSM®) can increase your career opportunities in 2025 and beyond.' },
        ],
    },
    {
        slug: 'project-management-challenges-2025',
        title: 'Top 5 Project Management Challenges in 2025 (and How to Overcome Them)',
        summary: 'From resource constraints to rapid technology change—explore practical ways to stay ahead.',
        date: '3 Nov 2026', readMinutes: 5, category: 'Challenges', classification: 'AI Analysis',
        thumbnail: `${imageBase}challenges.webp`, attribution: 'AI insights with practical recommendations',
        intro: 'Project managers balance changing requirements, resources and stakeholder expectations while keeping teams aligned.',
        sections: [
            { title: 'Common project challenges', bullets: ['Resource availability and competing priorities.', 'Changing requirements and expectations.', 'Timely decisions across teams and stakeholders.', 'Managing delivery risks.', 'Adapting to new technology.'] },
            { title: 'How to respond', text: 'Make risks visible early, communicate trade-offs clearly and adapt plans based on evidence and team feedback.' },
        ],
    },
    {
        slug: 'ai-project-management-adoption',
        title: 'AI in Project Management: Adoption, Use Cases, and What It Means for PMs',
        summary: 'How organizations are using AI for planning, management, and delivery—and the skills PMs need to stay relevant.',
        date: '30 Oct 2026', readMinutes: 7, category: 'How to Adapt', classification: 'Industry Source',
        thumbnail: `${imageBase}ai-adoption.webp`, attribution: 'Source: Gartner, PMI',
        sources: [{ title: 'Gartner', url: 'https://www.gartner.com/' }, { title: 'PMI', url: 'https://www.pmi.org/' }],
        intro: 'AI-assisted tools are increasingly part of conversations about planning, reporting and project delivery.',
        sections: [
            { title: 'Where AI can help', bullets: ['Summarizing project updates.', 'Supporting planning and scenario exploration.', 'Drafting communications for review.'] },
            { title: 'What It Means for You', text: 'Use AI as a support tool, verify outputs and retain professional judgment for decisions involving people, delivery and risk.' },
        ],
    },
    {
        slug: 'green-sustainable-projects',
        title: 'Green & Sustainable Projects: A Growing Opportunity for Project Managers',
        summary: 'Sustainability and ESG-focused projects are creating new demand for PM skills across industries.',
        date: '28 Oct 2026', readMinutes: 4, category: 'Market Insights', classification: 'Industry Source',
        thumbnail: `${imageBase}green-energy.webp`, attribution: 'Source: WEF, PMI',
        sources: [{ title: 'WEF', url: 'https://www.weforum.org/' }, { title: 'PMI', url: 'https://www.pmi.org/' }],
        intro: 'Sustainability-focused projects often bring together technology, regulation, local communities and multiple delivery partners.',
        sections: [
            { title: 'Project management opportunities', text: 'Green energy and sustainability initiatives benefit from strong stakeholder coordination, risk planning and measurable project outcomes.' },
            { title: 'What It Means for You', text: 'Strengthen your experience in complex programs and familiarize yourself with sustainability objectives and reporting requirements.' },
        ],
    },
];

export const trendArticleHref = (slug: string) => `/pm-trends/${encodeURIComponent(slug)}`;
