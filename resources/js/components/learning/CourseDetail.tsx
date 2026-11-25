import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Link, router } from '@inertiajs/react';
import { ClipboardCheck, Clock3, Layers3, LockKeyhole } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import type { CoursePracticeSettings, CourseResourceData, DemoCourseDetailData } from '@/types/learning';
import { sampleMetrics } from './courseSampleMetrics';

export type CourseDetailTab = 'overview' | 'curriculum' | 'practice' | 'reviews' | 'questions' | 'resources';
const tabs: { key: CourseDetailTab; label: string }[] = [
    { key: 'overview', label: 'Overview' }, { key: 'curriculum', label: 'Curriculum' },
    { key: 'practice', label: 'Practice & Exams' }, { key: 'reviews', label: 'Reviews' },
    { key: 'questions', label: 'Q&A' }, { key: 'resources', label: 'Resources' },
];
const isExamCourse = (course: DemoCourseDetailData) => /exam|certification|pmp/i.test(`${course.title} ${course.category}`);
const isPmp = (course: DemoCourseDetailData) => course.slug === 'pmp-exam-preparation';
const hasVideo = (course: DemoCourseDetailData) => course.lessons.some(lesson => lesson.hasVideo);
const duration = (course: DemoCourseDetailData) => course.minutes <= 0 ? 'Self-paced' : course.minutes < 60 ? `${course.minutes} minutes estimated study` : `${Number((course.minutes / 60).toFixed(1))} ${course.minutes === 60 ? 'hour' : 'hours'} estimated study`;
const notesLabel = (course: DemoCourseDetailData) => `${course.lessons.length} study ${course.lessons.length === 1 ? 'note' : 'notes'}`;

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
    const examFocused = isExamCourse(course);
    const fallback = `/images/learning/course-${course.thumbnail}.webp`;
    return <header className="pm-course-detail-hero" aria-labelledby="pm-course-detail-title">
        <figure className="pm-course-detail-cover">
            <img key={course.coverUrl || fallback} src={course.coverUrl || fallback} alt="" decoding="async" onError={event => { const image = event.currentTarget; if (image.getAttribute('src') !== fallback) image.src = fallback; else image.style.visibility = 'hidden'; }} />
            <figcaption className="pm-course-detail-cover-caption">Self-paced study · {hasVideo(course) ? 'Video & reading' : 'No video'}</figcaption>
        </figure>
        <div className="pm-course-detail-heading">
            <div className="pm-course-detail-heading-top">
                <span className="pm-course-detail-category">{examFocused ? 'Certification preparation' : course.category}</span>
                {isMember && <button type="button" className="pm-guide-button is-outline" onClick={onSave} aria-pressed={saved} disabled={saving} aria-label={saved ? 'Remove saved course' : 'Save course'}>{saving ? 'Saving…' : saved ? 'Saved' : 'Save'}</button>}
                <button type="button" className="pm-guide-button is-outline" onClick={onShare}>Share</button>
            </div>
            <LegacyPageHeading><h1 id="pm-course-detail-title">{course.title}</h1>
            <p className="pm-course-detail-summary">{course.summary}</p></LegacyPageHeading>
            <p className="pm-course-detail-facts">{duration(course)} · {course.level} · {notesLabel(course)}</p>
            <div className="pm-course-detail-tags"><span>{course.category}</span>{examFocused && <span>{isPmp(course) ? 'PMP®' : 'Exam Preparation'}</span>}{isPmp(course) && <span>Exam Preparation</span>}</div>
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
            <ul className="pm-course-detail-topics">{section.topics.map((topic, topicIndex) => <li key={topicIndex}>{index + 1}.{topicIndex + 1} {topic}</li>)}</ul>
        </Disclosure>)}
        {!sections.length && <p>No curriculum has been published yet.</p>}
        {course.lessons.length > 0 && <p className="pm-course-detail-meta">{canRead ? 'Your study notes are available in Resources and the course player.' : <>The outline is open to browse. Enroll to read the study notes. <Link href={`${lessonRoot}/courses/${encodeURIComponent(course.slug)}/lessons/1`}>View lesson outline</Link></>}</p>}
    </DetailSection>;
}

// Public, illustrative scenarios from the supplied prototype, not the scored question bank.
const pmpExamples = [
    ['What should you do if a sponsor requests a scope change just before release?', 'Check the impact on schedule, risk, and value. Then follow the agreed change process and communicate the decision.'],
    ['How should you respond when two team members disagree on priorities?', 'Understand each person’s concerns and facilitate a decision based on shared project goals.'],
];

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
        {isPmp(course) && <><p>Try two sample scenario questions, then open the suggested responses.</p>{pmpExamples.map(([question, answer]) => <Disclosure key={question} title={question}><p>{answer}</p></Disclosure>)}</>}
        {practice.enabled ? canRead ? <div className="pm-course-detail-practice-controls">
            <p>Practice published questions linked to this course curriculum. Answers are scored automatically, with explanations after submission.</p>
            <div className="pm-course-practice-summary"><span><ClipboardCheck size={18}/>{practice.questionCount} questions</span><span><Clock3 size={18}/>{practice.durationMinutes} minutes</span><span><Layers3 size={18}/>{practice.sections.length} sections</span></div>
            <label className="pm-course-practice-field"><strong>Practice scope</strong><select className="pm-guide-control" value={section} onChange={e => { setSection(e.target.value); setTopic(''); setError(''); }} disabled={starting}><option value="">Full course ({practice.available} available)</option>{practice.sections.map(item => <option key={item.title} value={item.title}>{item.title} ({item.available})</option>)}</select></label>
            {selectedSection && <label className="pm-course-practice-field"><strong>Curriculum topic</strong><select className="pm-guide-control" value={topic} onChange={e => { setTopic(e.target.value); setError(''); }} disabled={starting}><option value="">All topics ({selectedSection.available} available)</option>{selectedSection.topics.map(item => <option key={item.title} value={item.title}>{item.title} ({item.available})</option>)}</select></label>}
            {!ready && <p className="pm-course-practice-hint">Not enough published questions for this selection.</p>}
            {error && <p role="alert" className="pm-course-practice-error">{error}</p>}
            <button type="button" className="pm-guide-button pm-course-practice-start" onClick={start} disabled={!ready || starting}>{starting ? 'Starting…' : 'Start practice exam'}</button>
        </div> : <p className="pm-course-detail-locked-note"><LockKeyhole size={16} aria-hidden="true"/> Enroll with eligible membership to start practice.</p> : !isPmp(course) && <p>Practice is not published for this course yet.</p>}
        {isPmp(course) && <Link href="/exams/pmp" className="pm-guide-button is-outline pm-course-detail-exam-link">Open PMP Exam Simulator</Link>}
    </DetailSection>;
}

export function CourseDetailResourcesPanel({ course, resources, canRead, lessonRoot = '/learning' }: { course: DemoCourseDetailData; resources: CourseResourceData[]; canRead: boolean; lessonRoot?: string }) {
    return <DetailSection id="resources" title="Resources">
        {course.lessons.length > 0 && <><p>{notesLabel(course)} {course.lessons.length === 1 ? 'is' : 'are'} available inside the course player.</p><ul className="pm-course-detail-resource-notes">{course.lessons.map((lesson, index) => <li key={`${index}-${lesson.title}`}>{canRead ? <Link href={`${lessonRoot}/courses/${encodeURIComponent(course.slug)}/lessons/${index + 1}`}>{lesson.title}</Link> : lesson.title}</li>)}</ul></>}
        {resources.length > 0 && <div className="pm-course-resource-list">{resources.map(resource => <article key={resource.id} className="pm-course-resource-item">
            <div><strong>{resource.title}</strong><span>{resource.section}{resource.description ? ` · ${resource.description}` : ''}</span></div>
            {canRead ? <a href={`/learning/courses/${encodeURIComponent(course.slug)}/resources/${resource.id}`} className="pm-guide-button is-outline" target="_blank" rel="noopener noreferrer">{resource.kind === 'file' ? 'Download' : 'Open resource'}</a> : <span className="pm-course-resource-locked"><LockKeyhole size={15} aria-hidden="true"/> Enroll to access</span>}
        </article>)}</div>}
        {!course.lessons.length && !resources.length && <p>No resources have been published for this course yet.</p>}
    </DetailSection>;
}

export function CourseDetailExtraPanel({ active, course }: { active: 'reviews' | 'questions'; course: DemoCourseDetailData; practice: CoursePracticeSettings }) {
    if (active === 'questions') {
        const faq = [
            ['Is this a video course?', hasVideo(course) ? 'This course includes video and study notes.' : 'This self-paced course uses written study notes. No video is currently listed.'],
            ['Who can enroll?', course.accessTier === 'paid' ? 'This course is included with eligible Plus and Pro memberships.' : 'PM Circle community members can enroll for free.'],
            ['Does the completion certificate grant PMP certification?', 'The certificate records completion in PM Circle. PMP certification is awarded separately through PMI.'],
            ['What does the study estimate mean?', `${duration(course)} is the catalog estimate, not a guarantee of study time or certification eligibility.`],
        ];
        return <DetailSection id="questions" title="Q&A">{faq.filter((_, index) => index !== 2 || isPmp(course)).map(([question, answer]) => <Disclosure key={question} title={question}><p>{answer}</p></Disclosure>)}</DetailSection>;
    }
    const metric = sampleMetrics[course.title.trim()];
    return <DetailSection id="reviews" title="Reviews">
        {metric && <p className="pm-course-detail-meta"><strong className="pm-course-detail-rating">★ {metric.rating}</strong> · Sample rating · {metric.learners.toLocaleString('en-US')} sample learners</p>}
        {isPmp(course) && metric ? <><p className="pm-course-detail-meta">Illustrative prototype reviews — not actual learner feedback.</p><blockquote>“The scenario examples helped me see why the first action matters.” <span>— Farhana R., sample learner</span></blockquote><blockquote>“The outline helped me plan which topics to review each week.” <span>— Tanvir H., sample learner</span></blockquote></> : <p>No learner reviews are available for this course yet.</p>}
    </DetailSection>;
}

export function CourseAccessCard({ course, isMember, isAuthenticated, eligible, enrolled, memberTier, submitting, onEnroll, onViewCurriculum, lessonHref, error }: {
    course: DemoCourseDetailData; isMember: boolean; isAuthenticated: boolean; eligible: boolean; enrolled: boolean; memberTier: 'free' | 'plus' | 'pro'; submitting: boolean; onEnroll: () => void; onViewCurriculum: () => void; lessonHref?: string; error?: string;
}) {
    const paid = course.accessTier === 'paid';
    const canRead = isMember && enrolled && eligible;
    let action: ReactNode;
    let description: string;
    if (canRead) {
        description = 'Your enrollment is active.';
        action = lessonHref ? <Link className="pm-guide-button" href={lessonHref}>Continue learning</Link> : null;
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
        <ul className="pm-course-detail-perks"><li>{isExamCourse(course) ? 'Self-paced exam-focused study' : 'Self-paced project management study'}</li><li>{notesLabel(course)}</li><li>Project management scenarios</li>{course.lessons.length > 0 && <li>Completion certificate after completing all lessons</li>}</ul>
    </section>;
}

export function CourseProviderCard() {
    return <section className="pm-system-card pm-course-detail-card pm-course-detail-provider" aria-labelledby="pm-course-provider-title">
        <h2 id="pm-course-provider-title">Course provider</h2><strong>PM Circle by ITQAN</strong><p>Project management learning and exam preparation resources.</p>
    </section>;
}
