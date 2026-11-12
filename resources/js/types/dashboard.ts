export type DashboardPlan = 'free' | 'premium' | 'pro';
export type DashboardTab = 'all' | 'following' | 'mine';
export type DashboardPost = {
    id: number; title: string | null; body: string; image_path?: string | null; topic: string;
    is_anonymous?: boolean; visibility?: string; author: string; authorRole: string | null; authorAvatar?: string | null; publishedAt: string | null;
    comments: number; reactions: number;
    saved: boolean; isOwner?: boolean; isMuted?: boolean; pollOptions?: { id: number; label: string; votes_count: number }[]; viewerVote?: number | null; reaction: import('@/components/home/HomeEngagement').ReactionType | null;
};
export type DashboardData = {
    plan: DashboardPlan; isDemo: boolean; isPreview: boolean;
    member: { id: number; name: string; role: string | null; avatar_path?: string | null; completion: number };
    scenario: { id: number; slug: string; title: string; summary: string } | null;
    learning: { time: string; scenarios: number; level: number; lessonProgress: string };
    overview: {
        badges: { key: 'first-post' | 'first-reply' | 'first-scenario'; label: string }[];
        insights: { last30: number; thisWeek: number };
        contribution: { posts: number; replies: number; responses: number };
        syllabus: { name: string; status: string };
    };
    posts: DashboardPost[]; feedTab: DashboardTab;
    feedPage: { next_cursor: string | null; has_more: boolean };
    virtualFeedEnabled: boolean;
};

/** Minimal authenticated chrome props for feature pages. */
export type DashboardShellData = Pick<DashboardData, "plan" | "isDemo" | "member">;
