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

/** Existing production routes are used; preview-only simulator destinations stay clearly labelled. */
export const homeExamCards = [
    { label: 'PMP', title: 'PMP Exam Simulator', description: 'Timed practice, question review, and performance by topic.', photo: 'exam', button: 'Try PMP practice', href: '/exam-simulator/pmp' },
    { label: 'CSM', title: 'CSM Exam Simulator', description: 'Practise Scrum concepts and review explanations after each attempt.', photo: 'scrum', button: 'Try CSM practice', href: '/simulators/scrum' },
    { label: 'PMI-PBA® · Preview', title: 'Business Analysis Exam Simulator', description: 'Practise requirements, stakeholder analysis and solution evaluation.', photo: 'stakeholder', button: 'View simulator', href: '/simulators/project' },
    { label: 'CAPM · Preview', title: 'CAPM Exam Simulator', description: 'Practise project management fundamentals and review answer explanations.', photo: 'foundations', button: 'View simulator', href: '/simulators/project' },
    { label: 'PMI-ACP · Preview', title: 'PMI-ACP Exam Simulator', description: 'Practise scenario-based questions on agile delivery and team collaboration.', photo: 'leader', button: 'View simulator', href: '/simulators/project' },
] as const;

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

export const homeAiCards = [
    { title: 'Explain exam answers', description: 'See why an answer is correct and ask follow-up questions after practice.', photo: 'review', href: '/exam-simulator/pmp' },
    { title: 'Review exam performance', description: 'Find weaker topics in your results and decide what to practise next.', photo: 'exam', href: '/exam-simulator/pmp' },
    { title: 'Build a study plan', description: 'Organise your exam preparation around your goals and available study time.', photo: 'foundations', href: '/learning' },
    { title: 'Improve a challenge response', description: 'Get feedback on your reasoning before trying another project scenario.', photo: 'feedback', href: '/daily-challenge' },
    { title: 'Get help while learning', description: 'Ask for explanations, examples, and practice prompts as you study.', photo: 'tutor', href: '/learning' },
    { title: 'Review with quick quizzes', description: 'Revisit a concept with short practice questions and explanations.', photo: 'leader', href: '/learning' },
    { title: 'Practise interviews', description: 'Rehearse project management interview answers and get feedback.', photo: 'stakeholder', href: '/register' },
    { title: 'Support community moderation', description: 'Flag posts for review so moderators can make informed decisions.', photo: 'moderation', href: '/community' },
] as const;

/** Keep approved admin customizations; replace only seed-era copy with reference copy. */
export const referenceText = (text: string | undefined, legacy: string, replacement: string) =>
    !text || text === legacy ? replacement : text;
