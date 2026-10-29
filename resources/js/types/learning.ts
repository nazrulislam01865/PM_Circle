import type { DashboardShellData } from './dashboard';
export type LearningShell = DashboardShellData;
export type LearningPathCardData = {
    slug: string; level: string; title: string; summary: string;
    moduleCount: number; practiceCount: number; completed: number;
    total: number; progress: number; accessTier: string;
};
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
