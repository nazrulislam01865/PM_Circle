import { Gift } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { HomepagePresentation } from '@/types/homepage-presentation';
import type { RewardPromotionData } from '@/types/reward';
import { useRewardOfferDialog } from '@/components/rewards/RewardOfferDialog';
import { HomePhoto } from './HomePhoto';
import { HomeAction, HomeCarouselControls, HomeSectionTitle, moveCard } from './HomeUi';
import { sampleCourses, type HomeCourseCard } from './reference';

export function HomeCertification({ content, promotion }: { content: HomepagePresentation['certification']; promotion: RewardPromotionData | null }) {
    const scroller = useRef<HTMLDivElement>(null);
    const openOffer = useRewardOfferDialog();
    return <section className="pm-v2-section pm-v2-certifications pm-v2-container" aria-labelledby="pm-pathway-exams-title" id="pm-v2-exams">
        <HomeSectionTitle id="pm-pathway-exams-title" title={content.heading} description={content.description} action={content.button_label} href={content.button_url}/>
        {promotion && <div className="pm-v2-reward"><div className="pm-v2-reward-icon"><Gift aria-hidden="true"/></div><div>
            <strong>Complete your profile. Get {promotion.discountLabel.replace(/\s+off$/i, '')} off.</strong>
            <p>Reach 100% profile completion to receive a discount code for any PM Circle Exam Simulator.</p>
        </div><button type="button" className="pm-v2-button" onClick={() => openOffer?.()}>See how it works</button></div>}
        <HomeCarouselControls label="exam cards" previous={() => moveCard(scroller, -1)} next={() => moveCard(scroller, 1)}/>
        <div className="pm-v2-card-track pm-v2-exam-track" ref={scroller} tabIndex={0} role="region" aria-label="Certification simulators">
            {content.items.map((card, index) => <article className="pm-v2-image-card pm-v2-exam-card" data-home-card key={index}>
                    <HomePhoto photo={card.photo} alt="" className="pm-v2-card-image" source={card.image}/>
                    <div className="pm-v2-card-content"><span className="pm-v2-category">{card.label}</span><h3>{card.title}</h3><p>{card.description}</p>
                        <HomeAction href={card.href} primary={index === 0}>{card.button}</HomeAction>
                    </div></article>)}
        </div>
    </section>;
}

function formatCourseTime(minutes: number): string {
    return minutes > 0 && minutes % 60 === 0 ? `${minutes / 60} ${minutes === 60 ? 'hour' : 'hours'}` : `${minutes} minutes`;
}

export function HomeCourses({ courses, content, isDemo }: { courses: HomeCourseCard[]; content: HomepagePresentation['courses']; isDemo: boolean }) {
    const [level, setLevel] = useState('All levels');
    const scroller = useRef<HTMLDivElement>(null);
    const isSample = isDemo && courses.length === 0;
    const entries = isSample ? sampleCourses.slice(0, content.limit) : courses;
    const levels = ['All levels', 'Beginner', 'Intermediate', 'Advanced'];
    for (const course of entries) {
        if (course.level && !levels.some(item => item.toLowerCase() === course.level.toLowerCase())) levels.push(course.level);
    }
    const filtered = useMemo(() => level === 'All levels' ? entries : entries.filter(course => course.level?.toLowerCase() === level.toLowerCase()), [entries, level]);
    return <section className="pm-v2-section pm-v2-container pm-v2-course-section" id="pm-v2-courses" aria-labelledby="pm-v2-course-title">
        <HomeSectionTitle id="pm-v2-course-title" title={content.heading} description={content.description}
            href={content.button_url} action={content.button_label}/>
        <div className="pm-v2-filter-row" role="group" aria-label="Filter courses by experience level">
            {levels.map(option => <button type="button" key={option}
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
                    <HomeAction href={course.slug ? `/learning/courses/${encodeURIComponent(course.slug)}` : '/learning'}>{content.card_button}</HomeAction>
                </div>
            </article>)}
        </div>
        {filtered.length === 0 && <p className="pm-v2-empty">{content.empty_message}</p>}
    </section>;
}
