import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { CourseWorkspace, CourseWorkspaceEmpty, EnrolledCourseCard } from '@/components/learning/CourseWorkspace';
import { courseLearningRoot, type EnrolledCourse } from '@/types/learning';

const filters = ['All courses', 'In progress', 'Completed'] as const;
export default function MyLearning({ courses, isMember }: { courses: EnrolledCourse[]; isMember: boolean }) {
    const page = usePage<{auth?: {user?: {settings?: {study_goal?: string}} | null}}>();
    const root = courseLearningRoot(page.url);
    const goal = page.props.auth?.user?.settings?.study_goal;
    const [filter, setFilter] = useState<(typeof filters)[number]>('All courses');
    const shown = courses.filter(course => { const done = course.total > 0 && course.completed === course.total; return filter === 'All courses' || (filter === 'Completed' ? done : !done); });
    return <CourseWorkspace title="My Learning" description="Continue a course or revisit one you have completed."><Head title="My Learning"/>
        <div className="pm-my-learning-toolbar">
            {isMember && goal && <p className="pm-learn-v3-meta pm-course-study-target">Weekly study target: <strong>{goal}</strong></p>}
            <nav className="pm-course-workspace-filters" aria-label="Filter enrolled courses">{filters.map(item => <button className={`pm-learn-v3-chip${filter === item ? ' is-active' : ''}`} type="button" aria-pressed={filter === item} key={item} onClick={() => setFilter(item)}>{item}</button>)}</nav>
        </div>
        {shown.length ? <div className="pm-course-workspace-grid">{shown.map(course => <EnrolledCourseCard course={course} root={root} key={course.slug}/>)}</div> : <CourseWorkspaceEmpty isMember={isMember} title={isMember ? filter === 'All courses' ? 'No enrolled courses yet' : 'No matching courses' : 'Sign in to see your learning'} description={isMember ? 'Browse courses to find your next learning opportunity.' : 'Join PM Circle to enroll in courses and track your progress.'}/>}
    </CourseWorkspace>;
}
