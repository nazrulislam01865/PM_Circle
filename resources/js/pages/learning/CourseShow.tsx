import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import {
    CourseAccessCard, CourseDetailCurriculum, CourseDetailExtraPanel, CourseDetailHero,
    CourseDetailPracticePanel, CourseDetailResourcesPanel,
    CourseDetailOverview, CourseDetailTabs, CourseProviderCard, courseActionError, type CourseDetailTab,
} from '@/components/learning/CourseDetail';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { CoursePracticeSettings, CourseResourceData, DemoCourseDetailData } from '@/types/learning';
import { demoCourseHref } from '@/types/learning';

type CourseShowProps = {
    course: DemoCourseDetailData;
    isMember: boolean;
    isAuthenticated: boolean;
    eligible: boolean;
    enrolled: boolean;
    saved: boolean;
    memberTier: 'free' | 'plus' | 'pro';
    practice: CoursePracticeSettings;
    resources: CourseResourceData[];
    nextLesson?: number;
};

export default function CourseShow({ course, isMember, isAuthenticated, eligible, enrolled, saved, memberTier, practice, resources, nextLesson = 1 }: CourseShowProps) {
    const [submitting, setSubmitting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [shareStatus, setShareStatus] = useState('');
    const [enrollmentError, setEnrollmentError] = useState('');
    const [saveError, setSaveError] = useState('');
    const actionLock = useRef(false);
    const canRead = isMember && enrolled && eligible;
    const memberView = usePage().url.split('?')[0].startsWith('/dashboard/learning/courses/');
    const root = memberView ? '/dashboard/learning' : '/learning';
    const url = memberView ? `${root}/courses/${encodeURIComponent(course.slug)}` : demoCourseHref(course.slug);

    const jump = (tab: CourseDetailTab) => {
        const target = document.getElementById(`course-${tab}`);
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    const enroll = () => {
        if (actionLock.current || !isMember || !eligible || enrolled) return;
        actionLock.current = true;
        setEnrollmentError(''); setSubmitting(true);
        router.post(`${url}/enroll`, {}, {
            preserveScroll: true,
            onError: () => setEnrollmentError('Unable to enroll. Please check your membership and try again.'),
            onHttpException: response => { setEnrollmentError(courseActionError(response.status)); return false; },
            onNetworkError: () => { setEnrollmentError('Connection failed. Check your connection and try again.'); return false; },
            onFinish: () => { actionLock.current = false; setSubmitting(false); },
        });
    };
    const toggleSave = () => {
        if (actionLock.current || !isMember) return;
        actionLock.current = true;
        setSaveError(''); setSaving(true);
        router.visit(`${demoCourseHref(course.slug)}/save`, {
            method: saved ? 'delete' : 'post',
            preserveScroll: true,
            onError: () => setSaveError('Unable to update your saved course. Please try again.'),
            onHttpException: response => { setSaveError(courseActionError(response.status)); return false; },
            onNetworkError: () => { setSaveError('Connection failed. Check your connection and try again.'); return false; },
            onFinish: () => { actionLock.current = false; setSaving(false); },
        });
    };
    const share = async () => {
        setShareStatus('');
        // Share the public course URL, never the member-only workspace URL.
        const publicUrl = new URL(demoCourseHref(course.slug), window.location.origin).href;
        try {
            if (navigator.share) {
                await navigator.share({ title: course.title, url: publicUrl });
                setShareStatus('Course shared.');
            } else {
                await navigator.clipboard.writeText(publicUrl);
                setShareStatus('Course link copied.');
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return;
            setShareStatus(`Share unavailable. Copy this link: ${publicUrl}`);
        }
    };

    return <PublicLayout siteLayout={!memberView} active="/learning" banner={{title: course.title, description: course.summary, parents: [{label: 'Browse courses', href: '/learning'}], titleId: 'pm-course-detail-title'}}>
        <Head title={`${course.title} | Learn & Practice`} />
        <div className="pm-course-detail pm-guide-public-shell">
            <div className="pm-container pm-course-detail-inner">
                <LegacyPageHeading><nav className="pm-course-detail-breadcrumb" aria-label="Breadcrumb">
                    <Link href={memberView ? `${root}?tab=courses` : root}>Browse courses</Link><span aria-hidden="true">/</span>
                    <span aria-current="page">{course.title}</span>
                </nav></LegacyPageHeading>
                <div className="pm-course-detail-grid">
                    <CourseDetailHero course={course} isMember={isMember} saved={saved} saving={saving || submitting} onSave={toggleSave} onShare={share} shareStatus={shareStatus} saveError={saveError} />
                    <div className="pm-course-detail-main">
                        <CourseDetailTabs onChange={jump} />
                        <CourseDetailOverview course={course} />
                        <CourseDetailCurriculum course={course} canRead={canRead} lessonRoot={root} />
                        <CourseDetailPracticePanel course={course} practice={practice} canRead={canRead} />
                        <CourseDetailExtraPanel active="reviews" course={course} practice={practice} />
                        <CourseDetailExtraPanel active="questions" course={course} practice={practice} />
                        <CourseDetailResourcesPanel course={course} resources={resources} canRead={canRead} lessonRoot={root} />
                    </div>
                    <aside className="pm-course-detail-aside" aria-label="Course enrollment and provider">
                        <CourseAccessCard course={course} isMember={isMember} isAuthenticated={isAuthenticated}
                            eligible={eligible} enrolled={enrolled} memberTier={memberTier} submitting={submitting || saving} error={enrollmentError} lessonHref={course.lessons.length ? `${url}/lessons/${nextLesson}` : undefined} onEnroll={enroll} onViewCurriculum={() => jump('curriculum')} />
                        <CourseProviderCard />
                    </aside>
                </div>
            </div>
        </div>
    </PublicLayout>;
}
