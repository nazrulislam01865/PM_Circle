import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LinkedPagination } from '@/components/pm/Pagination';
import { EventFormErrors } from '@/components/events/EventComponents';
import type { EventComment, EventPage } from '@/components/events/eventTypes';
type Registration = { id: number; name: string; email: string; phone: string; role: string | null; created_at: string };
export default function EventParticipants({ event, registrations, comments }: { event: {id: number; title: string}; registrations: EventPage<Registration>; comments: EventPage<EventComment & {status: string}> }) {
    const {errors} = usePage<{errors: Record<string, string>}>().props;
    const [busy, setBusy] = useState(false);
    function moderate(id: number, status: string) { setBusy(true); router.patch(`/admin/events/${event.id}/comments/${id}`, {status}, {preserveScroll: true, onFinish: () => setBusy(false)}); }
    return <AdminLayout title={event.title} subtitle="Private registrations and public comment moderation" active="/admin/events" headingAction={<Link className="pm-admin-button" href="/admin/events">Back to events</Link>}>
        <section className="pm-admin-panel pm-event-editor"><h2>Registrations ({registrations.total})</h2><div className="pm-course-admin-table-scroll"><table className="pm-course-admin-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead><tbody>{registrations.data.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.email}</td><td>{row.phone}</td><td>{row.role || '—'}</td></tr>)}</tbody></table></div>{!registrations.data.length && <p>No registrations yet.</p>}<LinkedPagination links={registrations.links} label="Registration pages"/></section>
        <section className="pm-admin-panel pm-event-editor"><h2>Discussion moderation ({comments.total})</h2><EventFormErrors errors={errors ?? {}}/>{comments.data.map(comment => <article className="pm-event-detail-panel pm-event-editor" key={comment.id}><strong>{comment.name} · {comment.status}</strong><p className="pm-event-comment-body">{comment.message}</p><div className="pm-event-editor-actions">{comment.status !== 'approved' && <button className="pm-admin-button pm-admin-button-primary" disabled={busy} onClick={() => moderate(comment.id, 'approved')}>Approve</button>}{comment.status !== 'rejected' && <button className="pm-admin-button" disabled={busy} onClick={() => moderate(comment.id, 'rejected')}>Reject</button>}</div></article>)}{!comments.data.length && <p>No comments yet.</p>}<LinkedPagination links={comments.links} label="Comment pages"/></section>
    </AdminLayout>;
}
