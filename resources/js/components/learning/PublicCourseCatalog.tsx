import { CourseSavedMarker } from './CourseSavedMarker';
import type { CatalogSettings } from '@/components/learning/catalogSettings';
import { AdminChoice } from '@/components/admin/AdminChoice';
import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Pagination } from '@/components/pm/Pagination';
import { MobileFilterPanel } from '@/components/pm/MobileFilterPanel';
import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { DemoCourseData } from '@/types/learning';
import { demoCourseHref } from '@/types/learning';
import type { RewardPromotionData } from '@/types/reward';

const PAGE_SIZE = 4;
type Topic = string;
type Access = 'all' | 'free' | 'paid';
const categories = (courses: DemoCourseData[]) => [...new Set(courses.map(course => course.category).filter(Boolean))].sort((a,b) => a.localeCompare(b));
function matchesTopic(course: DemoCourseData, topic: Topic): boolean {
    return topic === 'All topics' || course.category === topic;
}

export function CatalogCourseTile({ course, href, buttonLabel, onRemove, busy }: { course: DemoCourseData; href: string; buttonLabel: string; onRemove?: () => void; busy?: boolean }) {
    const free = course.accessTier === 'free';
    const duration = course.minutes > 0
        ? course.minutes >= 60 ? `${Number((course.minutes / 60).toFixed(1))} ${course.minutes === 60 ? 'hr' : 'hrs'}` : `${course.minutes} min`
        : null;

    const fallback = `/images/learning/course-${course.thumbnail}.webp`;
    return <article className="pm-learn-v3-course pm-learn-v3-catalog-card">
        {course.saved && <CourseSavedMarker title={course.title} onRemove={onRemove} busy={busy} />}
        <Link href={href} className="pm-learn-v3-course-image" aria-label={`View ${course.title}`}>
            <img key={course.coverUrl || fallback} src={course.coverUrl || fallback} alt="" loading="lazy" decoding="async" onError={event => { const image = event.currentTarget; if (image.getAttribute('src') !== fallback) image.src = fallback; else image.style.visibility = 'hidden'; }} />
        </Link>
        <div className="pm-learn-v3-course-body">
            <div className="pm-learn-v3-badges"><span className="pm-learn-v3-meta">{course.level}</span><span className={`pm-learn-v3-pill${free ? ' is-free' : ' is-paid'}`}>{free ? 'Free' : 'Paid'}</span></div>
            <h3><Link href={href}>{course.title}</Link></h3>
            <p>{course.summary}</p>
            <div className="pm-learn-v3-course-metrics"><span>{course.category}{duration ? ` · ${duration}` : ''}</span>
                <div className="pm-learn-v3-course-social">
                    {course.rating != null && !!course.reviewCount
                        ? <span aria-label={`${course.rating.toFixed(1)} out of 5, ${course.reviewCount} ${course.reviewCount === 1 ? 'review' : 'reviews'}`}><span className="pm-learn-v3-star" aria-hidden="true">★</span> <strong>{course.rating.toFixed(1)}</strong></span>
                        : <span>No reviews yet</span>}
                    {course.learnerCount != null && <span> · {course.learnerCount.toLocaleString('en-US')} {course.learnerCount === 1 ? 'learner' : 'learners'}</span>}
                </div>
            </div>
            <Link href={href} className="pm-guide-button is-outline pm-learn-v3-detail-link">{buttonLabel}</Link>
        </div>
    </article>;
}

/** A lightweight, three-question recommendation using only courses already loaded for the catalog. */
function StartingPoint({ courses, courseHref, settings }: { courses: DemoCourseData[]; courseHref: (slug: string) => string; settings: CatalogSettings }) {
    const startingQuestions = useMemo(() => [
        { prompt: 'How much project experience do you have?', choices: ['I am just starting out', 'I coordinate project work', 'I manage projects or teams'] },
        { prompt: 'Which subject would you most like to explore?', choices: categories(courses).length ? categories(courses) : ['All topics'] },
        { prompt: 'What is your learning goal?', choices: ['Build a strong foundation', 'Improve my everyday project skills', 'Develop my career further'] },
    ], [courses]);
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
        const topic = startingQuestions[1].choices[answers[1] ?? 0] ?? 'All topics';
        const relevant = courses.filter(course => matchesTopic(course, topic));
        const pool = relevant.length ? relevant : courses;
        const level = experience === 0 ? /beginner|student/i : experience === 1 ? /coordinat|intermediate/i : /manager|advanced|senior/i;
        const matched = pool.filter(course => level.test(course.level));
        const ranked = [...(matched.length ? matched : pool)];
        if (answers[2] === 0) ranked.sort((a,b) => Number(!/beginner/i.test(a.level)) - Number(!/beginner/i.test(b.level)));
        if (answers[2] === 1) ranked.sort((a,b) => a.minutes - b.minutes);
        if (answers[2] === 2) ranked.sort((a,b) => Number(!/advanced|manager|senior/i.test(a.level)) - Number(!/advanced|manager|senior/i.test(b.level)));
        return ranked[0] ?? null;
    }, [answers, courses, startingQuestions]);

    const reset = () => { setStep(0); setAnswers({}); setComplete(false); setOpen(true); };
    const close = () => setOpen(false);
    return <>
        <section className="pm-learn-v3-starting" aria-labelledby="pm-learn-start-title">
            <div className="pm-learn-v3-start-copy"><h2 id="pm-learn-start-title">{settings.starting_title}</h2>
            <p>{settings.starting_description}</p></div>
            <button type="button" className="pm-guide-button" onClick={reset}>{settings.starting_button}</button>
        </section>
        <dialog ref={ref} className="pm-learn-v3-dialog" aria-labelledby="pm-learn-v3-dialog-title" onClose={close} onCancel={close}>
            <div className="pm-learn-v3-dialog-header"><h2 id="pm-learn-v3-dialog-title">{complete ? 'Your starting point' : settings.starting_title}</h2>
                <button type="button" className="pm-guide-button is-outline" onClick={close} aria-label="Close recommendation">Close</button></div>
            {complete ? <div className="pm-learn-v3-dialog-result" role="status">
                {recommendation ? <><p>Based on your answers, start with:</p><h3>{recommendation.title}</h3><p>{recommendation.summary}</p>
                    <Link href={courseHref(recommendation.slug)} className="pm-guide-button" onClick={close}>View recommended course</Link></>
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

/** Shared Browse courses content; PublicLayout selects the existing guest/member shell. */
export function PublicCourseCatalog({ courses, memberView = false, settings }: { courses: DemoCourseData[]; memberView?: boolean; settings: CatalogSettings }) {
    const pageUrl = usePage().url;
    const courseHref = (slug: string) => memberView ? `/dashboard/learning/courses/${encodeURIComponent(slug)}` : demoCourseHref(slug);
    const { rewardPromotion, auth } = usePage<{ rewardPromotion?: RewardPromotionData | null; auth?: {user?: {settings?: {learning_interest?: string}} | null} }>().props;
    const interest = auth?.user?.settings?.learning_interest;
    const [search, setSearch] = useState(() => new URLSearchParams(pageUrl.split('?')[1] || '').get('search') || '');
    const [topic, setTopic] = useState<Topic>('All topics');
    const [level, setLevel] = useState('all');
    const [access, setAccess] = useState<Access>('all');
    const [sort, setSort] = useState('recommended');
    const [page, setPage] = useState(1);
    const topicLabels = useMemo(() => ['All topics', ...categories(courses).filter(category => category !== 'All topics')], [courses]);
    const levels = useMemo(() => [...new Set(courses.map(course => course.level))].filter(Boolean), [courses]);
    const changeTopic = (value: Topic) => { setTopic(value); setPage(1); };
    const clear = () => { setSearch(''); setTopic('All topics'); setLevel('all'); setAccess('all'); setSort('recommended'); setPage(1); };
    const filtered = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        const result = courses.filter(course => (!query || `${course.title} ${course.summary} ${course.category} ${course.level}`.toLocaleLowerCase().includes(query))
            && matchesTopic(course, topic) && (level === 'all' || course.level === level)
            && (access === 'all' || course.accessTier === access));
        if (sort === 'recommended' && interest) {
            const matches = (course: DemoCourseData) => course.category.toLowerCase() === interest.toLowerCase();
            result.sort((a, b) => Number(matches(b)) - Number(matches(a)));
        }
        if (sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title));
        if (sort === 'shortest') result.sort((a, b) => a.minutes - b.minutes);
        if (sort === 'longest') result.sort((a, b) => b.minutes - a.minutes);
        return result;
    }, [courses, search, topic, level, access, sort, interest]);
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const shown = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return <PublicLayout siteLayout homePrototype guideLayout homeOfferLabel={rewardPromotion?.discountLabel} memberBanner banner={{title: settings.title, currentLabel: 'Browse courses', parents: [{label: 'Learn & Practice', href: memberView ? '/dashboard/learning' : '/learning'}], description: settings.description, titleId: 'pm-learn-v3-heading'}}>
        <Head title={`${settings.title} | PM Circle`}><meta name="description" content={settings.description} /></Head>
        <div className="pm-learn-v3">
            <LegacyPageHeading><section className="pm-learn-v3-banner" aria-labelledby="pm-learn-v3-heading"><div className="pm-learn-v3-wrap">
                <nav aria-label="Breadcrumb" className="pm-learn-v3-crumb"><Link href={memberView ? '/dashboard' : '/'}>Home</Link><span aria-hidden="true">/</span><span>Learn &amp; Practice</span><span aria-hidden="true">/</span><span aria-current="page">Browse courses</span></nav>
                <h1 id="pm-learn-v3-heading">{settings.title}</h1>
                <p>{settings.description}</p>
            </div></section></LegacyPageHeading>
            <div className="pm-learn-v3-wrap pm-learn-v3-main">
                {settings.starting_enabled && <StartingPoint courses={courses} courseHref={courseHref} settings={settings}/>}
                {settings.topics_enabled && <nav className="pm-learn-v3-topics" aria-label="Filter by course topic">{topicLabels.map(label => <button type="button" key={label} aria-pressed={topic === label} className={`pm-learn-v3-chip${topic === label ? ' is-active' : ''}`} onClick={() => changeTopic(label)}>{label}</button>)}</nav>}
                <div className="pm-learn-v3-content">
                    <MobileFilterPanel className="pm-learn-v3-sidebar" label="Filters" activeCount={Number(level !== 'all') + Number(topic !== 'All topics') + Number(access !== 'all') + Number(!!search.trim()) + Number(sort !== 'recommended')}>
                        <AdminChoice id="pm-learn-level" label="Career level" value={level} options={[{value: 'all', label: 'All levels'}, ...levels.map(value => ({value, label: value}))]} onChange={value => { setLevel(value); setPage(1); }} />
                        <AdminChoice id="pm-learn-topic" label="Topic" value={topic} options={topicLabels.map(value => ({value, label: value}))} onChange={value => changeTopic(value as Topic)} />
                        <AdminChoice id="pm-learn-access" label="Access" value={access} options={[{value: 'all', label: 'All courses'}, {value: 'free', label: 'Free'}, {value: 'paid', label: 'Paid'}]} onChange={value => { setAccess(value as Access); setPage(1); }} />
                        <label className="pm-guide-field-label" htmlFor="pm-learn-search">Search courses
                            <input id="pm-learn-search" className="pm-guide-control" type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder={settings.search_placeholder} /></label>
                        <AdminChoice id="pm-learn-sort" label="Sort by" value={sort} options={[{value: 'recommended', label: 'Recommended'}, {value: 'title', label: 'Title A–Z'}, {value: 'shortest', label: 'Shortest first'}, {value: 'longest', label: 'Longest first'}]} onChange={value => { setSort(value); setPage(1); }} />
                        <button className="pm-learn-v3-clear" type="button" onClick={clear}>Clear all</button>
                    </MobileFilterPanel>
                    <section className="pm-learn-v3-results" aria-label="Available learning courses">
                        {shown.length ? <div className="pm-learn-v3-rows">{shown.map(course => <CatalogCourseTile key={course.slug} course={course} href={courseHref(course.slug)} buttonLabel={settings.detail_button}/>)}</div>
                            : <div className="pm-learn-v3-empty"><h3>{settings.empty_title}</h3><p>{settings.empty_description}</p><button className="pm-guide-button is-outline" type="button" onClick={clear}>Clear filters</button></div>}
                        <Pagination current={currentPage} last={pageCount} label="Course pages" onPageChange={setPage}/>
                    </section>
                </div>

            </div>
        </div>
    </PublicLayout>;
}
