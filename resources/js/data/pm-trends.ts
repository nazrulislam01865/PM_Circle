/** Static prototype content. No network calls or database access. */
export const trendCategories = ['All', 'Job Trends', 'Market Insights', 'Challenges', 'How to Adapt', 'Industry News'] as const;
export const reportTopics = ['AI at Work', 'Career Paths', 'Skills'] as const;
export type ReportTopic = (typeof reportTopics)[number];
export type TrendCategory = Exclude<(typeof trendCategories)[number], 'All'> | ReportTopic;

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
    sources?: { title: string; url: string; reportTitle?: string; description?: string }[];
    intro: string;
    sections: { title: string; text?: string; bullets?: string[]; chart?: string; image?: string; imageAlt?: string }[];
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

/** The three explicitly labelled public prototype reports. Older article URLs remain valid. */
export const sampleTrendReports: (TrendArticle & { category: ReportTopic })[] = [
    {
        slug: 'using-ai-for-project-updates-without-losing-the-facts',
        title: 'Using AI for project updates without losing the facts',
        summary: 'Where an AI draft can save time, and what a project manager still needs to verify before sharing it.',
        date: '22 Nov 2026', readMinutes: 1, category: 'AI at Work', classification: 'AI Analysis',
        thumbnail: `${imageBase}sample-ai-at-work.webp`, hero: `${imageBase}sample-ai-report-cover.webp`, attribution: 'Source: PMI',
        sources: [{ title: 'PMI', url: 'https://www.pmi.org/', reportTitle: 'Apply AI for Project Management', description: 'Background on AI-assisted planning, reporting and communication.' }],
        intro: '',
        sections: [
            { title: 'Start with the project record', text: 'A weekly update is a sensible place to try AI-assisted drafting. Begin with approved inputs such as the action log, decision register and the current schedule. Ask the tool to separate open decisions from completed work, and tell it to mark missing information.' },
            { title: 'Keep accountability with the project team', text: 'Check each proposed owner, date and status against the source. If someone’s update is ambiguous, confirm it with them before sharing the draft. Follow your organisation’s rules on what project information can be entered into AI tools.' },
            { title: '', image: `${imageBase}sample-ai-report-workspace.webp`, imageAlt: 'A desk with a computer, keyboard and handwritten project notes' },
            { title: 'Build an example for your portfolio', text: 'Save an anonymised before-and-after example. Describe how you verified dates and numbers and how the final update helped someone make a decision.' },
        ],
    },
    {
        slug: 'project-coordinator-role-in-bangladesh',
        title: 'What to look for in a project coordinator role in Bangladesh',
        summary: 'A practical guide to reading role descriptions and showing evidence of coordination skills.',
        date: '22 Nov 2026', readMinutes: 2, category: 'Career Paths', classification: 'AI Analysis',
        thumbnail: `${imageBase}sample-career-paths.webp`, attribution: 'Source: ActionAid Bangladesh via Bdjobs',
        sources: [{ title: 'ActionAid Bangladesh via Bdjobs', url: 'https://www.bdjobs.com/' }],
        intro: 'Read each role description carefully and identify the coordination responsibilities that you can demonstrate with your own experience.',
        sections: [{ title: 'Evidence of coordination', bullets: ['Describe how you tracked actions and deadlines.', 'Explain how you coordinated stakeholders and communicated progress.', 'Use examples of issues you helped resolve, without inventing results.'] }],
    },
    {
        slug: 'agile-delivery-skills-in-an-interview',
        title: 'Agile delivery skills you can demonstrate in an interview',
        summary: 'How to talk about planning, feedback and team delivery with examples from your own work.',
        date: '22 Nov 2026', readMinutes: 2, category: 'Skills', classification: 'AI Analysis',
        thumbnail: `${imageBase}sample-skills.webp`, attribution: 'Source: Scrum Guides',
        sources: [{ title: 'Scrum Guides', url: 'https://scrumguides.org/' }],
        intro: 'Use examples from your own work to explain how you supported planning, feedback and team delivery.',
        sections: [{ title: 'Prepare practical examples', bullets: ['Explain how the team planned work and adjusted to new information.', 'Describe how feedback influenced the next steps.', 'Discuss your contribution to delivery and what you learned.'] }],
    },
];

/** The public list filters its small static dataset locally; no API or database query. */
export function filterTrendReports(search: string, topic: 'All' | ReportTopic, savedOnly: boolean, isSaved: (slug: string) => boolean) {
    const query = search.trim().toLocaleLowerCase();
    return sampleTrendReports.filter(report =>
        (topic === 'All' || report.category === topic) &&
        (!query || `${report.title} ${report.category} ${report.summary}`.toLocaleLowerCase().includes(query)) &&
        (!savedOnly || isSaved(report.slug)),
    );
}

export const trendArticleHref = (slug: string) => `/pm-trends/${encodeURIComponent(slug)}`;
