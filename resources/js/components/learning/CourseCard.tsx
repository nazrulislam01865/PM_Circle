import { Link } from '@inertiajs/react';
import { Bookmark, CheckCircle2, Clock3, LockKeyhole, Play, type LucideIcon } from 'lucide-react';

export type CatalogCard = {
    id: string;
    slug?: string;
    title: string;
    description: string;
    category: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels';
    minutes: number;
    thumbnail: number;
    accessTier: string;
    progress: number;
    href: string;
    action: string;
    activityCount?: number;
    available?: boolean;
    enrolled?: boolean;
    saveType?: 'course' | 'path';
};

type CourseCardProps = {
    course: CatalogCard;
    saved: boolean;
    listView?: boolean;
    saving?: boolean;
    onToggleSave?: (course: CatalogCard) => void;
    onEnroll?: (course: CatalogCard) => void;
    enrolling?: boolean;
};

/** Reusable course, path and practice card. Navigation and saving use existing Laravel endpoints. */
export function CourseCard({ course, saved, listView = false, saving = false, onToggleSave, onEnroll, enrolling = false }: CourseCardProps) {
    const free = course.accessTier === 'free';
    const available = course.available !== false;
    const duration = course.minutes >= 60 ? `${Math.round(course.minutes / 6) / 10} hours` : `${course.minutes} min`;
    const actionIcon: LucideIcon = course.progress > 0 ? CheckCircle2 : Play;
    const ActionIcon = actionIcon;

    return <article className={`pm-catalog-course${listView ? ' is-list' : ''}`}>
        <Link href={course.href} className="pm-catalog-course-cover" aria-label={`View ${course.title}`}>
            <img src={`/images/learning/course-${course.thumbnail}.webp`} alt="" loading="lazy" decoding="async" />
            <span className={`pm-catalog-course-badge${free ? ' is-free' : ''}`}>
                {!free && <LockKeyhole size={12} aria-hidden="true" />}{available ? (free ? 'Free' : course.accessTier === 'paid' ? 'Paid' : course.accessTier.toUpperCase()) : 'Coming soon'}
            </span>
        </Link>
        <div className="pm-catalog-course-info">
            <div className="pm-catalog-course-copy">
                <Link className="pm-catalog-course-title" href={course.href}>{course.title}</Link>
                <p>{course.description}</p>
            </div>
            <div className="pm-catalog-course-metadata">
                <span><Clock3 size={15} aria-hidden="true" /> {course.minutes ? duration : available ? 'Self-paced' : 'Not available yet'}</span>
                <span>{course.level}</span>
            </div>
            {course.progress > 0 && <div className="pm-catalog-course-progress" role="progressbar" aria-label={`${course.title} progress`} aria-valuenow={course.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${course.progress}%` }} /></div>}
            <div className="pm-catalog-course-footer">
                {onEnroll && !course.enrolled ? <button type="button" className="pm-catalog-course-action" disabled={enrolling} onClick={() => onEnroll(course)}><ActionIcon size={16} aria-hidden="true" />{enrolling ? 'Enrolling…' : 'Enroll free'}</button>
                    : <Link href={course.href} className="pm-catalog-course-action"><ActionIcon size={16} aria-hidden="true" />{course.action}</Link>}
                {course.slug && onToggleSave && <button type="button" className={`pm-catalog-bookmark${saved ? ' is-saved' : ''}`} disabled={saving} aria-label={saved ? `Remove saved item for ${course.title}` : `Save ${course.title}`} aria-pressed={saved} title={saved ? 'Remove saved item' : 'Save item'} onClick={() => onToggleSave(course)}><Bookmark size={21} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" /></button>}
            </div>
        </div>
    </article>;
}
