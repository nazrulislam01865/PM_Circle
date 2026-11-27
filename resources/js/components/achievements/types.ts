import type { CourseCertificate } from '@/types/learning';

export type BadgeStatus = 'earned' | 'progress' | 'locked';
export type AchievementBadge = {
    id: string; name: string; category: string; metric: string; unit: string; target: number; tier: number;
    art?: string; artworkUrl?: string | null; mode?: string; description?: string; targetLabels?: string[];
    newBadge: boolean; value: number; available: boolean; status: BadgeStatus; earnedAt: string | null;
};
export type AchievementPath = { id: number; title: string; slug: string; completedActivities: number; totalActivities: number };
export type AchievementRecord = { id: string; type: string; name: string; detail: string; date: string };
export type AchievementSnapshot = { certificates: CourseCertificate[]; badges: AchievementBadge[]; metrics: Record<string, number>; latest: AchievementBadge[]; paths: AchievementPath[]; records: AchievementRecord[]; recordLimit: number };
export type AchievementMember = { name: string; role: string | null; location: string; avatar: string | null };
