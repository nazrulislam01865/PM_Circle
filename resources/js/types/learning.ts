import type { DashboardShellData } from './dashboard';
export type LearningShell = DashboardShellData;
export type LearningPathCardData = {
    slug: string; level: string; title: string; summary: string;
    moduleCount: number; practiceCount: number; completed: number;
    total: number; progress: number; minutes: number; saved: boolean; accessTier: string;
};
export type LearningCourseCardData = {
    id: number; slug: string; modulePosition: number; firstActivityPosition: number;
    mcqPosition: number | null; mcqMinutes: number | null; mcqCompleted: boolean;
    title: string; summary: string; pathTitle: string;
    level: string; minutes: number; activityCount: number; completed: number;
    progress: number; accessTier: string; saved: boolean;
};
export type DemoCourseData = {
    slug: string;
    title: string;
    summary: string;
    category: string;
    level: string;
    minutes: number;
    thumbnail: number;
    coverUrl?: string | null;
    accessTier: 'free' | 'paid';
    rating?: number | null; reviewCount?: number; learnerCount?: number;
    enrolled: boolean;
    saved: boolean;
};
export type CoursePresentation = { type: string; tags: string[]; provider_name: string; provider_description: string; faq: {question: string; answer: string}[]; practice_examples: {question: string; answer: string}[] };
export type CourseReview = { id: number; rating: number; body: string };
export type OwnCourseReview = { rating: number; body: string; is_published: boolean };
export type DemoCourseDetailData = Omit<DemoCourseData, 'enrolled' | 'saved'> & {
    lessons: { title: string; body: string | null; hasVideo?: boolean; sectionTitle?: string | null; topicTitle?: string | null }[];
    presentation?: CoursePresentation;
    overview?: string;
    objectives?: string[];
    outline?: { title: string; topics: string[] }[];
};
export type CoursePracticeSettings = {
    enabled: boolean; questionCount: number; durationMinutes: number; available: number;
    sections: { title: string; available: number; topics: { title: string; available: number }[] }[];
};
export type CourseResourceData = {
    id: number; title: string; section: string; lessonTitle?: string | null; description: string | null;
    kind: 'link' | 'file';
};
export const demoCourseHref = (slug: string) => `/learning/courses/${encodeURIComponent(slug)}`;
export type LearningActivityData = {
    position: number; type: 'lesson' | 'mcq' | 'short_answer' | 'scenario';
    title: string; minutes?: number; completed: boolean;
};
export type LearningModuleData = {
    position: number; title: string; summary: string; minutes: number;
    activities: LearningActivityData[]; completed: number; done: boolean;
};
export type LearningPathData = {
    slug: string; level: string; title: string; summary: string; introduction: string;
    objectives: string[]; moduleCount: number; practiceCount: number;
    minutes: number; saved: boolean; completedModules: number;
    modules: LearningModuleData[];
};
export type LearningActivityDetail = {
    position: number; type: LearningActivityData['type']; title: string;
    content: string; completed: boolean; response: string | null;
    payload: { options: string[] } | null;
};
export type LearningQuestionData = {
    position: number; total: number; prompt: string; choices: Record<string,string>;
    selected: string | null; isCorrect: boolean | null; explanation: string | null;
};
export const learningPathHref = (slug: string) => `/learning/${slug}`;
export const learningActivityHref = (slug: string, module: number, activity: number) =>
    `${learningPathHref(slug)}/modules/${module}/activities/${activity}`;

export type CourseLessonSummary = { position: number; title: string; completed: boolean; hasVideo?: boolean };
export type CourseLessonProgress = { lessons: CourseLessonSummary[]; completed: number; total: number; percent: number; next: number };
export type EnrolledCourse = Omit<DemoCourseData, 'enrolled' | 'saved'> & Omit<CourseLessonProgress, 'lessons'> & { eligible: boolean; certificate: string | null };
export type CourseCertificate = { reference: string; memberName: string; courseTitle: string; issuedAt: string };
export type CourseLesson = CourseLessonSummary & { key: string; body: string; video_url?: string | null; takeaway?: string | null; when_to_apply?: string | null; example?: string | null; application?: string | null; references?: string | null; faq?: { question: string; answer: string }[] };
export const courseLearningRoot = (url: string) => url.startsWith('/dashboard/learning') ? '/dashboard/learning' : '/learning';
export const courseLessonHref = (root: string, slug: string, position: number) => `${root}/courses/${encodeURIComponent(slug)}/lessons/${position}`;
