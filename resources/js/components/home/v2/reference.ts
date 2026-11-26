/** Visual/content fallback from the approved public homepage reference.
 * Keep imagery central so local, administrator-managed images can replace it later.
 * The project-owner-provided screenshot crops are self-hosted to avoid broken external images.
 */
export const referencePhotos = {
    exam: 'exam.webp', scrum: 'scrum.webp', stakeholder: 'stakeholder.webp',
    foundations: 'foundations.webp', leader: 'leader.webp', review: 'review.webp',
    feedback: 'feedback.webp', tutor: 'tutor.webp', moderation: 'moderation.webp',
    'hero-community': 'hero-community.webp',
} as const;

export type ReferencePhotoKey = keyof typeof referencePhotos;

export const photoFallbacks: Record<ReferencePhotoKey, string> = {
    exam: '/images/exam/public/pmp-hero-people.webp',
    scrum: '/images/learning/course-2.webp',
    stakeholder: '/images/learning/course-3.webp',
    foundations: '/images/learning/course-1.webp',
    leader: '/images/learning/course-5.webp',
    review: '/images/dashboard/practice-notebook.webp',
    feedback: '/images/learning/course-6.webp',
    tutor: '/images/learning/course-8.webp',
    moderation: '/images/learning/course-3.webp',
    'hero-community': '/images/exam/public/pmp-hero-people.webp',
};

export type HomeCourseCard = {
    slug?: string; title: string; summary: string; level: string;
    minutes: number; lessons?: number; coverUrl?: string | null; photo?: ReferencePhotoKey;
};

export const sampleCourses: HomeCourseCard[] = [
    { title: 'Project Management Foundations', summary: 'Define scope, plan the work, and run your first project with confidence.', level: 'Beginner', minutes: 120, lessons: 6, photo: 'foundations' },
    { title: 'Stakeholder Management', summary: 'Handle competing requests and keep decisions visible.', level: 'Intermediate', minutes: 180, lessons: 8, photo: 'stakeholder' },
    { title: 'Communication for Project Leaders', summary: 'Lead difficult conversations and present trade-offs clearly.', level: 'Advanced', minutes: 90, lessons: 5, photo: 'leader' },
    { title: 'Agile and Scrum Fundamentals', summary: 'Learn Scrum roles, events, and how an Agile team plans its work.', level: 'Beginner', minutes: 120, lessons: 7, photo: 'scrum' },
    { title: 'Project Risk Management', summary: 'Identify risks, assess their impact, and plan practical responses.', level: 'Intermediate', minutes: 180, lessons: 8, photo: 'review' },
];

