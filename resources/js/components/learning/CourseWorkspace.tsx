import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { courseLearningRoot, courseLessonHref, type EnrolledCourse, type CourseCertificate } from '@/types/learning';

export function CourseWorkspace({ title, description, children, lesson = false }: { title: string; description: string; children: ReactNode; lesson?: boolean }) {
    const root = courseLearningRoot(usePage().url);
    return <PublicLayout active="/learning" guideLayout banner={{title, description, parents: lesson ? [{label: 'My Learning', href: '/learning/my-learning'}] : [{label: 'Learn & Practice', href: '/learning'}], currentLabel: lesson ? 'Lesson' : title}}>
        <div className="pm-learn-v3 pm-course-workspace"><div className="pm-learn-v3-wrap">
            <LegacyPageHeading><header className="pm-course-workspace-heading">
                <nav className="pm-learn-v3-crumb" aria-label="Breadcrumb">{lesson ? <><Link href={`${root}/my-learning`}>My Learning</Link><span>/</span><span aria-current="page">Lesson</span></> : <><Link href={root.startsWith('/dashboard') ? '/dashboard' : '/'}>Home</Link><span>/</span><Link href={root}>Learn &amp; Practice</Link><span>/</span><span aria-current="page">{title}</span></>}</nav>
                <h1 className={lesson ? 'is-lesson-title' : undefined}>{title}</h1><p>{description}</p>
            </header></LegacyPageHeading>
            {children}
        </div></div>
    </PublicLayout>;
}

export function CourseProgress({ completed, total, percent }: { completed: number; total: number; percent: number }) {
    return <div className="pm-course-workspace-progress"><div><strong>{percent}% complete</strong><span>{completed} of {total} lessons</span></div><progress className="pm-progress" value={percent} max={100} aria-label="Course completion"/></div>;
}

export function CourseWorkspacePanel({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <section className={`pm-course-workspace-panel ${className}`}>{children}</section>;
}

export function CourseWorkspaceEmpty({ isMember, title, description }: { isMember: boolean; title: string; description: string }) {
    const authenticated = Boolean(usePage<{ auth?: { user?: unknown } }>().props.auth?.user);
    return <CourseWorkspacePanel className="pm-course-workspace-empty"><h2>{title}</h2><p>{description}</p><div className="pm-course-workspace-actions">{isMember ? <Link href="/learning" className="pm-guide-button">Browse courses</Link> : <><Link href={authenticated ? '/join/step/2' : '/login'} className="pm-guide-button">{authenticated ? 'Finish joining' : 'Sign in'}</Link>{!authenticated && <Link href="/register" className="pm-guide-button is-outline">Join the community</Link>}<Link href="/learning" className="pm-guide-button is-outline">Browse courses</Link></>}</div></CourseWorkspacePanel>;
}

export function EnrolledCourseCard({ course, root }: { course: EnrolledCourse; root: string }) {
    const completed = course.total > 0 && course.completed === course.total;
    const fallback = `/images/learning/course-${course.thumbnail}.webp`;
    const detail = `${root}/courses/${encodeURIComponent(course.slug)}`;
    return <article className="pm-learn-v3-course pm-course-enrolled-card">
        <Link href={detail} className="pm-learn-v3-course-image" aria-label={`View ${course.title}`}><img key={course.coverUrl || fallback} src={course.coverUrl || fallback} alt="" loading="lazy" decoding="async" onError={event => { const image = event.currentTarget; if (image.getAttribute('src') !== fallback) image.src = fallback; else image.style.visibility = 'hidden'; }}/></Link>
        <div className="pm-learn-v3-course-body"><span className="pm-learn-v3-meta">{course.category}</span><h3><Link href={detail}>{course.title}</Link></h3>
            <CourseProgress {...course}/>
            <div className="pm-course-workspace-actions">{!course.eligible ? <Link href="/membership" className="pm-guide-button">Upgrade to continue</Link> : course.total > 0 ? <Link href={courseLessonHref(root, course.slug, course.next)} className="pm-guide-button">{completed ? 'Review course' : 'Continue learning'}</Link> : null}
                {completed && course.certificate ? <Link href={`${root}/certificates/${course.certificate}`} className="pm-guide-button is-outline">Certificate</Link> : <Link href={detail} className="pm-guide-button is-outline">Course details</Link>}
            </div>
        </div>
    </article>;
}

export function CertificateCard({ certificate, root }: { certificate: CourseCertificate; root: string }) {
    const href = `${root}/certificates/${certificate.reference}`;
    return <CourseWorkspacePanel className="pm-course-certificate-card"><span className="pm-learn-v3-pill is-free">Completed</span><h2>{certificate.courseTitle}</h2><p>Issued {certificate.issuedAt}</p><div className="pm-course-workspace-actions"><Link className="pm-guide-button" href={href}>View certificate</Link><a className="pm-guide-button" href={`${href}?print=1`} target="_blank" rel="noopener noreferrer">Download PDF</a></div></CourseWorkspacePanel>;
}
