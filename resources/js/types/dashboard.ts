export type DashboardPlan = 'free' | 'premium' | 'pro';
export type DashboardTab = 'for-you' | 'following';
export type DashboardPost = {
    id: number; title: string | null; body: string; topic: string;
    author: string; authorRole: string | null; publishedAt: string | null;
    likes: number; claps: number; comments: number; shares: number;
    saved: boolean; reaction: 'like' | 'love' | null;
};
export type DashboardData = {
    plan: DashboardPlan; isDemo: boolean; isPreview: boolean;
    member: { name: string; role: string | null; completion: number };
    scenario: { id: number; slug: string; title: string; summary: string } | null;
    learning: { time: string; scenarios: number; level: number; lessonProgress: string };
    posts: DashboardPost[]; feedTab: DashboardTab;
};

/** Minimal authenticated chrome props for feature pages. */
export type DashboardShellData = Pick<DashboardData, "plan" | "isDemo" | "member">;
