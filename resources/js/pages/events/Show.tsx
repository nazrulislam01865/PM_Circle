import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { EventAction, EventBanner, EventFormErrors } from '@/components/events/EventComponents';
import { eventDateParts, eventHref, type EventComment, type EventDetail, type EventPage, type EventPreview } from '@/components/events/eventTypes';
import { eventCalendar } from '@/components/events/eventCalendar';
import { LinkedPagination } from '@/components/pm/Pagination';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { RewardPromotionData } from '@/types/reward';

type Viewer = { name: string; email: string; is_admin: boolean } | null;
function EventRegistration({ event, viewer, canRegister, registered, calendarEnabled }: { event: EventDetail; viewer: Viewer; canRegister: boolean; registered: boolean; calendarEnabled: boolean }) {
    const form = useForm({ name: viewer?.name ?? '', email: viewer?.email ?? '', phone: '', role: '' });
    return <aside className="pm-event-registration pm-event-detail-panel" aria-labelledby="pm-event-register-title">
        <h2 id="pm-event-register-title">Register for this event</h2>
        {registered ? <div className="pm-event-form-result" role="status"><strong>You are registered.</strong>{calendarEnabled && event.startsAt && <button type="button" className="pm-guide-button is-outline" onClick={() => { const content = eventCalendar(event, window.location.origin); if (!content) return; const url = URL.createObjectURL(new Blob([content], {type: 'text/calendar;charset=utf-8'})); const link = document.createElement('a'); link.href = url; link.download = 'pm-circle-event.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>Add to calendar</button>}</div> : !event.registrationOpen ? <p>Registration is closed for this event.</p> : !canRegister ? <>
            <p>{viewer?.is_admin ? 'Administrator accounts cannot register for member events.' : viewer ? 'Complete your member account to register.' : 'This event is for PM Circle community members.'}</p>
            {!viewer && <><EventAction href="/register">Join PM Circle free</EventAction><EventAction href="/login" outline>Sign in</EventAction></>}
            {viewer && !viewer.is_admin && <EventAction href="/join/step/2" outline>Complete your account</EventAction>}
        </> : <>
            <p>{event.openToEveryone ? 'Free registration. Open to everyone. A PM Circle account is optional.' : 'Free registration for PM Circle members.'}</p>
            <p className="pm-event-preview-note">Your registration details are private and available to PM Circle administrators.</p>
            <form className="pm-event-registration-form" onSubmit={e => { e.preventDefault(); form.post(`${eventHref(event.slug)}/register`, { preserveScroll: true, onSuccess: () => form.reset('phone', 'role') }); }}>
                <label className="pm-guide-field-label" htmlFor="event-guest-name">Full name</label><input className="pm-guide-control" id="event-guest-name" autoComplete="name" maxLength={120} required readOnly={Boolean(viewer)} value={form.data.name} onChange={e => form.setData('name', e.target.value)}/>
                <label className="pm-guide-field-label" htmlFor="event-guest-email">Email address</label><input className="pm-guide-control" id="event-guest-email" type="email" autoComplete="email" maxLength={254} required readOnly={Boolean(viewer)} value={form.data.email} onChange={e => form.setData('email', e.target.value)}/>
                <label className="pm-guide-field-label" htmlFor="event-guest-phone">Phone number</label><input className="pm-guide-control" id="event-guest-phone" type="tel" autoComplete="tel" maxLength={20} required value={form.data.phone} onChange={e => form.setData('phone', e.target.value)}/>
                <label className="pm-guide-field-label" htmlFor="event-guest-role">Current role or student status <span>(optional)</span></label><input className="pm-guide-control" id="event-guest-role" autoComplete="organization-title" maxLength={120} value={form.data.role} onChange={e => form.setData('role', e.target.value)}/>
                <EventFormErrors errors={form.errors}/><button className="pm-guide-button" type="submit" disabled={form.processing}>{form.processing ? 'Registering…' : 'Register for free'}</button>
            </form>
        </>}
    </aside>;
}
function EventAbout({ event }: { event: EventDetail }) {
    const date = eventDateParts(event.date);
    return <section className="pm-event-about pm-event-detail-panel" aria-labelledby="pm-event-about-heading">
        <div className="pm-event-about-tags">{event.sponsored && <span className="pm-event-sponsor-badge">Sponsored event</span>}<span>{event.openToEveryone ? 'Open to everyone' : 'For members'} · {event.category}</span></div>
        <h2 id="pm-event-about-heading">About the event</h2>
        <p className="pm-event-about-meta">{date.full} · {event.time} · {event.format === 'online' ? 'Online' : `In person · ${event.location}`}{event.endTime && ` · Ends ${event.endTime}`}</p>
        <div className="pm-event-organizers"><div><strong>Organized by</strong><div className="pm-event-organizer-name"><span aria-hidden="true">{event.host.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()}</span>{event.host}</div>{event.hostType && <small>{event.hostType}</small>}</div><div><strong>Published by</strong><p>{event.publisher}</p></div></div>
        <p className="pm-event-description">{event.about || event.description}</p>
        {event.agenda.length > 0 && <><h3 className="pm-event-content-label">Agenda</h3><div className="pm-event-agenda">{event.agenda.map((item, i) => <div key={i}><strong>{item.time}</strong><span>{item.title}</span></div>)}</div></>}
        {event.speakers.length > 0 && <><h3 className="pm-event-content-label">Speakers</h3><div className="pm-event-speakers">{event.speakers.map((person, i) => <div key={i}><strong>{person.name}</strong><span>{person.title}</span></div>)}</div></>}
    </section>;
}
function EventLocation({ event }: { event: EventDetail }) {
    if (event.format === 'online') return null;
    const mapsLink = event.mapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue, event.address, event.location].filter(Boolean).join(', '))}`;
    return <section className="pm-event-detail-panel pm-event-location" aria-labelledby="pm-event-location-heading"><h2 id="pm-event-location-heading">Event location</h2><strong>{event.venue || event.location}</strong>{event.address && <p>{event.address}</p>}{event.mapUrl && <a className="pm-event-map-preview" href={mapsLink} target="_blank" rel="noopener noreferrer"><img src={event.mapUrl} alt={`Map of ${event.venue || event.location}`} loading="lazy" decoding="async" width="770" height="240"/></a>}<a href={mapsLink} target="_blank" rel="noopener noreferrer">Open in Google Maps</a></section>;
}
function RelatedEvents({ events }: { events: EventPreview[] }) {
    if (!events.length) return null;
    return <section className="pm-event-detail-panel pm-event-related" aria-labelledby="pm-event-related-heading"><h2 id="pm-event-related-heading">Related events</h2><ul>{events.map(item => <li key={item.slug}><Link href={eventHref(item.slug)}>{item.title}</Link><span>{eventDateParts(item.date).full} · {item.format === 'online' ? 'Online' : 'In person'}</span></li>)}</ul><Link href="/events">Browse all events</Link></section>;
}
function EventDiscussion({ event, comments, viewer, canComment }: { event: EventDetail; comments: EventPage<EventComment>; viewer: Viewer; canComment: boolean }) {
    const form = useForm({ name: viewer?.name ?? '', message: '' });
    return <section className="pm-event-detail-panel pm-event-discussion" aria-labelledby="pm-event-discussion-heading"><h2 id="pm-event-discussion-heading">Public discussion</h2><p>{event.discussionOpen ? 'Comments and display names are public after administrator approval.' : 'Discussion is closed.'}</p>
        <div className="pm-event-comments" aria-live="polite">{comments.data.length ? comments.data.map(comment => <article key={comment.id}><strong>{comment.name}</strong><p>{comment.message}</p></article>) : <p>No comments yet.</p>}</div>
        <LinkedPagination links={comments.links} label="Comment pages"/>
        {event.discussionOpen && canComment && <form className="pm-event-comment-form" onSubmit={e => { e.preventDefault(); form.post(`${eventHref(event.slug)}/comments`, { preserveScroll: true, onSuccess: () => form.reset('message') }); }}>
            {!viewer && <><label className="pm-guide-field-label" htmlFor="event-comment-author">Display name</label><input className="pm-guide-control" id="event-comment-author" required maxLength={80} value={form.data.name} onChange={e => form.setData('name', e.target.value)}/></>}
            <label className="pm-guide-field-label" htmlFor="event-comment-message">Comment</label><textarea className="pm-guide-control" id="event-comment-message" rows={4} required maxLength={1500} value={form.data.message} onChange={e => form.setData('message', e.target.value)}/>
            <EventFormErrors errors={form.errors}/><button type="submit" className="pm-guide-button is-outline" disabled={form.processing}>{form.processing ? 'Submitting…' : 'Post comment'}</button>
        </form>}
    </section>;
}
export default function CommunityEventDetails({ event, relatedEvents, comments, canRegister, canComment, registered, calendarEnabled = false, notice }: { event: EventDetail; relatedEvents: EventPreview[]; comments: EventPage<EventComment>; canRegister: boolean; canComment: boolean; registered: boolean; calendarEnabled?: boolean; notice?: string }) {
    const { rewardPromotion, auth } = usePage<{ rewardPromotion?: RewardPromotionData | null; auth: { user: Viewer } }>().props;
    return <PublicLayout siteLayout homePrototype guideLayout eventPrototype homeOfferLabel={rewardPromotion?.discountLabel} banner={{title: event.title, description: event.description, parents: [{label: 'Community Events', href: '/events'}], titleId: 'pm-event-page-title'}}>
        <Head title={`${event.title} | Community Events | PM Circle`}><meta name="description" content={event.description}/></Head>
        <div className="pm-events-page"><LegacyPageHeading><EventBanner title={event.title} description={event.description} crumb={event.title}/></LegacyPageHeading><div className="pm-event-wrap pm-event-main pm-event-detail-main">
            {notice && <div className="pm-event-form-result" role="status">{notice}</div>}
            <div className="pm-event-detail-layout"><div className="pm-event-detail-column">
                {event.coverUrl && <img className="pm-event-detail-hero" src={event.coverUrl} alt={event.title} width="800" height="330" decoding="async"/>}
                <EventAbout event={event}/><EventLocation event={event}/><RelatedEvents events={relatedEvents}/><EventDiscussion key={event.slug} event={event} comments={comments} viewer={auth.user} canComment={canComment}/>
            </div><EventRegistration key={event.slug} event={event} viewer={auth.user} canRegister={canRegister} registered={registered} calendarEnabled={calendarEnabled}/></div>
        </div></div>
    </PublicLayout>;
}
