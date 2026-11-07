import { Link } from '@inertiajs/react';
import {
    Bookmark, BookOpenCheck, Check, ChevronDown, ClipboardCheck,
    Clock3, FileText, GraduationCap, Layers3, LockKeyhole, Medal,
    Share2, ShieldCheck, Target, Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { DemoCourseDetailData } from '@/types/learning';

export type CourseDetailTab = 'overview' | 'curriculum' | 'practice' | 'reviews' | 'questions' | 'resources';

const tabs: { key: CourseDetailTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'curriculum', label: 'Curriculum' },
    { key: 'practice', label: 'Practice & Exams' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'questions', label: 'Q&A' },
    { key: 'resources', label: 'Resources' },
];

export function CourseDetailTabs({ active, onChange }: { active: CourseDetailTab; onChange: (tab: CourseDetailTab) => void }) {
    return <nav className="pm-course-detail-tabs" aria-label="Course details sections">
        {tabs.map(tab => <button type="button" key={tab.key} className={active === tab.key ? 'is-active' : ''}
            aria-current={active === tab.key ? 'page' : undefined} onClick={() => onChange(tab.key)}>{tab.label}</button>)}
    </nav>;
}

export function CourseDetailHero({ course, isMember, saved, saving, onSave, onShare, shareStatus }: {
    course: DemoCourseDetailData;
    isMember: boolean;
    saved: boolean;
    saving: boolean;
    onSave: () => void;
    onShare: () => void;
    shareStatus: string;
}) {
    const examFocused = /exam|certification|pmp/i.test(`${course.title} ${course.category}`);
    const hours = Math.round(course.minutes / 6) / 10;

    return <section className="pm-course-detail-hero" aria-labelledby="pm-course-detail-title">
        <div className="pm-course-detail-cover">
            <img src={`/images/learning/course-${course.thumbnail}.webp`} alt="" decoding="async" />
            <span className="pm-course-detail-cover-label">{examFocused ? 'Exam prep' : course.category}</span>
            <span className="pm-course-detail-cover-caption"><BookOpenCheck size={16} aria-hidden="true" /> Self-paced study · No video</span>
        </div>
        <div className="pm-course-detail-heading">
            <div className="pm-course-detail-heading-top">
                <span className="pm-course-detail-category">{examFocused ? 'Certification Preparation' : course.category}</span>
                <div className="pm-course-detail-utility">
                    {isMember ? <button type="button" className="pm-course-detail-utility-action" onClick={onSave}
                        aria-pressed={saved} disabled={saving} aria-label={saved ? 'Remove saved course' : 'Save course'}>
                        <Bookmark size={19} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />{saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
                    </button> : <Link className="pm-course-detail-utility-action" href="/register" aria-label="Join to save this course"><Bookmark size={19} aria-hidden="true" /> Save</Link>}
                    <button type="button" className="pm-course-detail-utility-action" onClick={onShare}><Share2 size={18} aria-hidden="true" /> Share</button>
                </div>
            </div>
            <h1 id="pm-course-detail-title">{course.title}</h1>
            <p className="pm-course-detail-summary">{course.summary}</p>
            <div className="pm-course-detail-facts">
                <span><Clock3 size={18} aria-hidden="true" />{hours} hours estimated study</span>
                <span><GraduationCap size={18} aria-hidden="true" />{course.level}</span>
                <span><FileText size={18} aria-hidden="true" />{course.lessons.length} sample study notes</span>
            </div>
            <div className="pm-course-detail-tags"><span>{course.category}</span>{examFocused && <span>{/pmp/i.test(course.title) ? 'PMP®' : 'Exam Prep'}</span>}<span>{examFocused ? 'Exam Preparation' : course.accessTier === 'free' ? 'Free to enroll' : 'Plus & Pro included'}</span></div>
            {shareStatus && <p className="pm-course-detail-share-status" role="status">{shareStatus}</p>}
        </div>
    </section>;
}

export function CourseDetailOverview({ course }: { course: DemoCourseDetailData }) {
    const goals = course.objectives?.length ? course.objectives : course.lessons.map(lesson => lesson.title);
    const examFocused = /exam|certification|pmp/i.test(`${course.title} ${course.category}`);
    return <>
        <section className="pm-system-card pm-course-detail-card pm-course-detail-about" aria-labelledby="pm-course-about-title">
            <h2 id="pm-course-about-title">About this course</h2>
            <p>{course.overview || course.summary}</p>
            <p>{examFocused
                ? 'This self-paced course uses project management topics and practical scenarios to support independent study and exam preparation. There are no video lessons.'
                : 'Learn independently through structured topic notes and project management examples. There are no video lessons.'}</p>
        </section>
        <section className="pm-system-card pm-course-detail-card pm-course-detail-learn" aria-labelledby="pm-course-learn-title">
            <div className="pm-course-detail-learn-inner">
                <h2 id="pm-course-learn-title"><Target size={26} aria-hidden="true" /> What you’ll learn</h2>
                <ul>{goals.map(goal => <li key={goal}><Check size={19} aria-hidden="true" /> <span>{goal}</span></li>)}</ul>
            </div>
        </section>
    </>;
}

export function CourseDetailCurriculum({ course, canRead }: { course: DemoCourseDetailData; canRead: boolean }) {
    const sections = course.outline?.length ? course.outline
        : course.lessons.map(lesson => ({ title: lesson.title, topics: [lesson.title] }));

    return <section className="pm-system-card pm-course-detail-card pm-course-detail-curriculum" aria-labelledby="pm-course-curriculum-title">
        <div className="pm-course-detail-section-heading">
            <h2 id="pm-course-curriculum-title">Course Curriculum</h2>
            <span>{sections.length} sections · Self-paced</span>
        </div>
        <div className="pm-course-detail-accordion">
            {sections.map((section, index) => <details key={`${index}-${section.title}`} open={index === 0 ? true : undefined}>
                <summary><ChevronDown size={19} aria-hidden="true" /><strong>{index + 1}. {section.title}</strong><span>{section.topics.length} {section.topics.length === 1 ? 'topic' : 'topics'}</span></summary>
                <ul>{section.topics.map((topic, topicIndex) => <li key={`${topicIndex}-${topic}`}><ClipboardCheck size={17} aria-hidden="true" /><span>{index + 1}.{topicIndex + 1} {topic}</span></li>)}</ul>
            </details>)}
        </div>
        {canRead ? <div className="pm-course-detail-study-notes">
            <h3><BookOpenCheck size={21} aria-hidden="true" /> Your study notes</h3>
            <div className="pm-course-detail-note-list">{course.lessons.map((lesson, index) => <article key={`${index}-${lesson.title}`}><h4>{lesson.title}</h4><p>{lesson.body}</p></article>)}</div>
        </div> : <p className="pm-course-detail-locked-note"><LockKeyhole size={16} aria-hidden="true" /> Enroll with an eligible membership to read the study notes. The course outline is public.</p>}
    </section>;
}

export function CourseDetailExtraPanel({ active, course }: { active: Exclude<CourseDetailTab, 'overview' | 'curriculum'>; course: DemoCourseDetailData }) {
    if (active === 'practice' && course.slug === 'pmp-exam-preparation') {
        return <section className="pm-system-card pm-course-detail-card pm-course-detail-extra" aria-live="polite">
            <h2>Practice &amp; Exams</h2>
            <p>Try PMP-style timed practice questions with strike-through, highlighting, question review, and detailed explanations. A sample bank is available now to Plus and Pro members.</p>
            <Link href="/exams/pmp" className="pm-system-button">Open PMP Exam Simulator</Link>
        </section>;
    }
    const content = {
        practice: ['Practice & Exams', 'This demo catalog provides study topics and notes. Interactive practice exams and scored mock tests are not included at this stage.'],
        reviews: ['Reviews', 'No learner reviews are available for this course yet.'],
        questions: ['Q&A', 'Course questions and answers are not available in this demo catalog yet.'],
        resources: ['Resources', `The ${course.lessons.length} sample study notes are available after eligible enrollment. No downloadable resources are included in this demo.`],
    } satisfies Record<typeof active, [string, string]>;
    const [heading, copy] = content[active];
    return <section className="pm-system-card pm-course-detail-card pm-course-detail-extra" aria-live="polite"><h2>{heading}</h2><p>{copy}</p></section>;
}

export function CourseAccessCard({ course, isMember, isAuthenticated, eligible, enrolled, memberTier, submitting, onEnroll, onViewCurriculum }: {
    course: DemoCourseDetailData;
    isMember: boolean;
    isAuthenticated: boolean;
    eligible: boolean;
    enrolled: boolean;
    memberTier: 'free' | 'plus' | 'pro';
    submitting: boolean;
    onEnroll: () => void;
    onViewCurriculum: () => void;
}) {
    const included = course.accessTier === 'paid';
    const examFocused = /exam|certification|pmp/i.test(`${course.title} ${course.category}`);
    const canRead = isMember && enrolled && eligible;
    const joinHref = isAuthenticated ? '/join/step/2' : '/register';
    let action: ReactNode;
    let description: string;

    if (canRead) {
        description = 'Your enrollment is active. Study notes are ready below.';
        action = <button type="button" className="pm-system-button" onClick={onViewCurriculum}><BookOpenCheck size={18} aria-hidden="true" /> View curriculum</button>;
    } else if (!isMember) {
        description = included ? 'Join PM Circle and choose Plus or Pro to access this course.' : 'Join the community for free to enroll in this course.';
        action = <Link className="pm-system-button" href={joinHref}>{isAuthenticated ? 'Finish joining' : 'Join to enroll'}</Link>;
    } else if (!eligible) {
        description = 'This course is included with an active Plus or Pro membership. There is no separate course charge.';
        action = <Link className="pm-system-button" href="/membership">Explore Plus & Pro</Link>;
    } else {
        description = included ? `Included with your ${memberTier === 'plus' ? 'Plus' : 'Pro'} membership.` : 'Free for PM Circle community members.';
        action = <button type="button" className="pm-system-button" onClick={onEnroll} disabled={submitting} aria-busy={submitting}>
            <BookOpenCheck size={18} aria-hidden="true" />{submitting ? 'Enrolling…' : 'Enroll now'}
        </button>;
    }

    return <section className="pm-system-card pm-course-detail-card pm-course-detail-access" aria-label="Course enrollment">
        <span className="pm-course-detail-access-label">{canRead ? 'Enrolled' : included ? 'Plus & Pro' : 'Free course'}</span>
        <h2>{canRead ? 'Ready to study' : included ? 'Included with your membership' : 'Free for community members'}</h2>
        <p className="pm-course-detail-access-description">{description}</p>
        <div className="pm-course-detail-access-buttons">{action}<button type="button" className="pm-system-button pm-system-button-secondary" onClick={onViewCurriculum}>View course outline</button></div>
        <ul className="pm-course-detail-perks">
            <li><Clock3 size={19} aria-hidden="true" /> {examFocused ? 'Self-paced exam-focused study' : 'Self-paced project management study'}</li>
            <li><FileText size={19} aria-hidden="true" /> {course.lessons.length} guided sample study notes</li>
            <li><Layers3 size={19} aria-hidden="true" /> Structured curriculum overview</li>
            <li><Target size={19} aria-hidden="true" /> Project management scenarios</li>
            <li><ShieldCheck size={19} aria-hidden="true" /> {included ? 'Included in Plus & Pro' : 'Free member enrollment'}</li>
        </ul>
    </section>;
}

export function CourseProviderCard() {
    return <section className="pm-system-card pm-course-detail-card pm-course-detail-provider" aria-labelledby="pm-course-provider-title">
        <h2 id="pm-course-provider-title">Course provider</h2>
        <div className="pm-course-detail-provider-row">
            <span className="pm-course-detail-provider-mark" aria-hidden="true">PM</span>
            <div><strong>PM Circle</strong><span>Learn &amp; Practice</span></div>
            <Medal size={19} className="pm-course-detail-provider-check" aria-hidden="true" />
        </div>
        <p>Project management learning and exam-preparation study resources for the PM Circle community.</p>
        <p className="pm-course-detail-provider-foot"><Users size={16} aria-hidden="true" /> Available to eligible community members</p>
    </section>;
}
