import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, BookOpen, CheckCircle2, Clock3, GraduationCap, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { DemoCourseData } from '@/types/learning';
import { demoCourseHref } from '@/types/learning';

type DemoLesson = { title: string; body: string | null };
type CourseShowProps = {
    course: Omit<DemoCourseData, 'enrolled' | 'saved'> & { lessons: DemoLesson[] };
    isMember: boolean;
    isAuthenticated: boolean;
    eligible: boolean;
    enrolled: boolean;
    memberTier: 'free' | 'plus' | 'pro';
};

export default function CourseShow({ course, isMember, isAuthenticated, eligible, enrolled, memberTier }: CourseShowProps) {
    const [submitting, setSubmitting] = useState(false);
    const canRead = enrolled && eligible;
    const joinHref = isAuthenticated ? '/join/step/2' : '/register';
    const title = course.title;

    const enroll = () => {
        if (submitting || !isMember || !eligible || enrolled) return;
        setSubmitting(true);
        router.post(`${demoCourseHref(course.slug)}/enroll`, {}, {
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
        });
    };

    return <PublicLayout active="/learning">
        <Head title={`${title} | Learn & Practice`} />
        <div className="pm-demo-course-detail">
            <div className="pm-demo-course-detail-inner">
                <Link href="/learning" className="pm-demo-course-back"><ArrowLeft size={17} aria-hidden="true" /> Back to Learn &amp; Practice</Link>
                <div className="pm-demo-course-detail-grid">
                    <section className="pm-demo-course-panel">
                        <div className="pm-demo-course-cover"><img src={`/images/learning/course-${course.thumbnail}.webp`} alt="" />
                            <span className={`pm-catalog-course-badge${course.accessTier === 'free' ? ' is-free' : ''}`}>{course.accessTier === 'free' ? 'Free' : 'Paid'}</span>
                        </div>
                        <div className="pm-demo-course-text">
                            <span className="pm-demo-course-eyebrow">Demo course · {course.category}</span>
                            <h1>{title}</h1>
                            <p className="pm-demo-course-summary">{course.summary}</p>
                            <div className="pm-demo-course-stats"><span><Clock3 size={17} /> {Math.round(course.minutes / 60 * 10) / 10} hours</span>
                                <span><GraduationCap size={17} /> {course.level}</span><span><BookOpen size={17} /> {course.lessons.length} sample lessons</span></div>
                            <h2>Course outline</h2>
                            <p className="pm-demo-course-hint">This is sample learning content for the PM Circle catalog prototype.</p>
                            <ol className="pm-demo-course-lessons">{course.lessons.map((lesson, index) => <li key={index}>
                                <div className="pm-demo-course-lesson-heading"><span>{index + 1}</span><strong>{lesson.title}</strong>{!canRead && <LockKeyhole size={16} aria-label="Enroll to read" />}</div>
                                {canRead && lesson.body && <p>{lesson.body}</p>}
                            </li>)}</ol>
                        </div>
                    </section>
                    <aside className="pm-demo-course-enrollment" aria-label="Enrollment">
                        <h2>{canRead ? 'You are enrolled' : 'Join this course'}</h2>
                        {canRead ? <><p><CheckCircle2 size={18} aria-hidden="true" /> You can read the sample lessons on this page.</p>
                            <div className="pm-demo-course-access-status">Enrollment confirmed · No payment required</div></>
                            : !isMember ? <><p>{course.accessTier === 'paid' ? 'Join PM Circle, then choose Plus or Pro to enroll at no extra course charge.' : 'Browse course details freely. Join PM Circle to enroll for free.'}</p>
                                <Link className="pm-catalog-course-action" href={joinHref}>{isAuthenticated ? 'Finish joining' : course.accessTier === 'paid' ? 'Join to access Plus or Pro' : 'Join free to enroll'}</Link>
                                {course.accessTier === 'paid' && <small>Plus or Pro membership is required for this course.</small>}</>
                            : !eligible ? <><p>This paid course is included at no extra charge with Plus or Pro membership.</p>
                                <Link className="pm-catalog-course-action" href="/membership">Explore Plus and Pro</Link></>
                            : <><p>{course.accessTier === 'paid' ? `Included with your ${memberTier === 'plus' ? 'Plus' : 'Pro'} membership at no extra charge.` : 'Free for PM Circle community members.'}</p>
                                <button className="pm-catalog-course-action" type="button" disabled={submitting} onClick={enroll}>{submitting ? 'Enrolling…' : 'Enroll free'}</button></>}
                        <div className="pm-demo-course-assurance"><ShieldCheck size={18} aria-hidden="true" /> Enrollment requires a verified community account. There is no separate course payment for Plus or Pro members.</div>
                    </aside>
                </div>
            </div>
        </div>
    </PublicLayout>;
}
