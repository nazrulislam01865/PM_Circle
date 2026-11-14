import { Link } from '@inertiajs/react';
import { Mail, MessageCircle, MessageSquare, X } from 'lucide-react';
import { useState } from 'react';

/** Live-agent backend is not installed. Never represent fixed office hours as online agents. */
export function ContactChat({ hours }: { hours: string }) {
    const [open, setOpen] = useState(false);
    return <div className="pm-contact-live-root">
        {open && <section className="pm-contact-chat-popover" aria-label="PM Circle live chat">
            <div className="pm-contact-chat-top"><span><MessageCircle size={17} aria-hidden="true"/> PM Circle Live Chat</span><span className="pm-contact-chat-status"><i/> Offline</span><button type="button" onClick={() => setOpen(false)} aria-label="Close live chat"><X size={18}/></button></div>
            <div className="pm-contact-chat-body"><strong>Chat is currently closed.</strong><p>Live chat is not connected yet. Please send our team a message using the contact form.</p><p>Support hours: {hours}</p><button type="button" onClick={() => { setOpen(false); document.getElementById('pm-contact-name')?.focus(); }}>Send us a message</button></div>
        </section>}
        <button type="button" className="pm-contact-chat-launcher" aria-expanded={open} aria-label={open ? 'Close live chat' : 'Open live chat information'} onClick={() => setOpen(value => !value)}><MessageCircle size={20} aria-hidden="true"/> Live chat</button>
    </div>;
}

export function ContactSupportCards({ email, hours }: { email: string | null; hours: string }) {
    return <div className="pm-contact-support-stack">
        <section className="pm-contact-card pm-contact-support-card"><h2>Email support</h2>
            <div className="pm-contact-support-detail"><span className="pm-contact-support-icon"><Mail aria-hidden="true" size={22}/></span>
                <div>{email ? <a href={`mailto:${email}`}>{email}</a> : <strong>Support email not configured</strong>}<small>{email ? 'Email our support team' : 'A verified support address will appear here'}</small></div>
            </div>
        </section>
        <section className="pm-contact-card pm-contact-support-card"><div className="pm-contact-chat-card-heading"><h2>Live chat</h2><span className="pm-contact-offline"><i/> Offline</span></div>
            <div className="pm-contact-chat-card-bottom"><MessageSquare size={24} aria-hidden="true"/><span>{hours}</span><Link href="/contact#pm-contact-form-heading" className="pm-contact-chat-card-link">Contact form</Link></div>
        </section>
    </div>;
}
