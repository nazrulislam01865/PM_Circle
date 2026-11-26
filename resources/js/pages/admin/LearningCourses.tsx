import { LinkedPagination } from '@/components/pm/Pagination';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BookOpen, CheckCircle2, Clock3, Eye, Pencil, Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AdminChoice } from '@/components/admin/AdminChoice';
import { AdminLayout } from '@/layouts/admin/AdminLayout';

type CourseRow = {
    id: number; slug: string; title: string; summary: string; category: string;
    level: string; minutes: number; accessTier: 'free' | 'paid';
    thumbnail: number; coverUrl: string | null; isPublished: boolean; updatedAt: string;
};
type Pagination = {
    data: CourseRow[]; total: number; from: number | null; to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
};
type Props = {
    courses: Pagination;
    filters: { search: string; status: string };
    stats: { total: number; published: number };
};

export default function LearningCourses({ courses, filters, stats }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [changing, setChanging] = useState<number | null>(null);
    const { flash } = usePage<{ flash?: { status?: string } }>().props;
    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get('/admin/learning/courses', { search, status }, { preserveScroll: true, preserveState: true });
    };
    const toggle = (course: CourseRow) => {
        if (changing !== null) return;
        setChanging(course.id);
        router.patch(`/admin/learning/courses/${course.id}/publish`, {}, {
            preserveScroll: true,
            onFinish: () => setChanging(null),
        });
    };

    return <AdminLayout active="/admin/learning/courses" title="Course library" subtitle="Create and manage the courses shown in Learn & Practice.">
        <Head title="Course library | PM Circle Admin" />
        {flash?.status && <p className="pm-admin-notice pm-admin-notice-success" role="status"><CheckCircle2 size={17}/>{flash.status}</p>}
        <section className="pm-course-admin-summary" aria-label="Course overview">
            <div className="pm-admin-panel pm-course-admin-stat"><span>Total courses</span><strong>{stats.total}</strong></div>
            <div className="pm-admin-panel pm-course-admin-stat"><span>Published</span><strong>{stats.published}</strong></div>
            <div className="pm-admin-panel pm-course-admin-stat"><span>Drafts</span><strong>{stats.total - stats.published}</strong></div>
        </section>
        <section className="pm-admin-panel pm-course-admin-panel" aria-labelledby="course-bank-title">
            <div className="pm-course-admin-heading">
                <div><h2 id="course-bank-title">All courses</h2><p>Published courses appear in the member library. Drafts remain private.</p></div>
                <div className="pm-course-admin-row-actions"><Link className="pm-admin-button" href="/admin/learning/courses/catalog-settings">Browse Courses settings</Link><Link className="pm-admin-button pm-admin-button-primary" href="/admin/learning/courses/create"><Plus size={17}/> Add course</Link></div>
            </div>
            <form className="pm-course-admin-filters" onSubmit={applyFilters} role="search">
                <label className="pm-admin-field"><span>Search courses</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Title, category or course link"/></label>
                <AdminChoice id="course-library-publication" label="Publication" value={status} options={[{value:'all',label:'All courses'},{value:'published',label:'Published'},{value:'draft',label:'Drafts'}]} onChange={setStatus}/>
                <button type="submit" className="pm-admin-button pm-admin-button-quiet"><Search size={17}/> Filter</button>
                <button type="button" className="pm-admin-button" onClick={() => { setSearch(''); setStatus('all'); router.get('/admin/learning/courses'); }}>Clear</button>
            </form>
            <div className="pm-course-admin-table-scroll">
                <table className="pm-course-admin-table">
                    <thead><tr><th scope="col">Course</th><th scope="col">Category / Level</th><th scope="col">Duration</th><th scope="col">Access</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
                    <tbody>{courses.data.map(course => <tr key={course.id}>
                        <td><div className="pm-course-admin-table-course">
                            <img src={course.coverUrl || `/images/learning/course-${course.thumbnail}.webp`} alt="" loading="lazy" decoding="async"/>
                            <div><strong>{course.title}</strong><small>{course.slug}</small></div>
                        </div></td>
                        <td><span>{course.category}</span><small>{course.level}</small></td>
                        <td><span className="pm-course-admin-duration"><Clock3 size={15}/>{course.minutes >= 60 ? `${Math.round(course.minutes / 6) / 10} h` : `${course.minutes} min`}</span></td>
                        <td>{course.accessTier === 'free' ? 'Free' : 'Plus & Pro'}</td>
                        <td><span className={`pm-course-admin-status ${course.isPublished ? 'is-published' : ''}`}>{course.isPublished ? 'Published' : 'Draft'}</span></td>
                        <td><div className="pm-course-admin-row-actions">
                            <Link title={`Edit ${course.title}`} aria-label={`Edit ${course.title}`} className="pm-admin-button" href={`/admin/learning/courses/${course.id}/edit`}><Pencil size={15}/> Edit</Link>
                            <Link className="pm-admin-button" href={`/admin/learning/courses/${course.id}/content`}>Questions & resources</Link>
                            <Link className="pm-admin-button" href={`/admin/learning/courses/${course.id}/reviews`}>Reviews</Link>
                            {course.isPublished && <Link title="View course" aria-label={`View ${course.title}`} className="pm-course-admin-icon-button" href={`/learning/courses/${encodeURIComponent(course.slug)}`}><Eye size={17}/></Link>}
                            <button type="button" className="pm-course-admin-toggle" onClick={() => toggle(course)} disabled={changing !== null} aria-label={`${course.isPublished ? 'Unpublish' : 'Publish'} ${course.title}`}>
                                {changing === course.id ? 'Updating…' : course.isPublished ? 'Unpublish' : 'Publish'}
                            </button>
                        </div></td>
                    </tr>)}</tbody>
                </table>
                {courses.data.length === 0 && <p className="pm-course-admin-empty"><BookOpen size={22}/> No courses match your filters.</p>}
            </div>
            <div className="pm-course-admin-pagination">
                <span>{courses.total === 0 ? 'No courses' : `Showing ${courses.from}–${courses.to} of ${courses.total} courses`}</span>
                <LinkedPagination links={courses.links} label="Course table pages"/>
            </div>
        </section>
    </AdminLayout>;
}
