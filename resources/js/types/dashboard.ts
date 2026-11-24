import type { ProfileRewardData } from '@/types/reward';

export type DashboardPlan = 'free' | 'premium' | 'pro';
export type DashboardTab = 'all' | 'following' | 'mine' | 'saved' | 'hidden' | 'restricted';
export type DashboardPost = {
    id: number; title: string | null; body: string; image_path?: string | null; topic: string;
    is_anonymous?: boolean; visibility?: string; author: string; authorId?: number | null; authorHasPublicProfile?: boolean; authorProfileUrl?: string | null; authorRole: string | null; authorAvatar?: string | null; publishedAt: string | null;
    comments: number; reactions: number; reactionBreakdown?: import('@/components/community/PostReactions').ReactionCounts;
    saved: boolean; hidden?: boolean; isOwner?: boolean; isMuted?: boolean; pollOptions?: { id: number; label: string; votes_count: number }[]; viewerVote?: number | null; reaction: import('@/components/home/HomeEngagement').ReactionType | null;
};
export type DashboardData = {
    plan: DashboardPlan; isDemo: boolean; isPreview: boolean;
    member: { id: number; name: string; role: string | null; avatar_path?: string | null; completion: number };
    reward: ProfileRewardData | null;
    scenario: { id: number; slug: string; title: string; summary: string } | null;
    learning: { time: string; scenarios: number; level: number; lessonProgress: string };
    overview: {
        badges: { key: 'first-post' | 'first-reply' | 'first-scenario'; label: string }[];
        insights: { last30: number; thisWeek: number };
        contribution: { posts: number; replies: number; responses: number };
        syllabus: { name: string; status: string };
    };
    postChecks: import('@/components/community/PostCheckCard').PostCheckFeedData;
    posts: DashboardPost[]; feedTab: DashboardTab;
    feedScopeCounts: import('@/components/community/FeedScopeTabs').FeedScopeCounts;
    feedPage: { next_cursor: string | null; has_more: boolean };
    virtualFeedEnabled: boolean;
};

/** Minimal authenticated chrome props for feature pages. */
export type DashboardShellData = Pick<DashboardData, "plan" | "isDemo" | "member"> & { featureAccess?: { examSimulator: boolean; pmp: boolean; resume: boolean; resumeMinimum: string } };
