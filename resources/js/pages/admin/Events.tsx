import { PMDropdown } from '@/components/pm/PMDropdown';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LinkedPagination } from '@/components/pm/Pagination';
import { EventFormErrors } from '@/components/events/EventComponents';
import type { EventPage, EventSummary } from '@/components/events/eventTypes';

type AdminEvent = EventSummary & { host: string; starts_at: string };
export default function Events({ events, status, notice }: { events: EventPage<AdminEvent>; status: string; notice?: string }) {
    const [busy, setBusy] = useState(false);
    const { errors } = usePage<{errors: Record<string, string>}>().props;
    function change(event: AdminEvent, next: string) {
        if (!window.confirm(`${next === 'published' ? 'Publish' : next === 'rejected' ? 'Reject' : 'Unpublish'} this event?`)) return;
        setBusy(true); router.patch(`/admin/events/${event.id}/status`, {status: next}, {preserveScroll: true, onFinish: () => setBusy(false)});
    }
    return <AdminLayout title="Community events" subtitle="Review submissions, manage publication, registrations and public discussion." active="/admin/events">
        <section className="pm-admin-panel pm-event-editor"><div className="pm-event-section-heading"><h2>Events</h2><div className="pm-event-editor-actions"><Link className="pm-admin-button" href="/admin/events/settings">Page settings</Link><Link className="pm-admin-button pm-admin-button-primary" href="/admin/events/create">Create event</Link></div></div>
            {notice && <p role="status">{notice}</p>}<EventFormErrors errors={errors ?? {}}/>
            <div className="pm-admin-field"><label htmlFor="event-publication-status">Publication status</label><PMDropdown id="event-publication-status" value={status} required placeholder="All events" options={[{value: 'all', label: 'All events'}, {value: 'pending', label: 'Pending review'}, {value: 'published', label: 'Published'}, {value: 'unpublished', label: 'Unpublished'}, {value: 'rejected', label: 'Rejected'}]} onValueChange={value => router.get('/admin/events', {status: value})}/></div>
            <div className="pm-course-admin-table-scroll"><table className="pm-course-admin-table"><thead><tr><th>Event</th><th>Organizer</th><th>Start (BDT)</th><th>Status</th><th>Actions</th></tr></thead><tbody>{events.data.map(event => <tr key={event.id}><td><strong>{event.title}</strong></td><td>{event.host}</td><td>{new Date(event.starts_at).toLocaleString('en-GB', {timeZone: 'Asia/Dhaka'})}</td><td>{event.status}</td><td><div className="pm-course-admin-row-actions"><Link className="pm-admin-button" href={`/admin/events/${event.id}/edit`}>Edit</Link><Link className="pm-admin-button" href={`/admin/events/${event.id}/participants`}>Participants & discussion</Link>{event.status === 'published' ? <><Link className="pm-admin-button" href={`/events/${event.slug}`}>View</Link><button className="pm-admin-button" type="button" disabled={busy} onClick={() => change(event, 'unpublished')}>Unpublish</button></> : <><button type="button" className="pm-admin-button pm-admin-button-primary" disabled={busy} onClick={() => change(event, 'published')}>Publish</button>{event.status === 'pending' && <button className="pm-admin-button" type="button" disabled={busy} onClick={() => change(event, 'rejected')}>Reject</button>}</>}</div></td></tr>)}</tbody></table></div>{!events.data.length && <p>No events found.</p>}<LinkedPagination links={events.links} label="Event pages"/>
        </section>
    </AdminLayout>;
}
