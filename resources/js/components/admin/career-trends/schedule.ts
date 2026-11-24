// The selectable zones are fixed-offset zones (no daylight saving changes).
const offsets: Record<string, number> = {
    'Asia/Dhaka': 360, UTC: 0, 'Asia/Kolkata': 330,
    'Asia/Dubai': 240, 'Asia/Singapore': 480,
};

export function publishingPreview(settings: { timezone: string; publish_day: string; publish_time: string; lead_hours: string }, now = new Date()) {
    const offset = (offsets[settings.timezone] ?? 0) * 60_000;
    const local = new Date(now.getTime() + offset);
    const [hour, minute] = settings.publish_time.split(':').map(Number);
    const days = (Number(settings.publish_day) - local.getUTCDay() + 7) % 7;
    const publish = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + days, hour, minute) - offset);
    if (publish.getTime() <= now.getTime()) publish.setUTCDate(publish.getUTCDate() + 7);
    const draft = new Date(publish.getTime() - Number(settings.lead_hours) * 3_600_000);
    // If the lead-time window has already passed, preview the next complete cycle.
    if (draft.getTime() <= now.getTime()) {
        publish.setUTCDate(publish.getUTCDate() + 7);
        draft.setUTCDate(draft.getUTCDate() + 7);
    }
    const label = (date: Date) => {
        const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: settings.timezone, weekday: 'short' }).format(date);
        const day = new Intl.DateTimeFormat('en-GB', { timeZone: settings.timezone, day: 'numeric', month: 'short' }).format(date);
        const datePart = `${weekday}, ${day}`;
        const timePart = new Intl.DateTimeFormat('en-US', { timeZone: settings.timezone, hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
        return `${datePart} · ${timePart}`;
    };
    const week = new Date(publish.getTime() + offset);
    week.setUTCDate(week.getUTCDate() - (week.getUTCDay() + 6) % 7);
    return { draft: label(draft), publish: label(publish), weekStart: week.toISOString().slice(0, 10) };
}
