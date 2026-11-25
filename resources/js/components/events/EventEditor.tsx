import { Link, useForm } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { ProgressBar } from '@/components/pm/ProgressBar';
import { PMDropdown } from '@/components/pm/PMDropdown';
import { ImageUploadField } from '@/components/pm/ImageUploadField';
import { Plus } from 'lucide-react';
import { EventFormErrors } from './EventComponents';
import type { AgendaItem, Speaker } from './eventTypes';

type EventFields = {
    title: string; description: string; about: string; category: string; starts_at: string; ends_at: string;
    format: string; location: string; venue: string; address: string; map_link: string; host: string; host_type: string;
    open_to_everyone: boolean; sponsored: boolean; registration_open: boolean; discussion_open: boolean;
    agenda: AgendaItem[]; speakers: Speaker[]; cover_image: File | null; map_image: File | null; remove_cover_image: boolean; remove_map_image: boolean;
};
export type EditableEvent = Partial<Omit<EventFields, 'cover_image' | 'map_image' | 'remove_cover_image' | 'remove_map_image'>> & { id: number; coverUrl: string | null; mapUrl: string | null };
export function EventEditor({ event, admin = false }: { event?: EditableEvent | null; admin?: boolean }) {
    const form = useForm<EventFields>({
        title: event?.title ?? '', description: event?.description ?? '', about: event?.about ?? '', category: event?.category ?? '',
        starts_at: event?.starts_at ?? '', ends_at: event?.ends_at ?? '', format: event?.format ?? 'online', location: event?.location ?? '',
        venue: event?.venue ?? '', address: event?.address ?? '', map_link: event?.map_link ?? '', host: event?.host ?? '', host_type: event?.host_type ?? '',
        open_to_everyone: event?.open_to_everyone ?? false, sponsored: event?.sponsored ?? false, registration_open: event?.registration_open ?? true,
        discussion_open: event?.discussion_open ?? true, agenda: event?.agenda ?? [], speakers: event?.speakers ?? [], cover_image: null, map_image: null, remove_cover_image: false, remove_map_image: false,
    });
    const fieldClass = admin ? 'pm-admin-field' : 'pm-event-editor-field';
    const labelClass = admin ? 'pm-admin-field-label' : 'pm-guide-field-label';
    const control = admin ? '' : 'pm-guide-control';
    const button = admin ? 'pm-admin-button' : 'pm-guide-button is-outline';
    const primary = admin ? 'pm-admin-button pm-admin-button-primary' : 'pm-guide-button';
    const base = admin ? '/admin/events' : '/events';
    const panel = admin ? 'pm-admin-panel pm-event-editor' : 'pm-event-detail-panel pm-event-editor';
    const field = (name: keyof EventFields, title: string, child: ReactNode, hint?: string) => <div className={fieldClass}><label className={labelClass} htmlFor={`event-${name}`}>{title}</label>{child}{hint && <small className="pm-event-editor-hint" id={`event-${name}-hint`}>{hint}</small>}{form.errors[name] && <span className="pm-event-input-error" id={`event-${name}-error`} role="alert">{form.errors[name]}</span>}</div>;
    type TextField = 'title' | 'description' | 'about' | 'category' | 'starts_at' | 'ends_at' | 'location' | 'venue' | 'address' | 'host' | 'host_type' | 'map_link';
    const text = (name: TextField, title: string, max: number, required = false, type = 'text', placeholder?: string, hint?: string) => field(name, title, <input id={`event-${name}`} className={control} type={type} maxLength={max} required={required} placeholder={placeholder} value={form.data[name]} aria-invalid={Boolean(form.errors[name])} aria-describedby={[hint ? `event-${name}-hint` : '', form.errors[name] ? `event-${name}-error` : ''].filter(Boolean).join(' ') || undefined} onChange={e => form.setData(name, e.target.value)}/>, hint);
    const textarea = (name: 'description' | 'about', title: string, max: number, required = false) => field(name, title, <textarea id={`event-${name}`} className={control} rows={name === 'about' ? 5 : 3} maxLength={max} required={required} value={form.data[name]} aria-invalid={Boolean(form.errors[name])} onChange={e => form.setData(name, e.target.value)}/>, `${form.data[name].length} / ${max} characters`);
    const image = (name: 'cover_image' | 'map_image', label: string, existingUrl?: string | null) => {
        const removal = name === 'cover_image' ? 'remove_cover_image' : 'remove_map_image';
        return <ImageUploadField id={`event-${name}`} label={label} file={form.data[name]} existingUrl={existingUrl} removeExisting={form.data[removal]} buttonClass={button} disabled={form.processing} error={form.errors[name]} onChange={(file, removeExisting) => { form.setData({ ...form.data, [name]: file, [removal]: removeExisting }); form.clearErrors(name); }}/>;
    };
    const check = (name: 'open_to_everyone' | 'sponsored' | 'registration_open' | 'discussion_open', title: string) => <label className="pm-event-editor-check"><input type="checkbox" checked={form.data[name]} onChange={e => form.setData(name, e.target.checked)}/>{title}</label>;
    return <form className="pm-event-editor" onSubmit={e => { e.preventDefault(); if (form.processing) return; const element = e.currentTarget; form.transform(data => data.format === 'online' ? { ...data, map_image: null, map_link: '', remove_map_image: false } : data); form.post(event ? `${base}/${event.id}` : base, { preserveScroll: true, onSuccess: () => { if (!admin) { element.reset(); form.reset(); } } }); }}>
        <section className={panel}><h2>Event information</h2>
            {text('title', 'Event title', 120, true, 'text', 'e.g. Scrum case study night')}
            {textarea('description', 'Short description', 500, true)}{textarea('about', 'About the event (optional)', 10000)}
            <div className="pm-event-editor-grid">{text('category', 'Event category', 80, true, 'text', 'e.g. Workshop')}{field('format', 'Format', <PMDropdown id="event-format" value={form.data.format} onValueChange={value => form.setData('format', value)} required invalid={Boolean(form.errors.format)} placeholder="Select format" options={[{value: 'online', label: 'Online'}, {value: 'in-person', label: 'In person'}]}/>)}</div>
        </section>
        <section className={panel}><h2>Schedule and organizer</h2><div className="pm-event-editor-grid">
            {text('starts_at', 'Starts (Bangladesh time)', 16, true, 'datetime-local')}{text('ends_at', 'Ends (optional)', 16, false, 'datetime-local')}
            {text('host', 'Organizer name', 120, true)}{text('host_type', 'Organizer type (optional)', 80)}
        </div></section>
        {form.data.format === 'in-person' && <section className={panel}><h2>Event location</h2>
            <div className="pm-event-editor-grid">{text('location', 'City / location', 120, true)}{text('venue', 'Venue (optional)', 160)}</div>
            {text('address', 'Address (optional)', 255)}
            {text('map_link', 'Google Maps link (optional)', 2048, false, 'url', 'https://maps.app.goo.gl/…', 'Open the venue in Google Maps, choose Share, and paste the link here. If left blank, the event page links to a search for the venue or address.')}
            {image('map_image', 'Venue map image (optional)', event?.mapUrl)}
        </section>}
        <section className={panel}><h2>Event cover</h2>{image('cover_image', 'Cover image (optional)', event?.coverUrl)}</section>
        <section className={panel}><h2>Agenda</h2>
            {!form.data.agenda.length && <p className="pm-event-editor-hint">Add sessions and their scheduled times (optional).</p>}
            {form.data.agenda.map((item, i) => <div className="pm-event-editor-repeat" key={i}><label className={fieldClass}><span className={labelClass}>Time</span><input className={control} required maxLength={60} value={item.time} onChange={e => form.setData('agenda', form.data.agenda.map((a, j) => j === i ? {...a, time: e.target.value} : a))}/></label><label className={fieldClass}><span className={labelClass}>Session</span><input className={control} required maxLength={200} value={item.title} onChange={e => form.setData('agenda', form.data.agenda.map((a, j) => j === i ? {...a, title: e.target.value} : a))}/></label><button className={button} type="button" onClick={() => form.setData('agenda', form.data.agenda.filter((_, j) => j !== i))}>Remove</button></div>)}
            <button className={button} type="button" disabled={form.data.agenda.length >= 20} onClick={() => form.setData('agenda', [...form.data.agenda, {time: '', title: ''}])}><Plus aria-hidden="true"/> Add agenda item</button>
        </section>
        <section className={panel}><h2>Speakers</h2>{!form.data.speakers.length && <p className="pm-event-editor-hint">Add the speakers and their professional titles (optional).</p>}
            {form.data.speakers.map((item, i) => <div className="pm-event-editor-repeat" key={i}><label className={fieldClass}><span className={labelClass}>Name</span><input className={control} required maxLength={120} value={item.name} onChange={e => form.setData('speakers', form.data.speakers.map((a, j) => j === i ? {...a, name: e.target.value} : a))}/></label><label className={fieldClass}><span className={labelClass}>Professional title</span><input className={control} required maxLength={160} value={item.title} onChange={e => form.setData('speakers', form.data.speakers.map((a, j) => j === i ? {...a, title: e.target.value} : a))}/></label><button className={button} type="button" onClick={() => form.setData('speakers', form.data.speakers.filter((_, j) => j !== i))}>Remove</button></div>)}
            <button className={button} type="button" disabled={form.data.speakers.length >= 20} onClick={() => form.setData('speakers', [...form.data.speakers, {name: '', title: ''}])}><Plus aria-hidden="true"/> Add speaker</button>
        </section>
        <section className={panel}><h2>Access and participation</h2>{check('open_to_everyone', 'Open to everyone (allow guest registration)')}{check('registration_open', 'Enable free registration')}{check('discussion_open', 'Enable public discussion')}{admin && check('sponsored', 'Sponsored event')}
            <EventFormErrors errors={form.errors}/>{form.progress && <ProgressBar label="Image upload progress" value={form.progress.percentage ?? 0}/>}<div className="pm-event-editor-actions"><button className={primary} type="submit" disabled={form.processing}>{form.processing ? 'Saving…' : event ? 'Save changes' : admin ? 'Save event' : 'Submit for review'}</button><Link className={button} href={base}>Cancel</Link></div>
        </section>
    </form>;
}
