/** Server-rendered public prototype; not a reservation or persisted event. */
export type EventPreview = {
    slug: string;
    title: string;
    date: string; // YYYY-MM-DD; interpreted as a calendar day in Bangladesh.
    time: string;
    location: string;
    description: string;
    category: string;
    openToEveryone: boolean;
    sponsored: boolean;
    host: string | null;
};

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function eventDateParts(isoDate: string): { day: string; month: string; full: string } {
    const [year, month, day] = isoDate.split('-');
    const monthIndex = Number(month) - 1;
    const name = months[monthIndex];
    if (!name || !year || !day) return { day: '--', month: '---', full: 'Date to be confirmed' };
    return { day, month: name.toUpperCase(), full: `${Number(day)} ${name} ${year}` };
}

export function eventHref(slug: string): string {
    return `/events/${encodeURIComponent(slug)}`;
}
