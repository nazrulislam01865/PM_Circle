import { Head, Link, usePage } from '@inertiajs/react';
import { type FormEvent, useState } from 'react';
import { EventAction, EventBanner } from '@/components/events/EventComponents';
import { eventDateParts, eventHref, type EventPreview } from '@/components/events/eventTypes';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { RewardPromotionData } from '@/types/reward';

type SampleComment = { id: number; name: string; message: string };

/** The extra content is only published for the supplied sponsored-event prototype. */
const careerPreview = {
    subtitle: 'A career briefing for aspiring project coordinators and early-career professionals.',
    introduction: "What does a project coordinator do on a software team? Northbridge Digital's delivery and recruitment leads walk through the role, share what they look for in early-career candidates, and answer questions live.",
    agenda: [
        { time: '7:00 PM', title: 'A day in the life of a project coordinator' },
        { time: '7:20 PM', title: 'Skills hiring teams look for' },
        { time: '7:40 PM', title: 'Live Q&A' },
    ],
    speakers: [
        { name: 'Samira Rahman', title: 'Delivery Lead' },
        { name: 'Imran Karim', title: 'Talent Acquisition Lead' },
    ],
    venue: 'Bangladesh–China Friendship Conference Center',
    address: 'Agargaon, Sher-e-Bangla Nagar, Dhaka · Sample venue',
    mapQuery: 'Bangladesh China Friendship Conference Center Agargaon Dhaka',
    related: ['project-coordinator-qa', 'technology-delivery-roundtable'],
} as const;

const initialComments: SampleComment[] = [{
    id: 1,
    name: 'Nadia Islam',
    message: 'Is this session suitable for someone moving from business analysis into project coordination?',
}];

function EventRegistration({ event }: { event: EventPreview }) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    function submit(eventAction: FormEvent<HTMLFormElement>) {
        eventAction.preventDefault();
        // Native required/email constraints run first; these checks reject whitespace-only values.
        const digits = phone.replace(/\D/g, '');
        if (!fullName.trim() || !email.trim() || !/^\+?[0-9()\s-]{7,20}$/.test(phone.trim()) || digits.length < 7 || digits.length > 15) {
            setError('Please enter your full name, a valid email address and a valid phone number.');
            return;
        }
        setError('');
        setSubmitted(true);
    }

    return <aside className="pm-event-registration pm-event-detail-panel" aria-labelledby="pm-event-register-title">
        <h2 id="pm-event-register-title">Register for this event</h2>
        {event.openToEveryone ? <>
            <p>Free registration. Open to everyone. A PM Circle account is optional.</p>
            <p className="pm-event-preview-note">Prototype only. Use sample details. Entries stay in this browser tab.</p>
            {submitted ? <div className="pm-event-form-result" role="status">
                <strong>Sample form submitted</strong>
                <p>Your details are only in this browser tab. No event booking, email or registration was created.</p>
                <button type="button" className="pm-guide-button is-outline" onClick={() => setSubmitted(false)}>Edit details</button>
            </div> : <form className="pm-event-registration-form" onSubmit={submit}>
                <label className="pm-guide-field-label" htmlFor="event-guest-name">Full name</label>
                <input className="pm-guide-control" id="event-guest-name" name="name" type="text" autoComplete="name" maxLength={120} required value={fullName} onChange={event => setFullName(event.target.value)}/>
                <label className="pm-guide-field-label" htmlFor="event-guest-email">Email address</label>
                <input className="pm-guide-control" id="event-guest-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)}/>
                <label className="pm-guide-field-label" htmlFor="event-guest-phone">Phone number</label>
                <input className="pm-guide-control" id="event-guest-phone" name="tel" type="tel" autoComplete="tel" placeholder="+880 1XXXXXXXXX" maxLength={20} required value={phone} onChange={event => setPhone(event.target.value)}/>
                <label className="pm-guide-field-label" htmlFor="event-guest-role">Current role or student status <span>(optional)</span></label>
                <input className="pm-guide-control" id="event-guest-role" name="role" type="text" autoComplete="organization-title" placeholder="e.g. Business Analyst or Student" maxLength={120} value={role} onChange={event => setRole(event.target.value)}/>
                {error && <p className="pm-event-input-error" role="alert">{error}</p>}
                <button className="pm-guide-button" type="submit">Register for free</button>
            </form>}
        </> : <>
            <p>This sample event is for PM Circle community members.</p>
            <p className="pm-event-preview-note">Joining PM Circle does not reserve a place. Event registration is not enabled for this prototype.</p>
            <EventAction href="/register">Join PM Circle free</EventAction>
        </>}
    </aside>;
}

function EventAbout({ event, featured }: { event: EventPreview; featured: boolean }) {
    const date = eventDateParts(event.date);
    return <section className="pm-event-about pm-event-detail-panel" aria-labelledby="pm-event-about-heading">
        <div className="pm-event-about-tags">
            {event.sponsored && <span className="pm-event-sponsor-badge">Sponsored event</span>}
            <span>{event.openToEveryone ? 'Open to everyone' : 'For members'} · Sample event</span>
        </div>
        <h2 id="pm-event-about-heading">About the event</h2>
        <p className="pm-event-about-meta">{date.full} · {featured ? '7:00–8:00 PM Dhaka time' : event.time} · {event.location === 'Online' ? 'Online' : `In person · ${featured ? 'Free' : event.location}`}</p>
        <div className="pm-event-organizers">
            <div><strong>Organized by</strong><div className="pm-event-organizer-name"><span aria-hidden="true">{featured ? 'NB' : 'PM'}</span>{event.host ?? 'PM Circle'}</div><small>{featured ? 'Company account' : 'Community organizer'}</small></div>
            <div><strong>Published by</strong><p>PM Circle Admin</p></div>
        </div>
        <p className="pm-event-description">{featured ? careerPreview.introduction : event.description}</p>
        {featured && <>
            <h3 className="pm-event-content-label">Agenda</h3>
            <div className="pm-event-agenda">{careerPreview.agenda.map(item => <div key={item.time}><strong>{item.time}</strong><span>{item.title}</span></div>)}</div>
            <h3 className="pm-event-content-label">Speakers</h3>
            <div className="pm-event-speakers">{careerPreview.speakers.map(person => <div key={person.name}><strong>{person.name}</strong><span>{person.title}</span></div>)}</div>
        </>}
    </section>;
}

function EventLocation({ event, featured }: { event: EventPreview; featured: boolean }) {
    if (!featured && event.location === 'Online') return null;
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(careerPreview.mapQuery)}`;
    return <section className="pm-event-detail-panel pm-event-location" aria-labelledby="pm-event-location-heading">
        <h2 id="pm-event-location-heading">Event location</h2>
        <strong>{featured ? careerPreview.venue : 'Venue to be confirmed'}</strong>
        <p>{featured ? careerPreview.address : `${event.location} · Sample location`}</p>
        {featured && <>
            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="pm-event-map-preview" aria-label="Open venue location in Google Maps">
                <img src="/images/events/agargaon-venue-preview.webp" alt="Map preview showing the Agargaon area of Dhaka" loading="lazy" decoding="async" width="770" height="240"/>
            </a>
            <a href={mapsLink} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
        </>}
    </section>;
}

function RelatedEvents({ event, events }: { event: EventPreview; events: EventPreview[] }) {
    const related = events.filter(item => item.slug !== event.slug).slice(0, 2);
    if (!related.length) return null;
    return <section className="pm-event-detail-panel pm-event-related" aria-labelledby="pm-event-related-heading">
        <h2 id="pm-event-related-heading">Related events</h2>
        <ul>{related.map(item => <li key={item.slug}>
            <Link href={eventHref(item.slug)}>{item.title}</Link>
            <span>{eventDateParts(item.date).full} · {item.location === 'Online' ? 'Online' : 'In person'}</span>
        </li>)}</ul>
        <Link href="/events">Browse all events</Link>
    </section>;
}

function EventDiscussion({ seedComments }: { seedComments: SampleComment[] }) {
    const [comments, setComments] = useState<SampleComment[]>(seedComments);
    const [displayName, setDisplayName] = useState('');
    const [message, setMessage] = useState('');
    const [notice, setNotice] = useState('');

    function post(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!displayName.trim() || !message.trim()) { setNotice('Enter your display name and a comment.'); return; }
        setComments(previous => [...previous, { id: (previous[previous.length - 1]?.id ?? 0) + 1, name: displayName.trim(), message: message.trim() }]);
        setDisplayName('');
        setMessage('');
        setNotice('Preview comment added in this browser tab only. It has not been published.');
    }

    return <section className="pm-event-detail-panel pm-event-discussion" aria-labelledby="pm-event-discussion-heading">
        <h2 id="pm-event-discussion-heading">Public discussion</h2>
        <p>Anyone can read or post comments. Sample posts stay in this browser tab.</p>
        <div className="pm-event-comments" aria-live="polite">{comments.map(comment => <article key={comment.id}>
            <strong>{comment.name}</strong><p>{comment.message}</p>
        </article>)}</div>
        <form onSubmit={post} className="pm-event-comment-form">
            <label className="pm-guide-field-label" htmlFor="event-comment-author">Display name</label>
            <input className="pm-guide-control" id="event-comment-author" type="text" required maxLength={80} value={displayName} onChange={event => setDisplayName(event.target.value)}/>
            <label className="pm-guide-field-label" htmlFor="event-comment-message">Comment</label>
            <textarea className="pm-guide-control" id="event-comment-message" rows={4} required maxLength={1500} value={message} onChange={event => setMessage(event.target.value)}/>
            {notice && <p role="status" className="pm-event-comment-notice">{notice}</p>}
            <button type="submit" className="pm-guide-button is-outline">Post comment</button>
        </form>
    </section>;
}

export default function CommunityEventDetails({ event, relatedEvents = [] }: { event: EventPreview; relatedEvents?: EventPreview[] }) {
    const { rewardPromotion } = usePage<{ rewardPromotion?: RewardPromotionData | null }>().props;
    const featured = event.slug === 'project-delivery-career';
    const subtitle = featured ? careerPreview.subtitle : event.description;
    return <PublicLayout siteLayout homePrototype guideLayout eventPrototype homeOfferLabel={rewardPromotion?.discountLabel}>
        <Head title={`${event.title} | Community Events | PM Circle`}><meta name="description" content={subtitle}/></Head>
        <div className="pm-events-page">
            <EventBanner title={event.title} description={subtitle} crumb={event.title}/>
            <div className="pm-event-wrap pm-event-main pm-event-detail-main">
                <div className="pm-event-detail-layout">
                    <div className="pm-event-detail-column">
                        <img className="pm-event-detail-hero" src={featured ? '/images/home/prototype/leader.webp' : '/images/home/prototype/stakeholder.webp'} alt="Project professionals collaborating at a table" width="800" height="330" decoding="async"/>
                        <EventAbout event={event} featured={featured}/>
                        <EventLocation event={event} featured={featured}/>
                        <RelatedEvents event={event} events={relatedEvents}/>
                        <EventDiscussion key={event.slug} seedComments={featured ? initialComments : []}/>
                    </div>
                    <EventRegistration key={event.slug} event={event}/>
                </div>
            </div>
        </div>
    </PublicLayout>;
}
