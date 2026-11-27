export type EventPreview = {
    slug: string; title: string; date: string; time: string; location: string;
    format: 'online' | 'in-person'; description: string; category: string;
    openToEveryone: boolean; sponsored: boolean; host: string;
};
export type AgendaItem = { time: string; title: string };
export type Speaker = { name: string; title: string };
export type EventDetail = EventPreview & {
    about: string | null; hostType: string | null; publisher: string; venue: string | null; address: string | null;
    coverUrl: string | null; mapUrl: string | null; mapLink: string | null; agenda: AgendaItem[]; speakers: Speaker[]; endTime: string | null;
    registrationOpen: boolean; discussionOpen: boolean; startsAt?: string; endsAt?: string | null;
};
export type EventAdvertisement = { company: string; initials: string; category: string; title: string; description: string; image: string; action: string; href: string };
export type EventPageContent = { title: string; description: string; host_title: string; host_description: string; host_visible: boolean; host_action: string; advertisements: EventAdvertisement[] };
export type EventPage<T> = { data: T[]; current_page: number; last_page: number; total: number; from: number | null; to: number | null; links: { url: string | null; label: string; active: boolean }[] };
export type EventComment = { id: number; name: string; message: string };
export type EventSummary = { id: number; title: string; slug: string; status: string };
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export function eventDateParts(isoDate: string): { day: string; month: string; full: string } {
    const [year, month, day] = isoDate.split('-');
    const name = months[Number(month) - 1];
    if (!name || !year || !day) return { day: '--', month: '---', full: 'Date to be confirmed' };
    return { day, month: name.toUpperCase(), full: `${Number(day)} ${name} ${year}` };
}
export function eventHref(slug: string): string { return `/events/${encodeURIComponent(slug)}`; }
