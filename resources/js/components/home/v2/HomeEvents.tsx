import { useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HomeAction, HomeSectionTitle } from './HomeUi';
import { homeEventPreviews, referenceText, type HomeEventPreview } from './reference';
import type { HomeContent } from '@/types/home';

const initialForm = { title: '', date: '', time: '', location: '' };

export function HomeEvents({ join }: { join?: NonNullable<HomeContent['careers']>['join'] }) {
    const [events, setEvents] = useState<HomeEventPreview[]>(homeEventPreviews);
    const [selected, setSelected] = useState<HomeEventPreview | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [error, setError] = useState('');

    const addPreview = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!form.title.trim() || !form.date || !form.time || !form.location.trim()) {
            setError('Please complete all event fields.'); return;
        }
        const date = new Date(`${form.date}T12:00:00`);
        if (Number.isNaN(date.getTime())) { setError('Choose a valid date.'); return; }
        setEvents(current => [...current, {
            id: `user-preview-${current.length}`, title: form.title.trim(), date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            day: date.toLocaleDateString('en-GB', { day: '2-digit' }), month: date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
            time: form.time, location: form.location.trim(), description: 'Created for this preview. No event was published.',
        }]);
        setCreating(false); setForm(initialForm); setError('');
    };

    return <section className="pm-v2-section pm-v2-container pm-v2-events-section" id="pm-v2-events-title" aria-labelledby="pm-v2-event-heading">
        <HomeSectionTitle id="pm-v2-event-heading" title="Community events"
            description="Join study sessions, practical workshops and discussions hosted by members." action="View all events" href="/events"/>
        <button className="pm-v2-button pm-v2-create-event" type="button" onClick={() => setCreating(true)}>Create event</button>
        <p className="sr-only">Illustrative event previews. The events shown here are not published or open for booking.</p>
        <div className="pm-v2-events-list">{events.map(item => <article className="pm-v2-event" key={item.id}>
            <div className="pm-v2-event-date"><strong>{item.day}</strong><span>{item.month}</span></div>
            <div className="pm-v2-event-copy"><h3>{item.title}</h3><p>{item.date} · {item.time} · {item.location}</p><span>{item.description}</span></div>
            <button type="button" className="pm-v2-button" onClick={() => setSelected(item)}>View event</button>
        </article>)}</div>
        <div className="pm-v2-join-banner"><div><h2>{referenceText(join?.heading, "Don't just manage projects. Grow with people who do.", 'Grow with people who do what you do.')}</h2>
            <p>{referenceText(join?.description, 'Start with one discussion, one lesson, one connection.', 'Join PM Circle and take your first step in learning, practice, or discussion.')}</p></div>
            <HomeAction href={join?.button_url || '/register'}>{referenceText(join?.button_label, 'Become a member — free', 'Join PM Circle free')}</HomeAction>
        </div>
        <Dialog open={selected !== null} onOpenChange={open => !open && setSelected(null)}><DialogContent className="pm-v2-dialog">
            <DialogHeader><DialogTitle>{selected?.title || 'Community event'}</DialogTitle>
                <DialogDescription>Homepage design preview · Sample event details, not a published booking.</DialogDescription></DialogHeader>
            <p>{selected?.date} · {selected?.time} · {selected?.location}</p><p>{selected?.description}</p>
            <div className="pm-v2-dialog-actions"><HomeAction href="/register" primary>Join free</HomeAction>
                <button type="button" className="pm-v2-button" onClick={() => setSelected(null)}>Close</button></div>
        </DialogContent></Dialog>
        <Dialog open={creating} onOpenChange={open => { setCreating(open); if (!open) setError(''); }}><DialogContent className="pm-v2-dialog">
            <DialogHeader><DialogTitle>Create an event preview</DialogTitle><DialogDescription>This demonstration only adds an event to this page. It does not publish or persist events.</DialogDescription></DialogHeader>
            <form className="pm-v2-event-form" onSubmit={addPreview}>
                <label>Event title<input type="text" maxLength={120} value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} required/></label>
                <label>Date<input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} required/></label>
                <label>Time (Bangladesh)<input type="time" value={form.time} onChange={e => setForm(prev => ({ ...prev, time: e.target.value }))} required/></label>
                <label>Location or format<input type="text" maxLength={120} placeholder="Online or venue" value={form.location} onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))} required/></label>
                {error && <p role="alert" className="pm-v2-form-error">{error}</p>}
                <div className="pm-v2-dialog-actions"><button type="submit" className="pm-v2-button pm-v2-button-primary">Add preview event</button>
                    <button type="button" className="pm-v2-button" onClick={() => setCreating(false)}>Cancel</button></div>
            </form>
        </DialogContent></Dialog>
    </section>;
}
