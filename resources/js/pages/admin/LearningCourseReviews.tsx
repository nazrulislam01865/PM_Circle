import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LinkedPagination } from '@/components/pm/Pagination';

type Review = { id: number; rating: number; body: string; is_published: boolean; revision: string };
type Props = { course: { id: number; title: string; slug: string }; reviews: { data: Review[]; links: {url: string | null; label: string; active: boolean}[] } };
export default function LearningCourseReviews({course, reviews}: Props) {
    const [busy, setBusy] = useState<number | null>(null);
    const [error, setError] = useState('');
    const {flash} = usePage<{flash?: {status?: string}}>().props;
    const base = `/admin/learning/courses/${course.id}`;
    const moderate = (review: Review) => {
        if (busy !== null) return;
        setBusy(review.id); setError('');
        router.patch(`${base}/reviews/${review.id}`, {is_published: !review.is_published, revision: review.revision}, {preserveScroll: true, onError: errors => setError(errors.review || 'Could not update review.'), onFinish: () => setBusy(null)});
    };
    return <AdminLayout active="/admin/learning/courses" title="Course reviews" subtitle={course.title}>
        <Head title={`Course reviews | ${course.title}`}/>
        <div className="pm-course-admin-heading"><Link className="pm-admin-button" href="/admin/learning/courses">Course library</Link><Link className="pm-admin-button" href={`${base}/edit`}>Edit course</Link><Link className="pm-admin-button" href={`${base}/content`}>Questions & resources</Link></div>
        {flash?.status && <p role="status" className="pm-admin-notice pm-admin-notice-success">{flash.status}</p>}
        {error && <p role="alert" className="pm-admin-notice pm-admin-notice-error">{error}</p>}
        <section className="pm-admin-panel pm-course-admin-section"><div className="pm-course-admin-section-heading"><h2>Learner reviews</h2><p>Only reviews submitted by enrolled learners can be published. Edited reviews require approval again.</p></div>
            {reviews.data.length ? reviews.data.map(review => <article className="pm-course-admin-repeat-card" key={review.id}><div className="pm-course-admin-repeat-card-head"><strong>★ {review.rating}/5</strong><span className={`pm-course-admin-status ${review.is_published ? 'is-published' : ''}`}>{review.is_published ? 'Published' : 'Not published'}</span></div><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{review.body}</p><div className="pm-course-admin-row-actions"><button type="button" className="pm-admin-button pm-admin-button-primary" disabled={busy !== null} onClick={() => moderate(review)}>{busy === review.id ? 'Saving…' : review.is_published ? 'Hide review' : 'Publish review'}</button></div></article>) : <p className="pm-course-admin-empty">No reviews submitted yet.</p>}
            <LinkedPagination links={reviews.links} label="Review pages"/>
        </section>
    </AdminLayout>;
}
