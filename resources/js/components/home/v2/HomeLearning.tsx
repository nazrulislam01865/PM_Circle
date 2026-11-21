import { Link } from '@inertiajs/react';
import { Gift } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { HomePathwayContent } from '@/types/home';
import type { RewardPromotionData } from '@/types/reward';
import { HomePhoto } from './HomePhoto';
import { HomeAction, HomeCarouselControls, HomeSectionTitle, moveCard } from './HomeUi';
import { homeExamCards, referenceText, sampleCourses, type HomeCourseCard } from './reference';

export function HomeCertification({ content, promotion }: { content?: HomePathwayContent['exams']; promotion: RewardPromotionData | null }) {
    const scroller = useRef<HTMLDivElement>(null);
    return <section className="pm-v2-section pm-v2-certifications pm-v2-container" aria-labelledby="pm-pathway-exams-title" id="pm-v2-exams">
        <HomeSectionTitle id="pm-pathway-exams-title" title={referenceText(content?.heading, 'Practise today. Prepare for your next certification.', 'Prepare for your certification')}
            description={referenceText(content?.description, 'Explore exam simulators for your next professional milestone.', 'Practise under exam conditions, then review the answers and find your weak areas.')}
            action={referenceText(content?.compare_label, 'Compare plans', 'Compare plans')} href={content?.compare_url || '/pricing'}/>
        {promotion && <div className="pm-v2-reward"><div className="pm-v2-reward-icon"><Gift aria-hidden="true"/></div><div>
            <strong>Complete your profile. Get {promotion.discountLabel} off.</strong>
            <p>Reach 100% profile completion to receive a discount code for any PM Circle Exam Simulator.</p>
        </div><HomeAction href="/register">See how it works</HomeAction></div>}
        <HomeCarouselControls label="exam cards" previous={() => moveCard(scroller, -1)} next={() => moveCard(scroller, 1)}/>
        <div className="pm-v2-card-track pm-v2-exam-track" ref={scroller} tabIndex={0} role="region" aria-label="Certification simulators">
            {homeExamCards.map((card, index) => {
                const admin = content?.items?.[index];
                const title = admin && !['PMP Exam Simulator', 'CSM Exam Simulator', 'Project Simulation'].includes(admin.title) ? admin.title : card.title;
                const description = admin && ![
                    'Practise project management decisions under exam-style conditions.',
                    'Build your Scrum knowledge and practise for your certification assessment.',
                    'Explore real-world project situations and practise making decisions.',
                    '',
                ].includes(admin.description) ? admin.description : card.description;
                return <article className="pm-v2-image-card pm-v2-exam-card" data-home-card key={card.label}>
                    <HomePhoto photo={card.photo} alt="" className="pm-v2-card-image" source={admin?.icon_image}/>
                    <div className="pm-v2-card-content"><span className="pm-v2-category">{card.label}</span><h3>{title}</h3><p>{description}</p>
                        <HomeAction href={admin?.button_url && admin.button_url !== '/learning' ? admin.button_url : card.href} primary={index === 0}>{admin?.button_label && !['Try PMP practice', 'Try CSM practice', 'Explore simulations', 'Start exam'].includes(admin.button_label) ? admin.button_label : card.button}</HomeAction>
                    </div></article>;
            })}
        </div>
    </section>;
}

function formatCourseTime(minutes: number): string {
    return minutes > 0 && minutes % 60 === 0 ? `${minutes / 60} ${minutes === 60 ? 'hour' : 'hours'}` : `${minutes} minutes`;
}

export function HomeCourses({ courses }: { courses: HomeCourseCard[] }) {
    const [level, setLevel] = useState('All levels');
    const scroller = useRef<HTMLDivElement>(null);
    const isSample = courses.length === 0;
    const entries = isSample ? sampleCourses : courses;
    const filtered = useMemo(() => level === 'All levels' ? entries : entries.filter(course => course.level?.toLowerCase() === level.toLowerCase()), [entries, level]);
    return <section className="pm-v2-section pm-v2-container pm-v2-course-section" id="pm-v2-courses" aria-labelledby="pm-v2-course-title">
        <HomeSectionTitle id="pm-v2-course-title" title="Learn at your level" description="Start with the fundamentals or practise the skills you need for your next role."
            href="/learning" action="Find my starting point"/>
        <div className="pm-v2-filter-row" role="group" aria-label="Filter courses by experience level">
            {['All levels', 'Beginner', 'Intermediate', 'Advanced'].map(option => <button type="button" key={option}
                className={level === option ? 'is-active' : ''} aria-pressed={level === option}
                onClick={() => { setLevel(option); scroller.current?.scrollTo({ left: 0, behavior: 'smooth' }); }}>{option}</button>)}
        </div>
        <HomeCarouselControls label="courses" previous={() => moveCard(scroller, -1)} next={() => moveCard(scroller, 1)}/>
        {isSample && <p className="sr-only">Sample course previews. See the course library for currently available courses.</p>}
        <div className="pm-v2-card-track pm-v2-course-track" ref={scroller} tabIndex={0} role="region" aria-label="Courses">
            {filtered.map((course, index) => <article className="pm-v2-image-card pm-v2-course-card" data-home-card key={course.slug || `${course.title}-${index}`}>
                {course.coverUrl ? <img className="pm-v2-card-image" src={course.coverUrl} loading="lazy" decoding="async" alt="" />
                    : <HomePhoto photo={course.photo || sampleCourses[index % sampleCourses.length].photo!} alt="" className="pm-v2-card-image"/>}
                <div className="pm-v2-card-content"><span className="pm-v2-category">{course.level || 'All levels'}</span><h3>{course.title}</h3>
                    <p>{course.summary}</p><small>{course.lessons ? `${course.lessons} lessons · ` : ''}{formatCourseTime(course.minutes)}</small>
                    <HomeAction href={course.slug ? `/learning/courses/${encodeURIComponent(course.slug)}` : '/learning'}>View course</HomeAction>
                </div>
            </article>)}
        </div>
        {filtered.length === 0 && <p className="pm-v2-empty">No courses match this level yet. Choose another level or explore the full library.</p>}
    </section>;
}
