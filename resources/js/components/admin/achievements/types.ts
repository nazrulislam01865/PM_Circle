import type { AchievementBadge } from '@/components/achievements/types';
export type PublishStatus = 'active' | 'paused' | 'draft' | 'archived';
export type Badge = Omit<AchievementBadge, 'status' | 'value' | 'available' | 'earnedAt' | 'mode'> & {
    publishStatus: PublishStatus; version: number; mode: 'completion' | 'milestone'; art: string; description: string; targets: string[]; match: 'all' | 'any' | 'count'; required: number;
};
export type Work = { id: string; source: string; title: string; type: string; module: string; trigger: string; metrics: string[]; supported: boolean };
export type Metric = { value: string; label: string; category: string; supported: boolean };
export const root = '/admin/achievements';
export const editorHref = (badge?: string, query = '') => `${root}?view=editor${badge ? `&badge=${encodeURIComponent(badge)}` : ''}${query}`;
export const statusLabel: Record<PublishStatus, string> = { active: 'Active', paused: 'Paused', draft: 'Draft', archived: 'Archived' };
export const requirement = (badge: Badge) => badge.mode === 'completion' ? (badge.targets.length ? `${badge.match === 'all' ? 'All' : badge.match === 'any' ? 'Any one' : badge.target} of ${badge.targets.length} selected work` : 'Not assigned yet') : badge.metric === 'profile' ? `${badge.target}% profile completion` : `${badge.target} ${badge.unit}`;
export const assigned = (badge: Badge, work: Work) => badge.publishStatus !== 'archived' && (badge.mode === 'completion' ? badge.targets.includes(work.source) : work.metrics.includes(badge.metric));
export const memberBadge = (badge: Badge): AchievementBadge => ({ ...badge, status: 'earned', value: badge.target, available: true, earnedAt: null });
