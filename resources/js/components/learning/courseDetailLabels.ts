import type { DemoCourseDetailData } from '@/types/learning';

type CourseLabelSource = Pick<DemoCourseDetailData, 'slug' | 'title' | 'category' | 'presentation'>;

export const isPmp = (course: CourseLabelSource) => course.slug === 'pmp-exam-preparation';
export const isExamCourse = (course: CourseLabelSource) => course.presentation ? course.presentation.type === 'Certification preparation' : isPmp(course) || /\b(?:exams?|certification|pmp)\b/i.test(`${course.title} ${course.category}`);

/** Course type above the title; distinct catalog topics below it. */
export function courseDetailLabels(course: CourseLabelSource) {
    const examFocused = isExamCourse(course);
    const type = course.presentation?.type ?? (examFocused ? 'Certification preparation' : 'Professional development');
    const candidates = course.presentation ? [course.category, ...course.presentation.tags] : [course.category, ...(examFocused ? (isPmp(course) ? ['PMP®', 'Exam Preparation'] : ['Exam Preparation']) : [])];
    const normalize = (label: string) => label.trim().replace(/\s+/g, ' ').toLowerCase();
    const seen = new Set([normalize(type)]);
    const topics = candidates.map(label => label.trim()).filter(label => {
        const key = normalize(label);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return { type, topics };
}
