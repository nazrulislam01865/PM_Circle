import type { InputHTMLAttributes } from 'react';

/** Native date controls preserve browser calendar, keyboard and locale support. */
function dateValue(raw: string): string {
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
    if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : [parsed.getFullYear(), String(parsed.getMonth() + 1).padStart(2, '0'), String(parsed.getDate()).padStart(2, '0')].join('-');
}

export function ProfileDateInput({ value, onChange, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
    value: string;
    onChange: (date: string) => void;
}) {
    return <input {...rest} type="date" value={dateValue(value)}
        onClick={(event) => {
            // Supported Chromium browsers open the calendar when the entire control is clicked.
            try { event.currentTarget.showPicker?.(); } catch { /* Native picker still remains usable. */ }
        }}
        onChange={(event) => onChange(event.target.value)} />;
}
