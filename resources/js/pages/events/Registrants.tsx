import { Head, Link } from '@inertiajs/react';
import { LinkedPagination } from '@/components/pm/Pagination';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { EventPage } from '@/components/events/eventTypes';

type Registrant = { id: number; name: string; email: string; phone: string; role: string | null; created_at: string };
export default function Registrants({event, registrations}: {event: {id: number; title: string}; registrations: EventPage<Registrant>}) {
    return <PublicLayout siteLayout homePrototype guideLayout eventPrototype memberBanner banner={{ title: 'Event registrants', description: event.title, parents: [{ label: 'Community Events', href: '/events' }, { label: 'My events', href: '/events/create' }], currentLabel: 'Registrants', titleId: 'pm-event-page-title' }}><Head title="Event registrants | PM Circle"/><div className="pm-events-page"><div className="pm-event-wrap pm-event-main"><section className="pm-event-detail-panel"><div className="pm-event-section-heading"><Link href="/events/create" className="pm-guide-button is-outline">My events</Link><a href={`/events/host/${event.id}/registrants/download`} className="pm-guide-button">Download CSV</a></div><div className="pm-account-table-wrap" role="region" aria-label="Event registrants" tabIndex={0}><table><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Phone</th><th scope="col">Role</th></tr></thead><tbody>{registrations.data.map(row=><tr key={row.id}><td>{row.name}</td><td>{row.email}</td><td>{row.phone}</td><td>{row.role ?? '—'}</td></tr>)}</tbody></table></div>{!registrations.data.length && <p>No registrants yet.</p>}<LinkedPagination links={registrations.links} label="Registrants pages"/></section></div></div></PublicLayout>;
}
