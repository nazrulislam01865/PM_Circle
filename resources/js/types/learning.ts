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
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    minutes: number;
    thumbnail: number;
    accessTier: 'free' | 'paid';
    enrolled: boolean;
    saved: boolean;
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
