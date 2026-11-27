// Generate a local calendar file from the published event, never from private registration data.
import type { EventDetail } from './eventTypes';

export function eventCalendar(event: EventDetail, origin: string): string | null {
    const date = (value?: string | null) => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isFinite(parsed.valueOf()) ? parsed.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z') : null;
    };
    const start = date(event.startsAt);
    if (!start) return null;
    const end = date(event.endsAt);
    const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PM Circle//Events//EN', 'BEGIN:VEVENT',
        `UID:${escape(`${event.slug}@${new URL(origin).host}`)}`, `DTSTAMP:${date(new Date().toISOString())}`, `DTSTART:${start}`,
        ...(end && end > start ? [`DTEND:${end}`] : []), `SUMMARY:${escape(event.title)}`,
        `LOCATION:${escape(event.format === 'online' ? 'Online' : [event.venue, event.address, event.location].filter(Boolean).join(', '))}`,
        `URL:${origin}/events/${encodeURIComponent(event.slug)}`, 'END:VEVENT', 'END:VCALENDAR'];
    // RFC 5545 folding at 75 UTF-8 octets, not characters.
    const encoder = new TextEncoder();
    return lines.map(line => {
        let result = '', length = 0;
        for (const char of line) {
            const size = encoder.encode(char).length;
            if (length + size > 75) { result += '\r\n '; length = 1; }
            result += char; length += size;
        }
        return result;
    }).join('\r\n') + '\r\n';
}
