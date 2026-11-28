import { Head, Link, router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { CatalogCourseTile } from '@/components/learning/PublicCourseCatalog';
import { courseActionError } from '@/components/learning/CourseDetail';
import { AdjacentPagination } from '@/components/pm/Pagination';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { demoCourseHref, type DemoCourseData } from '@/types/learning';

type SavedCoursesPage = { data: DemoCourseData[]; prev_page_url: string | null; next_page_url: string | null; current_page: number };

export default function SavedCourses({ courses }: { courses: SavedCoursesPage }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const lock = useRef(false);
    const remove = (course: DemoCourseData) => {
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        setError('');
        router.delete(`${demoCourseHref(course.slug)}/save`, {
            preserveScroll: true,
            onError: () => setError('Unable to remove the saved course. Please try again.'),
            onHttpException: response => { setError(courseActionError(response.status)); return false; },
            onNetworkError: () => { setError('Connection failed. Check your connection and try again.'); return false; },
            onFinish: () => { lock.current = false; setBusy(false); },
        });
    };
    return <PublicLayout siteLayout guideLayout memberBanner banner={{ title: 'Saved courses', description: 'Courses you bookmarked to revisit later.' }}>
        <Head title="Saved courses" />
        <div className="pm-learn-v3 pm-saved-courses"><div className="pm-learn-v3-wrap pm-learn-v3-main">
            <p className="pm-saved-courses-privacy">Saved courses are visible only to you.</p>
            {error && <p role="alert" className="pm-validation-error">{error}</p>}
            {courses.data.length ? <div className="pm-learn-v3-rows">{courses.data.map(course => <CatalogCourseTile key={course.slug} course={course} href={demoCourseHref(course.slug)} buttonLabel="View details" onRemove={() => remove(course)} busy={busy} />)}</div> : <div className="pm-learn-v3-empty"><h3>{courses.prev_page_url ? 'No saved courses on this page' : 'No saved courses yet'}</h3><p>Save a course from its details page to find it here.</p><Link href="/learning" className="pm-guide-button">Browse courses</Link></div>}
            <AdjacentPagination previous={courses.prev_page_url} next={courses.next_page_url} label="Saved course pages" current={courses.current_page} />
        </div></div>
    </PublicLayout>;
}
