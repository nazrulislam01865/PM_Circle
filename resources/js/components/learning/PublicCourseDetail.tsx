import { Link } from '@inertiajs/react';
import { Bookmark, Share2 } from 'lucide-react';
import type { DemoCourseDetailData, CoursePracticeSettings, CourseResourceData } from '@/types/learning';
import { CourseDetailPracticePanel, CourseDetailResourcesPanel } from './CourseDetail';

/** Public course view: layout follows the approved course-details prototype.
 *  Enrollment and practice callbacks stay in CourseShow, which owns the existing backend actions.
 */
type Props = {
    course: DemoCourseDetailData;
    isMember: boolean;
    isAuthenticated: boolean;
    eligible: boolean;
    enrolled: boolean;
    memberTier: 'free' | 'plus' | 'pro';
    submitting: boolean;
    saved: boolean;
    saving: boolean;
    shareStatus: string;
    practice: CoursePracticeSettings;
    resources: CourseResourceData[];
    onEnroll: () => void;
    onSave: () => void;
    onShare: () => void;
};

function CoursePublicEnrollment({ course, isMember, isAuthenticated, eligible, enrolled, memberTier, submitting, onEnroll }: Pick<Props, 'course' | 'isMember' | 'isAuthenticated' | 'eligible' | 'enrolled' | 'memberTier' | 'submitting' | 'onEnroll'>) {
    const canRead = isMember && enrolled && eligible;
    const paid = course.accessTier !== 'free';
    if (canRead) return <><a className="pm-guide-button" href="#course-curriculum">View curriculum</a><p>Your enrollment is active. Continue learning below.</p></>;
    if (!isMember) return <><Link className="pm-guide-button" href={isAuthenticated ? '/join/step/2' : '/register'}>Join to start learning</Link><p>Course outline is public. Sign up to continue.</p></>;
    if (!eligible) return <><Link className="pm-guide-button" href="/membership">{course.accessTier === 'pro' ? 'Explore Pro' : 'Explore Plus & Pro'}</Link><p>{course.accessTier === 'pro' ? 'This course requires Pro membership.' : 'This course is included with Plus or Pro membership.'}</p></>;
    return <><button type="button" className="pm-guide-button" onClick={onEnroll} disabled={submitting} aria-busy={submitting}>{submitting ? 'Enrolling…' : 'Enroll to start learning'}</button><p>{paid ? `Included with your ${memberTier === 'plus' ? 'Plus' : 'Pro'} membership.` : 'Free for PM Circle community members.'}</p></>;
}

export function PublicCourseDetail(props: Props) {
    const { course, isMember, eligible, enrolled, saved, saving, shareStatus, practice, resources, onSave, onShare } = props;
    const canRead = isMember && enrolled && eligible;
    const goals = course.objectives?.length ? course.objectives : course.lessons.map(lesson => lesson.title);
    const sections = course.outline?.length ? course.outline : course.lessons.map(lesson => ({ title: lesson.title, topics: [lesson.title] }));
    const duration = course.minutes > 0 ? `${Number((course.minutes / 60).toFixed(1))} ${course.minutes === 60 ? 'hour' : 'hours'}` : 'Self-paced';
    const cover = course.coverUrl || `/images/learning/course-${course.thumbnail}.webp`;

    return <div className="pm-course-public" id="course-details">
        <div className="pm-course-public-wrap">
            <nav className="pm-course-public-crumb" aria-label="Breadcrumb"><Link href="/learning">Learn &amp; Practice</Link><span aria-hidden="true">/</span><span aria-current="page">Course details</span></nav>
            <div className="pm-course-public-layout">
                <div className="pm-course-public-main">
                    <header className="pm-course-public-heading">
                        <div className="pm-course-public-eyebrow"><span className={`pm-course-public-access${course.accessTier === 'free' ? ' is-free' : ' is-paid'}`}>{course.accessTier === 'free' ? 'Free' : course.accessTier === 'pro' ? 'Pro' : 'Plus & Pro'}</span><span aria-hidden="true">·</span><span>{course.category}</span></div>
                        <h1>{course.title}</h1>
                        <p>{course.summary}</p>
                        <nav aria-label="On this page" className="pm-course-public-anchor-links"><a href="#course-learn">What you'll learn</a><a href="#course-curriculum">Curriculum</a><a href="#course-audience">Who it’s for</a></nav>
                    </header>

                    <section className="pm-course-public-section" id="course-learn" aria-labelledby="course-learn-title">
                        <h2 id="course-learn-title">What you’ll learn</h2>
                        <ul className="pm-course-public-goals">{goals.map((goal, index) => <li key={`${index}-${goal}`}>{goal}</li>)}</ul>
                    </section>

                    <section className="pm-course-public-section" id="course-curriculum" aria-labelledby="course-curriculum-title">
                        <h2 id="course-curriculum-title">Course curriculum</h2>
                        <p className="pm-course-public-meta">{course.lessons.length} lessons · {duration} · {sections.length} {sections.length === 1 ? 'module' : 'modules'}</p>
                        <div className="pm-course-public-modules">{sections.map((section, index) => <details key={`${index}-${section.title}`}>
                            <summary>Module {index + 1} · {section.title}</summary>
                            <ul>{section.topics.map((topic, topicIndex) => <li key={`${topicIndex}-${topic}`}>{topic}</li>)}</ul>
                        </details>)}</div>
                        {canRead && <section className="pm-course-public-study" aria-label="Enrolled course study notes"><h3>Your study notes</h3>{course.lessons.map((lesson, index) => <article key={`${index}-${lesson.title}`}><h4>{lesson.title}</h4><p>{lesson.body}</p></article>)}</section>}
                    </section>

                    <section className="pm-course-public-section" id="course-audience" aria-labelledby="course-audience-title">
                        <h2 id="course-audience-title">Who it’s for</h2>
                        <p>People looking to build practical skills in this area. Bring a real or sample project to use in the exercises.</p>
                    </section>

                    {isMember && <div className="pm-course-public-member-tools">
                        <div className="pm-course-public-utilities"><button type="button" className="pm-guide-button is-outline" onClick={onSave} disabled={saving} aria-pressed={saved}><Bookmark size={16} aria-hidden="true" />{saving ? 'Saving…' : saved ? 'Saved course' : 'Save course'}</button><button type="button" className="pm-guide-button is-outline" onClick={onShare}><Share2 size={16} aria-hidden="true"/> Share</button></div>
                        {shareStatus && <p role="status">{shareStatus}</p>}
                        {canRead && <><CourseDetailPracticePanel course={course} practice={practice} canRead={canRead}/><CourseDetailResourcesPanel course={course} resources={resources} canRead={canRead}/></>}
                    </div>}
                </div>
                <aside className="pm-course-public-aside" aria-label="Course at a glance">
                    <img src={cover} alt="" className="pm-course-public-cover" decoding="async" />
                    <h2>Course at a glance</h2>
                    <p className="pm-course-public-duration">{course.lessons.length} lessons · {duration}</p>
                    <div className="pm-course-public-enrollment"><CoursePublicEnrollment {...props}/></div>
                </aside>
            </div>
        </div>
    </div>;
}
