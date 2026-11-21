export type DashboardMetric = { value: number; current?: number; note: string; change: number | null };
export type DashboardSeriesPoint = { date: string; activity: number; members: number };
export type DashboardMix = { label: string; value: number };
export type DashboardEvent = { title: string; detail: string; at: string; href: string; kind: string };
export type DashboardPending = { title: string; count: number; severity: 'high' | 'medium'; href: string };
export type AdminDashboardProps = {
    days: number;
    timezone: string;
    stats: Record<'members' | 'learners' | 'questionSets' | 'aiRequestsToday' | 'posts' | 'enrollments', DashboardMetric>;
    series: DashboardSeriesPoint[];
    mix: DashboardMix[];
    recent: DashboardEvent[];
    pending: DashboardPending[];
    pendingReviewCount: number;
    health: {
        queue: { driver: string; status: string };
        ai: { configured: boolean; enabledFeatures: number };
        plans: { name: string; members: number }[];
        backup: { status: string };
    };
    interview: { sets: number; questions: number; types: number; modes: number; recentImports: number | null };
};
