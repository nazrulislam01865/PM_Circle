import { Head, router, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronLeft, ChevronRight, GraduationCap, Grid2X2, Layers3, List, Search, SlidersHorizontal, Target, Trophy } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { CourseCard, type CatalogCard } from '@/components/learning/CourseCard';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { DemoCourseData, LearningCourseCardData, LearningPathCardData, LearningShell } from '@/types/learning';
import { demoCourseHref, learningActivityHref, learningPathHref } from '@/types/learning';

type CatalogProps = {
    shell: LearningShell | null;
    paths: LearningPathCardData[];
    courses: DemoCourseData[];
    practiceModules: LearningCourseCardData[];
    isMember: boolean;
    memberTier: 'free' | 'plus' | 'pro';
};
type CatalogTab = 'courses' | 'paths' | 'practice' | 'exams';
type DisplayMode = 'grid' | 'list';
type FilterKey = 'categories' | 'levels' | 'durations';

const categories = ['Project Management', 'Agile & Scrum', 'PMP Certification', 'Planning & Scheduling', 'Stakeholder & Communication', 'Risk & Change', 'Leadership & Strategy'];
const levels = ['Beginner', 'Intermediate', 'Advanced'];
const durations = ['Up to 2 hours', '2–10 hours', '10+ hours'];
const perPage = 12;

function learningLevel(level: string): CatalogCard['level'] {
    if (level === 'Student & Beginner') return 'Beginner';
    if (level === 'Project Coordinator' || level === 'Project Manager') return 'Intermediate';
    return 'Advanced';
}

function categoryFor(title: string): string {
    if (/risk|change|dependency|dependencies|control|escalation/i.test(title)) return 'Risk & Change';
    if (/stakeholder|communicat|team|people|align|status/i.test(title)) return 'Stakeholder & Communication';
    if (/plan|schedule|task|budget|resource|track|organis|coordinat/i.test(title)) return 'Planning & Scheduling';
    if (/lead|strateg|governance|investment|portfolio|benefit|executive/i.test(title)) return 'Leadership & Strategy';
    return 'Project Management';
}

function durationFor(minutes: number): string {
    return minutes <= 120 ? durations[0] : minutes <= 600 ? durations[1] : durations[2];
}

function FilterSection({ title, expanded, onToggle, children }: { title: string; expanded: boolean; onToggle: () => void; children: ReactNode }) {
    return <section className="pm-catalog-filter-section">
        <button type="button" className="pm-catalog-filter-title" aria-expanded={expanded} onClick={onToggle}>{title}<ChevronDown size={16} className={expanded ? 'is-open' : ''} aria-hidden="true" /></button>
        {expanded && <div className="pm-catalog-filter-options">{children}</div>}
    </section>;
}

export default function Catalog({ shell, paths, courses, practiceModules, isMember, memberTier }: CatalogProps) {
    const pageUrl = usePage().url;
    const memberView = pageUrl.split('?')[0] === '/dashboard/learning';
    const catalogRoot = memberView ? '/dashboard/learning' : '/learning';
    const query = new URLSearchParams(pageUrl.split('?')[1] || '');
    const initialTab = query.get('tab');
    const [tab, setTab] = useState<CatalogTab>(initialTab === 'paths' || initialTab === 'my-learning' ? 'paths' : initialTab === 'practice' ? 'practice' : initialTab === 'exams' ? 'exams' : 'courses');
    const [search, setSearch] = useState(query.get('search') || '');
    const [sort, setSort] = useState('recommended');
    const [display, setDisplay] = useState<DisplayMode>('grid');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Record<FilterKey, string[]>>({ categories: [], levels: [], durations: [] });
    const [expanded, setExpanded] = useState<Record<FilterKey, boolean>>({ categories: true, levels: true, durations: true });
    const [saved, setSaved] = useState<string[]>(() => [
        ...paths.filter(path => path.saved).map(path => `path:${path.slug}`),
        ...courses.filter(course => course.saved).map(course => `course:${course.slug}`),
    ]);
    const [saving, setSaving] = useState<string | null>(null);
    const [enrolling, setEnrolling] = useState<string | null>(null);

    const courseItems = useMemo<CatalogCard[]>(() => courses.map(course => ({
        id: `course-${course.slug}`, slug: course.slug, title: course.title, description: course.summary,
        category: course.category, level: course.level, minutes: course.minutes,
        thumbnail: course.thumbnail, accessTier: course.accessTier, progress: 0,
        enrolled: course.enrolled, saveType: 'course',
        href: memberView ? `${catalogRoot}/courses/${encodeURIComponent(course.slug)}` : demoCourseHref(course.slug), action: course.enrolled && (course.accessTier === 'free' || memberTier !== 'free') ? 'Continue course' : course.enrolled ? 'Upgrade to continue' : 'View course',
    })), [courses, memberTier, memberView, catalogRoot]);
    const pathItems = useMemo<CatalogCard[]>(() => paths.map((path, index) => ({
        id: `path-${path.slug}`, slug: path.slug, title: path.title, description: path.summary,
        category: categoryFor(path.title), level: learningLevel(path.level), minutes: path.minutes,
        thumbnail: (index + 5) % 8 + 1, accessTier: path.accessTier, progress: path.progress,
        href: learningPathHref(path.slug), action: path.progress > 0 ? 'Continue path' : 'Explore path', saveType: 'path',
    })), [paths]);
    const practiceItems = useMemo<CatalogCard[]>(() => practiceModules.filter(course => course.mcqPosition !== null).map((course, index) => ({
        id: `practice-${course.id}`, slug: course.slug, title: `${course.title} · MCQ practice`,
        description: `Practice questions from ${course.pathTitle}.`, category: categoryFor(course.title),
        level: learningLevel(course.level), minutes: course.mcqMinutes ?? 0,
        thumbnail: (index + 4) % 8 + 1, accessTier: course.accessTier, progress: course.mcqCompleted ? 100 : 0,
        href: learningActivityHref(course.slug, course.modulePosition, course.mcqPosition!), action: course.mcqCompleted ? 'Review practice' : 'Start practice',
    })), [practiceModules]);
    // PMP now has a real sample practice workflow; Scrum remains a planned module.
    const examItems = useMemo<CatalogCard[]>(() => ([
        { id: 'pmp-simulator', title: 'PMP Exam Simulator', description: 'Timed PMP-style sample questions, answer tools and scored reviews for Plus and Pro.', category: 'Project Management', level: 'Advanced', minutes: 11, thumbnail: 6, accessTier: 'plus', progress: 0, href: '/exams/pmp', action: 'Open simulator', available: true },
        { id: 'scrum-simulator', title: 'Scrum / CSM Simulator', description: 'Exam simulator content is not yet available.', category: 'Project Management', level: 'Intermediate', minutes: 0, thumbnail: 2, accessTier: 'plus', progress: 0, href: '/dashboard/features/scrum', action: 'View status', available: false },
    ] as CatalogCard[]), []);

    const allItems = tab === 'paths' ? pathItems : tab === 'practice' ? practiceItems : tab === 'exams' ? examItems : courseItems;
    const filtered = useMemo(() => {
        const text = search.trim().toLowerCase();
        return allItems.filter(item =>
            (!text || `${item.title} ${item.description} ${item.category} ${item.level}`.toLowerCase().includes(text)) &&
            (!selected.categories.length || selected.categories.includes(item.category)) &&
            (!selected.levels.length || selected.levels.includes(item.level)) &&
            (!selected.durations.length || (item.minutes > 0 && selected.durations.includes(durationFor(item.minutes))))
        ).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title)
            : sort === 'shortest' ? a.minutes - b.minutes : sort === 'longest' ? b.minutes - a.minutes : 0);
    }, [allItems, search, sort, selected]);
    const pageCount = Math.ceil(filtered.length / perPage);
    const activePage = Math.min(page, Math.max(1, pageCount));
    const shown = filtered.slice((activePage - 1) * perPage, activePage * perPage);

    const chooseTab = (next: CatalogTab) => { setTab(next); setPage(1); setSelected({ categories: [], levels: [], durations: [] }); };
    const choose = (key: FilterKey, value: string) => {
        setSelected(previous => ({ ...previous, [key]: previous[key].includes(value) ? previous[key].filter(option => option !== value) : [...previous[key], value] }));
        setPage(1);
    };
    const clear = () => { setSelected({ categories: [], levels: [], durations: [] }); setSearch(''); setSort('recommended'); setPage(1); };
    const toggleSave = (item: CatalogCard) => {
        if (saving || !item.slug || !isMember) return;
        const key = `${item.saveType === 'course' ? 'course' : 'path'}:${item.slug}`;
        setSaving(key);
        const isSaved = saved.includes(key);
        const endpoint = item.saveType === 'course' ? demoCourseHref(item.slug) : learningPathHref(item.slug);
        router.visit(`${endpoint}/save`, {
            method: isSaved ? 'delete' : 'post', preserveScroll: true, preserveState: true,
            onSuccess: () => setSaved(previous => isSaved ? previous.filter(value => value !== key) : [...previous, key]),
            onFinish: () => setSaving(null),
        });
    };
    const enrollDemoCourse = (item: CatalogCard) => {
        if (!item.slug || enrolling || !isMember) return;
        setEnrolling(item.slug);
        router.post(`${memberView ? catalogRoot : '/learning'}/courses/${encodeURIComponent(item.slug)}/enroll`, {}, {
            onFinish: () => setEnrolling(null),
        });
    };
    const renderOptions = (key: FilterKey, options: string[]) => options.map(option => {
        const count = allItems.filter(item => (key !== 'durations' || item.minutes > 0) && (key === 'categories' ? item.category : key === 'levels' ? item.level : durationFor(item.minutes)) === option).length;
        return <label className="pm-catalog-filter-choice" key={option}>
            <input type="checkbox" checked={selected[key].includes(option)} onChange={() => choose(key, option)} />
            <span>{option}</span><small>({count})</small>
        </label>;
    });

    const pageContent = <><Head title="Learn & Practice" />
        <div className="pm-course-catalog">
            <section className="pm-catalog-hero" aria-labelledby="learning-catalog-heading">
                <h1 id="learning-catalog-heading">Learn &amp; Practice</h1>
                <p>Project management courses, practice, and learning paths to grow your skills and career.</p>
            </section>
            <nav className="pm-catalog-tabs" aria-label="Learning catalog sections">
                {([
                    ['courses', Layers3, 'All Courses', courseItems.length],
                    ['paths', GraduationCap, 'Learning Paths', pathItems.length],
                    ['practice', Target, 'Practice & Quiz', practiceItems.length],
                    ['exams', Trophy, 'Exam Simulators', examItems.length],
                ] as const).map(([key, Icon, title, count]) => <button type="button" key={key} className={tab === key ? 'is-active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => chooseTab(key)}><Icon size={21} strokeWidth={1.8} aria-hidden="true" />{title} <span>({count})</span></button>)}
            </nav>
            <div className="pm-catalog-layout">
                <aside className="pm-catalog-sidebar" aria-label="Filter learning content">
                    <div className="pm-catalog-sidebar-heading"><h2>Filter {tab === 'paths' ? 'Paths' : tab === 'exams' ? 'Simulators' : 'Courses'}</h2><button type="button" onClick={clear}>Clear All</button></div>
                    <FilterSection title="Category" expanded={expanded.categories} onToggle={() => setExpanded(prev => ({ ...prev, categories: !prev.categories }))}>
                        {renderOptions('categories', categories)}
                    </FilterSection>
                    <FilterSection title="Level" expanded={expanded.levels} onToggle={() => setExpanded(prev => ({ ...prev, levels: !prev.levels }))}>
                        {renderOptions('levels', levels)}
                    </FilterSection>
                    <FilterSection title="Duration" expanded={expanded.durations} onToggle={() => setExpanded(prev => ({ ...prev, durations: !prev.durations }))}>
                        {renderOptions('durations', durations)}
                    </FilterSection>
                </aside>
                <section className="pm-catalog-results" aria-label="Learning results">
                    <div className="pm-catalog-toolbar">
                        <label className="pm-catalog-search"><Search size={19} aria-hidden="true"/><span className="sr-only">Search learning content</span><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search courses (e.g., project, risk, stakeholder...)" /></label>
                        <div className="pm-catalog-toolbar-end">
                            <label className="pm-catalog-sort"><span className="sr-only">Sort learning content</span><select value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="recommended">Sort: Recommended</option><option value="title">Title A–Z</option><option value="shortest">Duration: Shortest</option><option value="longest">Duration: Longest</option></select><ChevronDown size={16} aria-hidden="true" /></label>
                            <div className="pm-catalog-view-switch" role="group" aria-label="Display mode"><button type="button" title="Grid view" aria-label="Grid view" aria-pressed={display === 'grid'} className={display === 'grid' ? 'is-active' : ''} onClick={() => setDisplay('grid')}><Grid2X2 size={19}/></button><button type="button" title="List view" aria-label="List view" aria-pressed={display === 'list'} className={display === 'list' ? 'is-active' : ''} onClick={() => setDisplay('list')}><List size={20}/></button></div>
                        </div>
                    </div>
                    <div className="pm-catalog-count" role="status">{filtered.length ? `Showing ${(activePage - 1) * perPage + 1}–${Math.min(activePage * perPage, filtered.length)} of ${filtered.length}` : 'Showing 0'} {tab === 'paths' ? 'learning paths' : tab === 'practice' ? 'practice sessions' : tab === 'exams' ? 'simulators' : 'courses'}</div>
                    {shown.length ? <div className={`pm-catalog-course-grid${display === 'list' ? ' is-list' : ''}`}>
                        {shown.map(item => <CourseCard key={item.id} course={item} listView={display === 'list'} saved={!!item.slug && saved.includes(`${item.saveType === 'course' ? 'course' : 'path'}:${item.slug}`)} saving={saving === `${item.saveType === 'course' ? 'course' : 'path'}:${item.slug}`} onToggleSave={isMember ? toggleSave : undefined} onEnroll={item.saveType === 'course' && isMember && (item.accessTier === 'free' || memberTier !== 'free') ? enrollDemoCourse : undefined} enrolling={enrolling === item.slug} />)}
                    </div> : <div className="pm-catalog-empty"><SlidersHorizontal size={28} aria-hidden="true" /><h2>No matching learning content</h2><p>Try adjusting your search or filters.</p><button type="button" className="pm-catalog-course-action" onClick={clear}>Clear filters</button></div>}
                    {pageCount > 1 && <nav className="pm-catalog-pagination" aria-label="Learning results pagination"><button type="button" aria-label="Previous page" disabled={activePage === 1} onClick={() => setPage(activePage - 1)}><ChevronLeft size={18}/></button>{Array.from({ length: pageCount }, (_, i) => <button key={i + 1} type="button" aria-current={i + 1 === activePage ? 'page' : undefined} className={i + 1 === activePage ? 'is-active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>)}<button type="button" aria-label="Next page" disabled={activePage === pageCount} onClick={() => setPage(activePage + 1)}><ChevronRight size={18}/></button></nav>}
                </section>
            </div>
        </div>
    </>;
    return <PublicLayout siteLayout={!memberView} active="/learning">
        <div className="pm-learning-catalog-public pm-learn-content">{pageContent}</div>
    </PublicLayout>;
}
