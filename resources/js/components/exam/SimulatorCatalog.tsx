import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Gift, Star } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { RewardPromotionData } from '@/types/reward';
import { useRewardOfferDialog } from '@/components/rewards/RewardOfferDialog';

type Area = 'Project Management' | 'Agile & Scrum' | 'Business Analysis';
type Availability = 'Available' | 'Preview';
type Access = 'Free' | 'Paid';

type Simulator = {
    code: string;
    title: string;
    area: Area;
    availability: Availability;
    access: readonly Access[];
    summary: string;
    topics: string;
    image: string;
    href: string;
    rating?: string;
    ratings?: number;
    learners?: string;
};

// The supplied prototype contains five catalog examples. These are deliberately
// presentation data, NOT exam availability, pricing or learner statistics from the DB.
// Keep the real PMP landing, question bank and entitlements on their existing routes.
export const prototypeSimulators: readonly Simulator[] = [
    {
        code: 'PMP', title: 'PMP Exam Simulator', area: 'Project Management', availability: 'Available',
        access: ['Paid'], image: '/images/home/prototype/exam.webp', href: '/exam-simulator/pmp/details',
        summary: 'Timed practice, question review, and performance by topic.',
        topics: 'Timed practice · Answer explanations', rating: '4.8', ratings: 126, learners: '1,240',
    },
    {
        code: 'CSM', title: 'CSM Exam Simulator', area: 'Agile & Scrum', availability: 'Available',
        access: ['Paid'], image: '/images/home/prototype/scrum.webp', href: '/simulators/scrum',
        summary: 'Practise Scrum concepts and review explanations after each attempt.',
        topics: 'Scrum scenarios · Answer explanations', rating: '4.7', ratings: 64, learners: '680',
    },
    {
        code: 'PMI-PBA', title: 'Business Analysis Exam Simulator', area: 'Business Analysis', availability: 'Preview',
        access: ['Paid'], image: '/images/home/prototype/stakeholder.webp', href: '/simulators/business-analysis',
        summary: 'Practise requirements, stakeholder analysis and solution evaluation.',
        topics: 'Requirements · Stakeholder analysis',
    },
    {
        code: 'CAPM', title: 'CAPM Exam Simulator', area: 'Project Management', availability: 'Preview',
        access: ['Free'], image: '/images/home/prototype/foundations.webp', href: '/simulators/capm',
        summary: 'Practise project management fundamentals and review answer explanations.',
        topics: 'Foundations · Practice questions',
    },
    {
        code: 'PMI-ACP', title: 'PMI-ACP Exam Simulator', area: 'Agile & Scrum', availability: 'Preview',
        access: ['Paid'], image: '/images/home/prototype/hero-community.webp', href: '/simulators/pmi-acp',
        summary: 'Practise scenario-based questions on agile delivery and team collaboration.',
        topics: 'Agile scenarios · Team collaboration',
    },
];

const sampleReviews = [
    { quote: 'The explanations helped me see why my first answer was only partly right.', initials: 'SR', name: 'Sample learner 1', subtitle: 'Project Coordinator · PMP' },
    { quote: 'I used the Scrum practice questions to review the topics I kept missing.', initials: 'TH', name: 'Sample learner 2', subtitle: 'Scrum Master · CSM' },
    { quote: 'Timed practice helped me get more comfortable making decisions under pressure.', initials: 'NA', name: 'Sample learner 3', subtitle: 'Project Manager · PMI-ACP' },
    { quote: 'The question review made it easy to focus on what I needed to study next.', initials: 'KA', name: 'Sample learner 4', subtitle: 'Team Lead · CAPM' },
    { quote: 'Working through the scenarios helped me practise structured decision-making.', initials: 'AM', name: 'Sample learner 5', subtitle: 'Business Analyst · PMI-PBA' },
] as const;

type Filters = { query: string; area: string; availability: string; access: string };
const emptyFilters: Filters = { query: '', area: '', availability: '', access: '' };

/** The same blue/outline action family is reused across catalog cards and controls. */
function CatalogAction({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
    return <Link href={href} className={`pm-sim-action${primary ? ' is-primary' : ''}`}>{children}</Link>;
}

function SimulatorCard({ simulator }: { simulator: Simulator }) {
    return <article className="pm-sim-card">
        <div className="pm-sim-card-photo">
            <img src={simulator.image} alt="" width={480} height={190} loading="lazy" decoding="async" />
            <span className="pm-sim-photo-label">{simulator.code}</span>
        </div>
        <div className="pm-sim-card-copy">
            <div className="pm-sim-card-tags">
                <span className="pm-sim-chip is-area">{simulator.area}</span>
                <span className={`pm-sim-chip ${simulator.availability === 'Available' ? 'is-available' : 'is-preview'}`}>{simulator.availability}</span>
                {simulator.access.map(access => <span className={`pm-sim-chip ${access === 'Free' ? 'is-free' : 'is-paid'}`} key={access}>{access}</span>)}
            </div>
            <h3>{simulator.title}</h3>
            <p>{simulator.summary}</p>
            <p className="pm-sim-topics">{simulator.topics}</p>
            {simulator.rating ? <p className="pm-sim-rating"><Star aria-hidden="true" size={15} fill="currentColor" /> <strong>{simulator.rating}/5</strong> ({simulator.ratings} ratings) <span>{simulator.learners} learners</span></p> : <p className="pm-sim-rating">No ratings yet</p>}
            <CatalogAction href={simulator.href}>View details</CatalogAction>
        </div>
    </article>;
}

function SimulatorFilters({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
    return <div className="pm-sim-filters" role="search" aria-label="Filter exam simulators">
        <label>Search simulators
            <input type="search" value={filters.query} onChange={event => onChange({ ...filters, query: event.target.value })} placeholder="Search by certification or topic" />
        </label>
        <label>Certification area
            <select value={filters.area} onChange={event => onChange({ ...filters, area: event.target.value })}>
                <option value="">All areas</option>
                <option value="Project Management">Project Management</option>
                <option value="Agile & Scrum">Agile &amp; Scrum</option>
                <option value="Business Analysis">Business Analysis</option>
            </select>
        </label>
        <label>Availability
            <select value={filters.availability} onChange={event => onChange({ ...filters, availability: event.target.value })}>
                <option value="">All statuses</option>
                <option value="Available">Available</option>
                <option value="Preview">Preview</option>
            </select>
        </label>
        <label>Access
            <select value={filters.access} onChange={event => onChange({ ...filters, access: event.target.value })}>
                <option value="">Free or paid</option>
                <option value="Free">Free</option>
                <option value="Paid">Paid</option>
            </select>
        </label>
    </div>;
}

function PmpSpotlight() {
    const benefits = [
        ['3,000+ practice questions', 'Planned question bank with scenario-based practice.'],
        ['Traceable answer references', 'See the PMBOK® Guide edition, chapter and page where applicable, plus the PMP exam domain.'],
        ['Exam-style mock tests', 'Practise with timed sessions, flagged questions and a review screen before you finish.'],
        ['AI chat during answer review', 'Ask why an answer is correct or work through the reasoning behind another option.'],
        ['Performance dashboard', 'Track scores across attempts and see which exam domains need more practice.'],
    ] as const;
    return <section className="pm-sim-spotlight" aria-labelledby="pm-sim-spotlight-title">
        <img className="pm-sim-spotlight-photo" src="/images/home/prototype/exam.webp" alt="Learner practising on a laptop" width={450} height={600} loading="lazy" decoding="async" />
        <div className="pm-sim-spotlight-copy">
            <h2 id="pm-sim-spotlight-title">Practise for the PMP exam with PM Circle</h2>
            <div className="pm-sim-spotlight-benefits">{benefits.map(([title, description]) => <div key={title} className="pm-sim-spotlight-benefit"><h3>{title}</h3><p>{description}</p></div>)}</div>
            <CatalogAction href="/exam-simulator/pmp/details" primary>Explore the PMP Simulator</CatalogAction>
        </div>
    </section>;
}

function LearnerReviews() {
    const [start, setStart] = useState(0);
    const [reviewNotice, setReviewNotice] = useState(false);
    const lastStart = sampleReviews.length - 3;
    return <section className="pm-sim-reviews" aria-labelledby="pm-sim-reviews-heading">
        <div className="pm-sim-section-row"><div><h2 id="pm-sim-reviews-heading">What learners say</h2><p>Sample testimonials for this prototype.</p></div>
            <button type="button" className="pm-sim-action is-primary" onClick={() => setReviewNotice(value => !value)} aria-expanded={reviewNotice}>Write a review</button>
        </div>
        {reviewNotice && <p className="pm-sim-review-notice" role="status">Review submissions are not available yet. These testimonials are illustrative samples.</p>}
        <div className="pm-sim-review-grid">{sampleReviews.slice(start, start + 3).map(review => <article className="pm-sim-review-card" key={review.name}>
            <span className="pm-sim-quote" aria-hidden="true">“</span>
            <p>{review.quote}</p>
            <div className="pm-sim-review-author"><span className="pm-sim-review-avatar">{review.initials}</span><div><strong>{review.name}</strong><span>{review.subtitle}</span></div></div>
        </article>)}</div>
        <div className="pm-sim-pagination" aria-label="Learner reviews">
            <button type="button" aria-label="Previous reviews" onClick={() => setStart(current => Math.max(0, current - 1))} disabled={start === 0}><ChevronLeft aria-hidden="true" size={18}/></button>
            <span aria-live="polite">{start + 1}–{start + 3} of {sampleReviews.length}</span>
            <button type="button" aria-label="Next reviews" onClick={() => setStart(current => Math.min(lastStart, current + 1))} disabled={start === lastStart}><ChevronRight aria-hidden="true" size={18}/></button>
        </div>
    </section>;
}

/** UI-only prototype catalog: filtering is local and never queries restricted exam data. */
export function SimulatorCatalog({ promotion }: { promotion: RewardPromotionData | null }) {
    const [filters, setFilters] = useState<Filters>(emptyFilters);
    const openOffer = useRewardOfferDialog();
    const filtered = useMemo(() => prototypeSimulators.filter(simulator => {
        const query = filters.query.trim().toLocaleLowerCase();
        return (!query || [simulator.code, simulator.title, simulator.area, simulator.summary, simulator.topics].join(' ').toLocaleLowerCase().includes(query))
            && (!filters.area || simulator.area === filters.area)
            && (!filters.availability || simulator.availability === filters.availability)
            && (!filters.access || simulator.access.includes(filters.access as Access));
    }), [filters]);
    const showSpotlight = filtered.some(simulator => simulator.code === 'PMP');

    return <div className="pm-simulators-page">
        <section className="pm-sim-banner" aria-labelledby="pm-sim-page-title"><div className="pm-v2-container">
            <nav className="pm-sim-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Browse Exam Simulators</span></nav>
            <h1 id="pm-sim-page-title">Browse Exam Simulators</h1>
            <p>Find practice for your certification, see what each simulator covers, and choose how to get started.</p>
        </div></section>
        <div className="pm-sim-main">
            {promotion && <aside className="pm-sim-reward" aria-label="Profile completion offer"><span className="pm-sim-reward-icon"><Gift aria-hidden="true" size={20}/></span>
                <div><strong>Complete your profile. Get {promotion.discountLabel} off.</strong><p>Reach 100% profile completion to receive a discount code for any PM Circle Exam Simulator.</p></div>
                <button type="button" className="pm-sim-action" onClick={() => openOffer?.()}>See how it works</button>
            </aside>}
            <div className="pm-sim-section-row pm-sim-catalog-heading"><h2>Exam simulators</h2><Link href="/pricing">Compare plans</Link></div>
            <SimulatorFilters filters={filters} onChange={setFilters}/>
            <div className="pm-sim-count-row"><span role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'simulator' : 'simulators'}</span>
                {Object.values(filters).some(Boolean) && <button type="button" onClick={() => setFilters(emptyFilters)}>Clear filters</button>}
            </div>
            <p className="pm-sim-sample-note">Access labels, ratings and learner counts are sample data for this prototype.</p>
            {filtered.length ? <>
                <div className="pm-sim-card-grid">{filtered.slice(0, 3).map(simulator => <SimulatorCard key={simulator.code} simulator={simulator}/>)}</div>
                {showSpotlight && <PmpSpotlight/>}
                {filtered.length > 3 && <div className="pm-sim-card-grid pm-sim-last-row">{filtered.slice(3).map(simulator => <SimulatorCard key={simulator.code} simulator={simulator}/>)}</div>}
            </> : <div className="pm-sim-no-results" role="status"><h3>No simulators match your filters</h3><p>Try a different certification, availability or access type.</p><button type="button" className="pm-sim-action" onClick={() => setFilters(emptyFilters)}>Clear filters</button></div>}
            <LearnerReviews/>
        </div>
    </div>;
}
