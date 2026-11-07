import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
    CourseAccessCard, CourseDetailCurriculum, CourseDetailExtraPanel, CourseDetailHero,
    CourseDetailOverview, CourseDetailTabs, CourseProviderCard, type CourseDetailTab,
} from '@/components/learning/CourseDetail';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { DemoCourseDetailData } from '@/types/learning';
import { demoCourseHref } from '@/types/learning';

type CourseShowProps = {
    course: DemoCourseDetailData;
    isMember: boolean;
    isAuthenticated: boolean;
    eligible: boolean;
    enrolled: boolean;
    saved: boolean;
    memberTier: 'free' | 'plus' | 'pro';
};

export default function CourseShow({ course, isMember, isAuthenticated, eligible, enrolled, saved, memberTier }: CourseShowProps) {
    const [submitting, setSubmitting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<CourseDetailTab>('overview');
    const [shareStatus, setShareStatus] = useState('');
    const canRead = isMember && enrolled && eligible;
    const memberView = usePage().url.split('?')[0].startsWith('/dashboard/learning/courses/');
    const root = memberView ? '/dashboard/learning' : '/learning';
    const url = memberView ? `${root}/courses/${encodeURIComponent(course.slug)}` : demoCourseHref(course.slug);

    const enroll = () => {
        if (submitting || !isMember || !eligible || enrolled) return;
        setSubmitting(true);
        router.post(`${url}/enroll`, {}, { preserveScroll: true, onFinish: () => setSubmitting(false) });
    };
    const toggleSave = () => {
        if (saving || !isMember) return;
        setSaving(true);
        router.visit(`${demoCourseHref(course.slug)}/save`, {
            method: saved ? 'delete' : 'post',
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };
    const share = async () => {
        try {
            if (navigator.share) {
                await navigator.share({ title: course.title, url: window.location.href });
                setShareStatus('Course shared.');
            } else {
                await navigator.clipboard.writeText(window.location.href);
                setShareStatus('Course link copied.');
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return;
            setShareStatus('Share unavailable. You can copy the URL from your browser.');
        }
    };

    return <PublicLayout siteLayout={!memberView} active="/learning">
        <Head title={`${course.title} | Learn & Practice`} />
        <div className="pm-course-detail">
            <div className="pm-container pm-course-detail-inner">
                <nav className="pm-course-detail-breadcrumb" aria-label="Breadcrumb">
                    <Link href={memberView ? '/dashboard' : '/'}>Home</Link><ChevronRight aria-hidden="true" size={15} />
                    <Link href={root}>Learn &amp; Practice</Link><ChevronRight aria-hidden="true" size={15} />
                    <Link href={`${root}?tab=courses`}>Courses</Link><ChevronRight aria-hidden="true" size={15} />
                    <span aria-current="page">{course.title}</span>
                </nav>
                <div className="pm-course-detail-grid">
                    <div className="pm-course-detail-main">
                        <CourseDetailHero course={course} isMember={isMember} saved={saved} saving={saving} onSave={toggleSave} onShare={share} shareStatus={shareStatus} />
                        <CourseDetailTabs active={tab} onChange={setTab} />
                        {tab === 'overview' ? <>
                            <CourseDetailOverview course={course} />
                            <CourseDetailCurriculum course={course} canRead={canRead} />
                        </> : tab === 'curriculum' ? <CourseDetailCurriculum course={course} canRead={canRead} />
                            : <CourseDetailExtraPanel active={tab} course={course} />}
                    </div>
                    <aside className="pm-course-detail-aside" aria-label="Course enrollment and provider">
                        <CourseAccessCard course={course} isMember={isMember} isAuthenticated={isAuthenticated}
                            eligible={eligible} enrolled={enrolled} memberTier={memberTier} submitting={submitting} onEnroll={enroll} onViewCurriculum={() => { setTab('curriculum'); document.querySelector('.pm-course-detail-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
                        <CourseProviderCard />
                    </aside>
                </div>
            </div>
        </div>
    </PublicLayout>;
}
