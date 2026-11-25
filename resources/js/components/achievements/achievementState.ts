import type { AchievementBadge, AchievementSnapshot } from "./types";

const sampleActivity: Pick<AchievementSnapshot, "metrics" | "paths" | "records"> = {
    "metrics": {
        "courses": 1,
        "scenarios": 3,
        "exams": 1,
        "challenges": 4,
        "posts": 2,
        "replies": 4,
        "interviews": 0,
        "profile": 70,
        "resumes": 0,
        "events": 0,
        "hosted": 0,
        "articles": 1,
        "minutes": 150,
        "certificates": 1,
        "pmpExams": 1,
        "scrumExams": 0,
        "reviews": 0,
        "projects": 0,
        "shares": 0,
        "interviewReviews": 0,
        "challengeReviews": 0
    },
    "paths": [
        {
            "id": 1,
            "title": "Start your project management journey",
            "slug": "",
            "completedActivities": 3,
            "totalActivities": 5
        },
        {
            "id": 2,
            "title": "Coordinate work with confidence",
            "slug": "",
            "completedActivities": 0,
            "totalActivities": 5
        },
        {
            "id": 3,
            "title": "Lead delivery and make trade-offs",
            "slug": "",
            "completedActivities": 0,
            "totalActivities": 5
        },
        {
            "id": 4,
            "title": "Manage complexity and lead teams",
            "slug": "",
            "completedActivities": 0,
            "totalActivities": 5
        },
        {
            "id": 5,
            "title": "Connect projects to business strategy",
            "slug": "",
            "completedActivities": 0,
            "totalActivities": 5
        }
    ],
    "records": [
        {
            "id": "sample-0",
            "type": "Course",
            "name": "Project Management Foundations",
            "date": "2026-11-24",
            "detail": "Completed · 3 lessons"
        },
        {
            "id": "sample-1",
            "type": "Simulator",
            "name": "PMP mock exam",
            "date": "2026-11-23",
            "detail": "Completed · 12 of 15 correct"
        },
        {
            "id": "sample-2",
            "type": "Course certificate",
            "name": "Project Management Foundations",
            "date": "2026-11-24",
            "detail": "Issued · PM Circle course completion"
        },
        {
            "id": "sample-3",
            "type": "Daily challenge",
            "name": "A stakeholder asks for a scope change",
            "date": "2026-11-22",
            "detail": "Completed"
        },
        {
            "id": "sample-4",
            "type": "Simulator",
            "name": "Manage an unexpected dependency",
            "date": "2026-11-20",
            "detail": "Scenario completed · Foundations pathway"
        }
    ]
};


export const sampleActions = [
    ['challenge', 'Daily challenge', 'Complete a daily challenge.'], ['interview', 'Interview practice', 'Complete a mock interview.'],
    ['courses', 'Course', 'Complete a course and earn its certificate.'], ['profile', 'Profile', 'Complete one more profile section.'],
    ['sim', 'Simulator', 'Complete an activity in your next unfinished learning pathway.'], ['event', 'Event', 'Attend an eligible PM Circle event.'],
] as const;

function newest(badges: AchievementBadge[]) {
    return badges.filter(badge => badge.status === 'earned').sort((a, b) => (b.earnedAt ?? '').localeCompare(a.earnedAt ?? '')).slice(0, 3);
}
export function sampleSnapshot(source: AchievementSnapshot): AchievementSnapshot {
    const data = structuredClone(sampleActivity);
    const dateOverrides: Record<string, string> = { 'courses-1': '2026-11-24', 'cert-1': '2026-11-24', 'exam-1': '2026-11-23', 'pmp-1': '2026-11-23' };
    let awardIndex = 0;
    const badges = source.badges.map(badge => {
        const value = data.metrics[badge.metric] ?? 0;
        const earned = value >= badge.target;
        const earnedAt = earned ? dateOverrides[badge.id] ?? `2026-11-${String(12 + awardIndex).padStart(2, '0')}` : null;
        if (earned) awardIndex++;
        return { ...badge, value, available: true, status: earned ? 'earned' as const : value > 0 ? 'progress' as const : 'locked' as const, earnedAt };
    });
    return { ...source, ...data, badges, latest: newest(badges) };
}
export function simulate(source: AchievementSnapshot, action: typeof sampleActions[number]): AchievementSnapshot {
    const next = structuredClone(source);
    const [key, type, name] = action;
    const metrics = next.metrics;
    if (key === 'challenge') metrics.challenges++;
    if (key === 'interview') metrics.interviews++;
    if (key === 'event') metrics.events++;
    if (key === 'courses') { metrics.courses++; metrics.certificates++; metrics.minutes += 60; }
    if (key === 'profile') metrics.profile = Math.min(100, metrics.profile + 15);
    if (key === 'sim') { metrics.scenarios++; const path = next.paths.find(item => item.completedActivities < item.totalActivities); if (path) path.completedActivities++; }
    const now = new Date().toISOString();
    next.badges = next.badges.map(badge => {
        const value = metrics[badge.metric] ?? 0;
        const earned = value >= badge.target;
        return { ...badge, value, status: earned ? 'earned' : value > 0 ? 'progress' : 'locked', earnedAt: earned ? badge.earnedAt ?? now : null };
    });
    next.latest = newest(next.badges);
    next.records.unshift({ id: `sample-${next.records.length}-${now}`, type, name: name.replace(/\.$/, ''), date: now, detail: 'Sample activity recorded' });
    return next;
}
export function filterBadges(badges: AchievementBadge[], category: string, status: string, query: string) {
    const search = query.trim().toLocaleLowerCase();
    return badges.filter(badge => (category === 'all' || badge.category === category) && (status === 'all' || (status === 'new' ? badge.newBadge : status === 'locked' ? badge.status !== 'earned' : badge.status === status)) && (!search || `${badge.name} ${badge.category} ${badge.unit}`.toLocaleLowerCase().includes(search)));
}
export function nearestBadges(badges: AchievementBadge[]) {
    return badges.filter(badge => badge.status === 'progress').sort((a, b) => b.value / b.target - a.value / a.target).slice(0, 3);
}
