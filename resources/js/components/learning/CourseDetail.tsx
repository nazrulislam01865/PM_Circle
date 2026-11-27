import { AdminChoice } from '@/components/admin/AdminChoice';
import { Link, router } from '@inertiajs/react';
import { ClipboardCheck, Clock3, Layers3, LockKeyhole } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import type { CoursePracticeSettings, CourseResourceData, DemoCourseDetailData, CourseReview, OwnCourseReview } from '@/types/learning';
import { courseDetailLabels, isExamCourse, isPmp } from './courseDetailLabels';

export type CourseDetailTab = 'overview' | 'curriculum' | 'practice' | 'reviews' | 'questions' | 'resources';
const tabs: { key: CourseDetailTab; label: string }[] = [
    { key: 'overview', label: 'Overview' }, { key: 'curriculum', label: 'Curriculum' },
    { key: 'practice', label: 'Practice & Exams' }, { key: 'reviews', label: 'Reviews' },
    { key: 'questions', label: 'Q&A' }, { key: 'resources', label: 'Resources' },
];
const hasVideo = (course: DemoCourseDetailData) => course.lessons.some(lesson => lesson.hasVideo);
const duration = (course: DemoCourseDetailData) => course.minutes <= 0 ? 'Self-paced' : course.minutes < 60 ? `${course.minutes} minutes estimated study` : `${Number((course.minutes / 60).toFixed(1))} ${course.minutes === 60 ? 'hour' : 'hours'} estimated study`;
const notesLabel = (course: DemoCourseDetailData) => `${course.lessons.length} ${course.lessons.length === 1 ? 'lesson' : 'lessons'}`;

export function courseActionError(status: number) {
    if (status === 429) return 'Too many requests. Please wait a moment before trying again.';
    if (status === 401 || status === 419) return 'Your session has expired. Refresh the page or sign in again.';
    if (status === 403) return 'This action is not available with your current access.';
    if (status === 404) return 'This course or content is no longer available.';
    return 'Unable to complete this request. Please try again.';
}

export function CourseDetailTabs({ onChange }: { onChange: (tab: CourseDetailTab) => void }) {
    return <nav className="pm-course-detail-tabs" aria-label="Course details sections">
        {tabs.map(tab => <button type="button" key={tab.key} className="pm-guide-button is-outline" onClick={() => onChange(tab.key)}>{tab.label}</button>)}
    </nav>;
}

function DetailSection({ id, title, children, className = '' }: { id: CourseDetailTab; title: string; children: ReactNode; className?: string }) {
    return <section id={`course-${id}`} tabIndex={-1} className={`pm-system-card pm-course-detail-card ${className}`} aria-labelledby={`course-${id}-title`}>
        <h2 id={`course-${id}-title`}>{title}</h2>{children}
    </section>;
}

function Disclosure({ title, children, open }: { title: ReactNode; children: ReactNode; open?: boolean }) {
    return <details className="pm-course-detail-disclosure" open={open}><summary>{title}</summary><div className="pm-course-detail-disclosure-content">{children}</div></details>;
}

export function CourseDetailHero({ course, isMember, saved, saving, onSave, onShare, shareStatus, saveError }: {
    course: DemoCourseDetailData; isMember: boolean; saved: boolean; saving: boolean;
    onSave: () => void; onShare: () => void; shareStatus: string; saveError?: string;
}) {
    const { type, topics } = courseDetailLabels(course);
    const fallback = `/images/learning/course-${course.thumbnail}.webp`;
    return <header className="pm-course-detail-hero" aria-labelledby="pm-course-detail-title">
        <figure className="pm-course-detail-cover">
            <img key={course.coverUrl || fallback} src={course.coverUrl || fallback} alt="" decoding="async" onError={event => { const image = event.currentTarget; if (image.getAttribute('src') !== fallback) image.src = fallback; else image.style.visibility = 'hidden'; }} />
            <figcaption className="pm-course-detail-cover-caption">Self-paced study · {hasVideo(course) ? 'Video & reading' : 'No video'}</figcaption>
        </figure>
        <div className="pm-course-detail-heading">
            <div className="pm-course-detail-heading-top">
                <span className="pm-course-detail-category">{type}</span>
                {isMember && <button type="button" className="pm-guide-button is-outline" onClick={onSave} aria-pressed={saved} disabled={saving} aria-label={saved ? 'Remove saved course' : 'Save course'}>{saving ? 'Saving…' : saved ? 'Saved' : 'Save'}</button>}
                <button type="button" className="pm-guide-button is-outline" onClick={onShare}>Share</button>
            </div>
            <h1 id="pm-course-detail-title">{course.title}</h1>
            <p className="pm-course-detail-summary">{course.summary}</p>
            <p className="pm-course-detail-facts">{duration(course)} · {course.level} · {notesLabel(course)}</p>
            {topics.length > 0 && <ul className="pm-course-detail-tags" aria-label="Course topics">{topics.map(topic => <li key={topic}>{topic}</li>)}</ul>}
            {shareStatus && <p className="pm-course-detail-share-status" role="status">{shareStatus}</p>}
            {saveError && <p className="pm-course-practice-error" role="alert">{saveError}</p>}
        </div>
    </header>;
}

export function CourseDetailOverview({ course }: { course: DemoCourseDetailData }) {
    const goals = course.objectives?.length ? course.objectives : course.lessons.map(lesson => lesson.title);
    return <DetailSection id="overview" title="About this course" className="pm-course-detail-about">
        <p>{course.overview || course.summary}</p>
        {goals.length > 0 && <div className="pm-course-detail-learn-inner"><h3>What you’ll learn</h3><ul>{goals.map((goal, index) => <li key={index}>{goal}</li>)}</ul></div>}
    </DetailSection>;
}

export function CourseDetailCurriculum({ course, canRead, lessonRoot = '/learning' }: { course: DemoCourseDetailData; canRead: boolean; lessonRoot?: string }) {
    const sections = course.outline?.length ? course.outline : course.lessons.map(lesson => ({ title: lesson.title, topics: [lesson.title] }));
    const count = sections.reduce((sum, section) => sum + section.topics.length, 0);
    return <DetailSection id="curriculum" title="Course curriculum" className="pm-course-detail-curriculum">
        <p className="pm-course-detail-meta">{sections.length} sections · {count} topics · Self-paced</p>
        {sections.map((section, index) => <Disclosure key={`${index}-${section.title}`} open={index === 0 ? true : undefined} title={<>{index + 1}. {section.title} <span className="pm-course-detail-meta">· {section.topics.length} {section.topics.length === 1 ? 'topic' : 'topics'}</span></>}>
            <ul className="pm-course-detail-topics">{section.topics.map((topic, topicIndex) => {
                const linked = course.lessons.flatMap((lesson, position) => lesson.sectionTitle === section.title && lesson.topicTitle === topic ? [{ lesson, position }] : []);
                const href = (position: number) => `${lessonRoot}/courses/${encodeURIComponent(course.slug)}/lessons/${position + 1}`;
                const singleMatch = linked.length === 1 && linked[0].lesson.title === topic;
                return <li key={topicIndex}>{index + 1}.{topicIndex + 1} {singleMatch ? <Link href={href(linked[0].position)}>{topic}</Link> : <>{topic}{linked.map(({lesson, position}) => <div className="pm-course-detail-meta" key={position}><Link href={href(position)}>{lesson.title}</Link></div>)}</>}</li>;
            })}</ul>
        </Disclosure>)}
        {!sections.length && <p>No curriculum has been published yet.</p>}
        {course.lessons.length > 0 && <p className="pm-course-detail-meta">{canRead ? 'Your lessons and documents are available in the course player.' : <>The outline is open to browse. Enroll to access the lessons. <Link href={`${lessonRoot}/courses/${encodeURIComponent(course.slug)}/lessons/1`}>View lesson outline</Link></>}</p>}
    </DetailSection>;
}

export function CourseDetailPracticePanel({ course, practice, canRead }: { course: DemoCourseDetailData; practice: CoursePracticeSettings; canRead: boolean }) {
    const [section, setSection] = useState('');
    const [topic, setTopic] = useState('');
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState('');
    const lock = useRef(false);
    const selectedSection = practice.sections.find(item => item.title === section);
    const available = topic ? (selectedSection?.topics.find(item => item.title === topic)?.available ?? 0) : section ? (selectedSection?.available ?? 0) : practice.available;
    const ready = practice.enabled && practice.questionCount > 0 && available >= practice.questionCount;
    const start = () => {
        if (lock.current || !canRead || !ready) return;
        lock.current = true; setError(''); setStarting(true);
        router.post(`/learning/courses/${encodeURIComponent(course.slug)}/practice/start`, { section: section || null, topic: topic || null }, {
            onError: errors => setError(errors.topic || errors.section || 'Could not start this practice.'),
            onHttpException: response => { setError(courseActionError(response.status)); return false; },
            onNetworkError: () => { setError('Connection failed. Check your connection and try again.'); return false; },
            onFinish: () => { lock.current = false; setStarting(false); },
        });
    };
    return <DetailSection id="practice" title="Practice & Exams" className="pm-course-practice-panel">
        {!!course.presentation?.practice_examples?.length && <><p>Explore these practice examples and suggested responses.</p>{course.presentation.practice_examples.map(({question, answer}, index) => <Disclosure key={index} title={question}><p>{answer}</p></Disclosure>)}</>}
        {practice.enabled ? canRead ? <div className="pm-course-detail-practice-controls">
            <p>Practice published questions linked to this course curriculum. Answers are scored automatically, with explanations after submission.</p>
            <div className="pm-course-practice-summary"><span><ClipboardCheck size={18}/>{practice.questionCount} questions</span><span><Clock3 size={18}/>{practice.durationMinutes} minutes</span><span><Layers3 size={18}/>{practice.sections.length} sections</span></div>
            <div className="pm-course-practice-field"><AdminChoice id="pm-course-practice-scope" label="Practice scope" value={section ? `section:${section}` : 'all'} options={[{value: 'all', label: `Full course (${practice.available} available)`}, ...practice.sections.map(item => ({value: `section:${item.title}`, label: `${item.title} (${item.available})`}))]} onChange={value => { setSection(value === 'all' ? '' : value.slice('section:'.length)); setTopic(''); setError(''); }} disabled={starting}/></div>
            {selectedSection && <div className="pm-course-practice-field"><AdminChoice id="pm-course-practice-topic" label="Curriculum topic" value={topic ? `topic:${topic}` : 'all'} options={[{value: 'all', label: `All topics (${selectedSection.available} available)`}, ...selectedSection.topics.map(item => ({value: `topic:${item.title}`, label: `${item.title} (${item.available})`}))]} onChange={value => { setTopic(value === 'all' ? '' : value.slice('topic:'.length)); setError(''); }} disabled={starting}/></div>}
            {!ready && <p className="pm-course-practice-hint">Not enough published questions for this selection.</p>}
            {error && <p role="alert" className="pm-course-practice-error">{error}</p>}
            <button type="button" className="pm-guide-button pm-course-practice-start" onClick={start} disabled={!ready || starting}>{starting ? 'Starting…' : 'Start practice exam'}</button>
        </div> : <p className="pm-course-detail-locked-note"><LockKeyhole size={16} aria-hidden="true"/> Enroll with eligible membership to start practice.</p> : !course.presentation?.practice_examples?.length && <p>Practice is not published for this course yet.</p>}
        {isPmp(course) && <Link href="/exams/pmp" className="pm-guide-button is-outline pm-course-detail-exam-link">Open PMP Exam Simulator</Link>}
    </DetailSection>;
}

export function CourseDetailResourcesPanel({ course, resources, canRead, lessonRoot = '/learning' }: { course: DemoCourseDetailData; resources: CourseResourceData[]; canRead: boolean; lessonRoot?: string }) {
    return <DetailSection id="resources" title="Resources">
        {course.lessons.length > 0 && <><p>{notesLabel(course)} {course.lessons.length === 1 ? 'is' : 'are'} available inside the course player.</p><ul className="pm-course-detail-resource-notes">{course.lessons.map((lesson, index) => <li key={`${index}-${lesson.title}`}>{canRead ? <Link href={`${lessonRoot}/courses/${encodeURIComponent(course.slug)}/lessons/${index + 1}`}>{lesson.title}</Link> : lesson.title}</li>)}</ul></>}
        {resources.length > 0 && <div className="pm-course-resource-list">{resources.map(resource => <article key={resource.id} className="pm-course-resource-item">
            <div><strong>{resource.title}</strong><span>{resource.section}{resource.lessonTitle ? ` · ${resource.lessonTitle}` : ''}{resource.description ? ` · ${resource.description}` : ''}</span></div>
            {canRead ? <a href={`/learning/courses/${encodeURIComponent(course.slug)}/resources/${resource.id}`} className="pm-guide-button is-outline" target="_blank" rel="noopener noreferrer">{resource.kind === 'file' ? 'Download' : 'Open resource'}</a> : <span className="pm-course-resource-locked"><LockKeyhole size={15} aria-hidden="true"/> Enroll to access</span>}
        </article>)}</div>}
        {!course.lessons.length && !resources.length && <p>No resources have been published for this course yet.</p>}
    </DetailSection>;
}

export function CourseDetailExtraPanel({ active, course, reviews = [], ownReview, canRead = false }: { active: 'reviews' | 'questions'; course: DemoCourseDetailData; practice: CoursePracticeSettings; reviews?: CourseReview[]; ownReview?: OwnCourseReview | null; canRead?: boolean }) {
    if (active === 'questions') {
        const faq = [
            ['Is this a video course?', hasVideo(course) ? 'This course includes video and study notes.' : 'This self-paced course uses written study notes. No video is currently listed.'],
            ['Who can enroll?', course.accessTier === 'paid' ? 'This course is included with eligible Plus and Pro memberships.' : 'PM Circle community members can enroll for free.'],
            ['Does the completion certificate grant PMP certification?', 'The certificate records completion in PM Circle. PMP certification is awarded separately through PMI.'],
            ['What does the study estimate mean?', `${duration(course)} is the catalog estimate, not a guarantee of study time or certification eligibility.`],
        ];
        const items = [...faq.filter((_, index) => index !== 2 || (isPmp(course) && course.certificateEnabled)), ...(course.presentation?.faq ?? []).map(({question, answer}) => [question, answer])];
        return <DetailSection id="questions" title="Q&A">{items.map(([question, answer], index) => <Disclosure key={index} title={question}><p>{answer}</p></Disclosure>)}</DetailSection>;
    }
    return <DetailSection id="reviews" title="Reviews">
        {course.rating != null && !!course.reviewCount && <p className="pm-course-detail-meta"><strong className="pm-course-detail-rating">★ {course.rating.toFixed(1)}</strong> · {course.reviewCount} {course.reviewCount === 1 ? 'review' : 'reviews'}</p>}
        {reviews.length ? reviews.map(review => <blockquote key={review.id}><strong className="pm-course-detail-rating">★ {review.rating}/5</strong><p>{review.body}</p><span>Verified enrollment</span></blockquote>) : <p>No learner reviews are available for this course yet.</p>}
        {reviews.length > 0 && (course.reviewCount ?? 0) > reviews.length && <p className="pm-course-detail-meta">Showing the latest {reviews.length} published reviews.</p>}
        {canRead && <CourseReviewForm key={`${course.slug}:${ownReview?.rating}:${ownReview?.body}:${ownReview?.is_published}`} course={course} ownReview={ownReview}/>}
    </DetailSection>;
}

function CourseReviewForm({course, ownReview}: {course: DemoCourseDetailData; ownReview?: OwnCourseReview | null}) {
    const [rating, setRating] = useState(String(ownReview?.rating ?? 5));
    const [body, setBody] = useState(ownReview?.body ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);
    return <details className="pm-course-detail-disclosure"><summary>{ownReview ? 'Edit your review' : 'Write a review'}</summary><div className="pm-course-detail-disclosure-content">
        {ownReview && <p className="pm-course-detail-meta">{ownReview.is_published ? 'Published' : 'Awaiting moderation'}</p>}
        <form className="pm-course-detail-review-form" onSubmit={event => {event.preventDefault(); if (busy || !body.trim()) return; setBusy(true); setError(''); setSent(false); router.post(`/learning/courses/${encodeURIComponent(course.slug)}/reviews`, {rating: Number(rating), body}, {preserveScroll: true, onSuccess: () => setSent(true), onError: errors => setError(errors.body || errors.rating || 'Unable to submit review.'), onHttpException: response => {setError(courseActionError(response.status)); return false;}, onFinish: () => setBusy(false)});}}>
            <AdminChoice id="course-review-rating" label="Rating" value={rating} options={[5,4,3,2,1].map(n => ({value: String(n), label: `${n}/5`}))} onChange={setRating}/>
            <label className="pm-guide-field-label" htmlFor="course-review-body">Your review</label><textarea id="course-review-body" className="pm-guide-control" rows={4} maxLength={2000} required value={body} onChange={e => setBody(e.target.value)}/>
            <button type="submit" className="pm-guide-button" disabled={busy || !body.trim()}>{busy ? 'Submitting…' : 'Submit for moderation'}</button>
            {error && <p role="alert" className="pm-course-practice-error">{error}</p>}{sent && <p role="status">Review submitted for moderation.</p>}
        </form>
    </div></details>;
}

export function CourseAccessCard({ course, practice, resources, isMember, isAuthenticated, isAdmin = false, eligible, enrolled, memberTier, submitting, onEnroll, onViewCurriculum, lessonHref, error }: {
    course: DemoCourseDetailData; practice: CoursePracticeSettings; resources: CourseResourceData[]; isMember: boolean; isAuthenticated: boolean; isAdmin?: boolean; eligible: boolean; enrolled: boolean; memberTier: 'free' | 'plus' | 'pro'; submitting: boolean; onEnroll: () => void; onViewCurriculum: () => void; lessonHref?: string; error?: string;
}) {
    const paid = course.accessTier === 'paid';
    const canRead = isMember && enrolled && eligible;
    let action: ReactNode;
    let description: string;
    if (canRead) {
        description = 'Your enrollment is active.';
        action = lessonHref ? <Link className="pm-guide-button" href={lessonHref}>Continue learning</Link> : null;
    } else if (isAdmin) {
        description = 'Preview the published course outline.';
        action = null;
    } else if (!isMember) {
        description = paid ? 'Join PM Circle and choose Plus or Pro to access this course.' : 'Join the community for free to enroll in this course.';
        action = <Link className="pm-guide-button" href={isAuthenticated ? '/join/step/2' : '/register'}>{isAuthenticated ? 'Finish joining' : 'Join to enroll'}</Link>;
    } else if (!eligible) {
        description = 'This course is included with an active Plus or Pro membership. There is no separate course charge.';
        action = <Link className="pm-guide-button" href="/membership">Explore Plus &amp; Pro</Link>;
    } else {
        description = paid ? `Included with your ${memberTier === 'plus' ? 'Plus' : 'Pro'} membership.` : 'Free for PM Circle community members.';
        action = <button type="button" className="pm-guide-button" onClick={onEnroll} disabled={submitting} aria-busy={submitting}>{submitting ? 'Enrolling…' : 'Enroll now'}</button>;
    }
    return <section className="pm-system-card pm-course-detail-card pm-course-detail-access" aria-label="Course enrollment">
        <span className="pm-course-detail-access-label">{canRead ? 'Enrolled' : paid ? 'Plus & Pro' : 'Free course'}</span>
        <h2>{canRead ? 'Ready to study' : paid ? isMember && eligible ? 'Included with your membership' : 'Included with Plus & Pro' : 'Free for community members'}</h2>
        <p>{description}</p>
        <div className="pm-course-detail-access-buttons">{action}<button type="button" className="pm-guide-button is-outline" onClick={onViewCurriculum}>View course outline</button></div>
        {error && <p className="pm-course-practice-error" role="alert">{error}</p>}
        <ul className="pm-course-detail-perks"><li>{isExamCourse(course) ? 'Self-paced exam-focused study' : 'Self-paced project management study'}</li><li>{notesLabel(course)}</li>{!!course.presentation?.practice_examples?.length && <li>Practice examples</li>}{practice.enabled && practice.available > 0 && <li>Published practice questions</li>}{resources.length > 0 && <li>{resources.length} course {resources.length === 1 ? 'resource' : 'resources'}</li>}{course.certificateEnabled && course.lessons.length > 0 && <li>Completion certificate after completing all lessons</li>}</ul>
    </section>;
}

export function CourseProviderCard({ course }: {course: DemoCourseDetailData}) {
    return <section className="pm-system-card pm-course-detail-card pm-course-detail-provider" aria-labelledby="pm-course-provider-title">
        <h2 id="pm-course-provider-title">Course provider</h2><strong>{course.presentation?.provider_name ?? 'PM Circle by ITQAN'}</strong><p>{course.presentation?.provider_description ?? 'Project management learning and exam preparation resources.'}</p>
    </section>;
}
