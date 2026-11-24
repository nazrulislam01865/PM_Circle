import { Pagination } from '@/components/pm/Pagination';
import { MobileFilterPanel } from '@/components/pm/MobileFilterPanel';
import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { DemoCourseData } from '@/types/learning';
import { demoCourseHref } from '@/types/learning';
import type { RewardPromotionData } from '@/types/reward';

const topicLabels = [
    'All topics',
    'Agile & Scrum',
    'Leadership & Communication',
    'Project Management',
    'Risk Management',
    'Stakeholder Management',
] as const;

const PAGE_SIZE = 5;

type Topic = (typeof topicLabels)[number];
type Access = 'all' | 'free' | 'paid';

/** View-only prototype metrics: no ratings or learner counts are stored in the course catalog. */
const sampleMetrics: Record<string, { rating: string; reviews: number; learners: number }> = {
    'Project Management Foundations': { rating: '4.8', reviews: 124, learners: 386 },
    'Agile and Scrum Fundamentals': { rating: '4.7', reviews: 96, learners: 274 },
    'Stakeholder Management': { rating: '4.9', reviews: 82, learners: 196 },
    'Project Coordination Essentials': { rating: '4.7', reviews: 57, learners: 143 },
    'Scheduling for Project Coordinators': { rating: '4.8', reviews: 43, learners: 112 },
};

/** Match topic chips against the published course's real title, category and summary. */
function matchesTopic(course: DemoCourseData, topic: Topic): boolean {
    if (topic === 'All topics') return true;
    const haystack = `${course.title} ${course.category} ${course.summary}`;
    switch (topic) {
        case 'Agile & Scrum': return /agile|scrum|sprint|backlog/i.test(haystack);
        case 'Leadership & Communication': return /leadership|lead|communication|team/i.test(haystack);
        case 'Project Management': return /project|pmp|planning|scope|coordinat/i.test(haystack);
        case 'Risk Management': return /risk|uncertainty|contingency/i.test(haystack);
        case 'Stakeholder Management': return /stakeholder|sponsor|engagement/i.test(haystack);
    }
}

function CourseRow({ course }: { course: DemoCourseData }) {
    const metric = sampleMetrics[course.title];
    const free = course.accessTier === 'free';
    const duration = course.minutes > 0
        ? course.minutes >= 60 ? `${Number((course.minutes / 60).toFixed(1))} hours` : `${course.minutes} min`
        : null;

    return <article className="pm-learn-v3-course pm-course-row">
        <Link href={demoCourseHref(course.slug)} className="pm-learn-v3-course-image" aria-label={`View ${course.title}`}>
            <img src={course.coverUrl || `/images/learning/course-${course.thumbnail}.webp`} alt="" loading="lazy" decoding="async" />
        </Link>
        <div className="pm-learn-v3-course-body">
            <div className="pm-learn-v3-badges"><span className="pm-learn-v3-meta">{course.level}</span><span className={`pm-learn-v3-pill${free ? ' is-free' : ' is-paid'}`}>{free ? 'Free' : 'Paid'}</span></div>
            <h3><Link href={demoCourseHref(course.slug)}>{course.title}</Link></h3>
            <p>{course.summary}</p>
            <div className="pm-learn-v3-course-metrics"><span>{course.category}{duration ? ` · ${duration}` : ''}</span>
                {metric && <span className="pm-learn-v3-sample-rating" title="Illustrative sample ratings, not real course feedback"><span className="pm-learn-v3-star" aria-hidden="true">★</span> <strong>{metric.rating}/5</strong> ({metric.reviews} ratings) <span className="pm-learn-v3-metric-divider" aria-hidden="true">|</span> {metric.learners} active learners</span>}
            </div>
            <Link href={demoCourseHref(course.slug)} className="pm-guide-button is-outline pm-learn-v3-detail-link">View details</Link>
        </div>
    </article>;
}

const startingQuestions = [
    { prompt: 'How much project experience do you have?', choices: ['I am just starting out', 'I coordinate project work', 'I manage projects or teams'] },
    { prompt: 'Which subject would you most like to explore?', choices: ['Project Management', 'Agile & Scrum', 'Leadership & Communication', 'Risk Management', 'Stakeholder Management'] },
    { prompt: 'What is your learning goal?', choices: ['Build a strong foundation', 'Improve my everyday project skills', 'Develop my career further'] },
] as const;

/** A lightweight, three-question recommendation using only courses already loaded for the catalog. */
function StartingPoint({ courses }: { courses: DemoCourseData[] }) {
    const ref = useRef<HTMLDialogElement>(null);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [complete, setComplete] = useState(false);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    const recommendation = useMemo(() => {
        const experience = answers[0] ?? 0;
        const topic = startingQuestions[1].choices[answers[1] ?? 0] as Topic;
        const relevant = courses.filter(course => matchesTopic(course, topic));
        const pool = relevant.length ? relevant : courses;
        const level = experience === 0 ? /beginner|student/i : experience === 1 ? /coordinat|intermediate/i : /manager|advanced|senior/i;
        return pool.find(course => level.test(course.level)) ?? pool[0] ?? null;
    }, [answers, courses]);

    const reset = () => { setStep(0); setAnswers({}); setComplete(false); setOpen(true); };
    const close = () => setOpen(false);
    return <>
        <section className="pm-learn-v3-starting" aria-labelledby="pm-learn-start-title">
            <h2 id="pm-learn-start-title">Find Your Starting Point</h2>
            <p>Answer three questions about your experience and what you want to learn. Get one course recommendation from this catalog.</p>
            <button type="button" className="pm-guide-button" onClick={reset}>Find my starting point</button>
        </section>
        <dialog ref={ref} className="pm-learn-v3-dialog" aria-labelledby="pm-learn-v3-dialog-title" onClose={close} onCancel={close}>
            <div className="pm-learn-v3-dialog-header"><h2 id="pm-learn-v3-dialog-title">{complete ? 'Your starting point' : 'Find Your Starting Point'}</h2>
                <button type="button" className="pm-guide-button is-outline" onClick={close} aria-label="Close recommendation">Close</button></div>
            {complete ? <div className="pm-learn-v3-dialog-result" role="status">
                {recommendation ? <><p>Based on your answers, start with:</p><h3>{recommendation.title}</h3><p>{recommendation.summary}</p>
                    <Link href={demoCourseHref(recommendation.slug)} className="pm-guide-button" onClick={close}>View recommended course</Link></>
                    : <p>No published courses are available yet. Please check back later.</p>}
                <button type="button" className="pm-guide-button is-outline" onClick={reset}>Start again</button>
            </div> : <div className="pm-learn-v3-dialog-questions"><p className="pm-learn-v3-meta">Question {step + 1} of {startingQuestions.length}</p>
                <fieldset><legend>{startingQuestions[step].prompt}</legend>
                    {startingQuestions[step].choices.map((choice, index) => <label className="pm-learn-v3-question-option" key={choice}>
                        <input type="radio" name={`starting-question-${step}`} checked={answers[step] === index} onChange={() => setAnswers(previous => ({ ...previous, [step]: index }))} />{choice}
                    </label>)}
                </fieldset><div className="pm-learn-v3-dialog-actions">
                    <button type="button" className="pm-guide-button is-outline" disabled={step === 0} onClick={() => setStep(previous => previous - 1)}>Previous</button>
                    <button type="button" className="pm-guide-button" disabled={answers[step] === undefined} onClick={() => step === startingQuestions.length - 1 ? setComplete(true) : setStep(previous => previous + 1)}>{step === startingQuestions.length - 1 ? 'See recommendation' : 'Next'}</button>
                </div></div>}
        </dialog>
    </>;
}

export function PublicCourseCatalog({ courses }: { courses: DemoCourseData[] }) {
    const { rewardPromotion } = usePage<{ rewardPromotion?: RewardPromotionData | null }>().props;
    const [search, setSearch] = useState('');
    const [topic, setTopic] = useState<Topic>('All topics');
    const [level, setLevel] = useState('all');
    const [access, setAccess] = useState<Access>('all');
    const [sort, setSort] = useState('recommended');
    const [page, setPage] = useState(1);
    const levels = useMemo(() => [...new Set(courses.map(course => course.level))].filter(Boolean), [courses]);
    const changeTopic = (value: Topic) => { setTopic(value); setPage(1); };
    const clear = () => { setSearch(''); setTopic('All topics'); setLevel('all'); setAccess('all'); setSort('recommended'); setPage(1); };
    const filtered = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        const result = courses.filter(course => (!query || `${course.title} ${course.summary} ${course.category} ${course.level}`.toLocaleLowerCase().includes(query))
            && matchesTopic(course, topic) && (level === 'all' || course.level === level)
            && (access === 'all' || course.accessTier === access));
        if (sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title));
        if (sort === 'shortest') result.sort((a, b) => a.minutes - b.minutes);
        if (sort === 'longest') result.sort((a, b) => b.minutes - a.minutes);
        return result;
    }, [courses, search, topic, level, access, sort]);
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const shown = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return <PublicLayout siteLayout homePrototype guideLayout homeOfferLabel={rewardPromotion?.discountLabel}>
        <Head title="Learn & Practice | PM Circle"><meta name="description" content="Explore project management courses and find the right starting point for your goals." /></Head>
        <div className="pm-learn-v3">
            <section className="pm-learn-v3-banner" aria-labelledby="pm-learn-v3-heading"><div className="pm-learn-v3-wrap">
                <nav aria-label="Breadcrumb" className="pm-learn-v3-crumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Learn &amp; Practice</span></nav>
                <h1 id="pm-learn-v3-heading">Learn &amp; Practice</h1>
                <p>Find project management courses for your role, your goals, and the work you do.</p>
            </div></section>
            <div className="pm-learn-v3-wrap pm-learn-v3-main">
                <StartingPoint courses={courses}/>
                <nav className="pm-learn-v3-topics" aria-label="Filter by course topic">{topicLabels.map(label => <button type="button" key={label} aria-pressed={topic === label} className={`pm-learn-v3-chip${topic === label ? ' is-active' : ''}`} onClick={() => changeTopic(label)}>{label}</button>)}</nav>
                <div className="pm-learn-v3-content">
                    <MobileFilterPanel className="pm-learn-v3-sidebar" label="Filters" activeCount={Number(level !== 'all') + Number(topic !== 'All topics') + Number(access !== 'all')}><div className="pm-learn-v3-filter-heading"><h2>Filters</h2><button type="button" onClick={clear}>Clear all</button></div>
                        <label className="pm-guide-field-label" htmlFor="pm-learn-level">Career level</label>
                        <select id="pm-learn-level" className="pm-guide-control" value={level} onChange={event => { setLevel(event.target.value); setPage(1); }}><option value="all">All levels</option>{levels.map(value => <option key={value} value={value}>{value}</option>)}</select>
                        <label className="pm-guide-field-label" htmlFor="pm-learn-topic">Topic</label>
                        <select id="pm-learn-topic" className="pm-guide-control" value={topic} onChange={event => changeTopic(event.target.value as Topic)}>{topicLabels.map(value => <option key={value} value={value}>{value}</option>)}</select>
                        <fieldset className="pm-learn-v3-access"><legend>Access</legend>{([['all', 'All courses'], ['free', 'Free'], ['paid', 'Paid']] as const).map(([value, title]) => <label key={value}><input type="radio" name="course-access" value={value} checked={access === value} onChange={() => { setAccess(value); setPage(1); }}/>{title}</label>)}</fieldset>
                    </MobileFilterPanel>
                    <section className="pm-learn-v3-results" aria-label="Available learning courses">
                        <div className="pm-learn-v3-search-sort"><label className="pm-guide-field-label" htmlFor="pm-learn-search">Search courses
                            <input id="pm-learn-search" className="pm-guide-control" type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="e.g. Agile, risk or stakeholder" /></label>
                            <label className="pm-guide-field-label" htmlFor="pm-learn-sort">Sort by
                                <select id="pm-learn-sort" className="pm-guide-control" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="recommended">Recommended</option><option value="title">Title A–Z</option><option value="shortest">Shortest first</option><option value="longest">Longest first</option></select></label></div>
                        <p className="pm-learn-v3-result-count" role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'course' : 'courses'}</p>
                        <p className="pm-learn-v3-data-note">Ratings and active learner counts are sample data.</p>
                        {shown.length ? <div className="pm-learn-v3-rows">{shown.map(course => <CourseRow key={course.slug} course={course}/>)}</div>
                            : <div className="pm-learn-v3-empty"><h3>No matching courses</h3><p>Try changing your search or filters.</p><button className="pm-guide-button is-outline" type="button" onClick={clear}>Clear filters</button></div>}
                        <Pagination current={currentPage} last={pageCount} label="Course pages" onPageChange={setPage}/>
                    </section>
                </div>
            </div>
            <aside className="pm-learn-v3-course-note"><div className="pm-learn-v3-wrap"><h2>How we develop our courses</h2><p>PM Circle courses draw on decades of hands-on experience from project management professionals. Their judgment shapes what we teach, from the skills that matter on real projects to the decisions learners get to practise. We use AI to help turn that experience into clear explanations, realistic scenarios, and practical exercises. Our project management experts are responsible for the content and its quality.</p></div></aside>
        </div>
    </PublicLayout>;
}
