import { useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { GoogleRecaptchaCheckbox } from './GoogleRecaptchaCheckbox';

type ContactData = {
    name: string;
    email: string;
    topic: string;
    subject: string;
    message: string;
    recaptcha_token: string;
    website: string;
};

export function ContactForm({ topics, available, recaptchaSiteKey }: { topics: string[]; available: boolean; recaptchaSiteKey: string | null }) {
    const form = useForm<ContactData>({ name: '', email: '', topic: '', subject: '', message: '', recaptcha_token: '', website: '' });
    const [showUnavailable, setShowUnavailable] = useState(false);
    const [captchaError, setCaptchaError] = useState('');
    const [captchaResetKey, setCaptchaResetKey] = useState(0);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!available || !recaptchaSiteKey) { setShowUnavailable(true); return; }
        if (form.processing) return;
        if (!form.data.recaptcha_token) {
            setCaptchaError('Please complete Google reCAPTCHA before sending your message.');
            return;
        }
        form.post('/contact', {
            preserveScroll: true,
            onSuccess: () => form.reset('name', 'email', 'topic', 'subject', 'message', 'website'),
            onFinish: () => {
                form.setData('recaptcha_token', '');
                setCaptchaResetKey(value => value + 1);
            },
        });
    }

    return <section className="pm-contact-card pm-contact-form-card" aria-labelledby="pm-contact-form-heading">
        <h2 id="pm-contact-form-heading">Send us a message</h2>
        <form onSubmit={submit} noValidate>
            <div className="pm-contact-form-columns">
                <div className="pm-contact-field"><label htmlFor="pm-contact-name">Full name</label>
                    <input id="pm-contact-name" autoComplete="name" name="name" maxLength={120} required placeholder="Enter your full name" value={form.data.name} onChange={e => form.setData('name', e.target.value)} aria-invalid={Boolean(form.errors.name)} aria-describedby={form.errors.name ? 'pm-contact-name-error' : undefined}/>
                    {form.errors.name && <span id="pm-contact-name-error" className="pm-contact-error" role="alert">{form.errors.name}</span>}</div>
                <div className="pm-contact-field"><label htmlFor="pm-contact-email">Email address</label>
                    <input id="pm-contact-email" type="email" autoComplete="email" name="email" maxLength={254} required placeholder="Enter your email address" value={form.data.email} onChange={e => form.setData('email', e.target.value)} aria-invalid={Boolean(form.errors.email)} aria-describedby={form.errors.email ? 'pm-contact-email-error' : undefined}/>
                    {form.errors.email && <span id="pm-contact-email-error" className="pm-contact-error" role="alert">{form.errors.email}</span>}</div>
            </div>
            <div className="pm-contact-field"><label htmlFor="pm-contact-topic">What can we help with?</label>
                <select id="pm-contact-topic" name="topic" required value={form.data.topic} onChange={e => form.setData('topic', e.target.value)} aria-invalid={Boolean(form.errors.topic)}>
                    <option value="">Select a topic</option>{topics.map(item => <option key={item} value={item}>{item}</option>)}
                </select><small>Account, exam simulator, billing, feedback or complaints</small>
                {form.errors.topic && <span className="pm-contact-error" role="alert">{form.errors.topic}</span>}</div>
            <div className="pm-contact-field"><label htmlFor="pm-contact-subject">Subject</label>
                <input id="pm-contact-subject" name="subject" required maxLength={180} placeholder="Enter a short subject" value={form.data.subject} onChange={e => form.setData('subject', e.target.value)} aria-invalid={Boolean(form.errors.subject)}/>
                {form.errors.subject && <span className="pm-contact-error" role="alert">{form.errors.subject}</span>}</div>
            <div className="pm-contact-field"><label htmlFor="pm-contact-message">Message</label>
                <textarea id="pm-contact-message" name="message" required minLength={10} maxLength={5000} placeholder="Type your message here..." value={form.data.message} onChange={e => form.setData('message', e.target.value)} aria-invalid={Boolean(form.errors.message)}/>
                <small>Include any details that will help us look into this.</small>
                {form.errors.message && <span className="pm-contact-error" role="alert">{form.errors.message}</span>}</div>
            {recaptchaSiteKey
                ? <GoogleRecaptchaCheckbox
                    siteKey={recaptchaSiteKey}
                    resetKey={captchaResetKey}
                    onVerify={token => {
                        form.setData('recaptcha_token', token);
                        if (token) { form.clearErrors('recaptcha_token'); setCaptchaError(''); }
                    }}
                    onError={setCaptchaError}
                />
                : <p className="pm-contact-error" role="status">Google reCAPTCHA is not configured yet.</p>}
            {(form.errors.recaptcha_token || captchaError) && <span className="pm-contact-error" role="alert">{form.errors.recaptcha_token || captchaError}</span>}
            <div className="pm-contact-honeypot" aria-hidden="true"><label htmlFor="pm-contact-website">Website</label><input id="pm-contact-website" name="website" tabIndex={-1} autoComplete="off" value={form.data.website} onChange={e => form.setData('website', e.target.value)}/></div>
            {showUnavailable && !available && <p className="pm-contact-error pm-contact-unavailable" role="status">Contact delivery or verification is not configured yet. Please try again later.</p>}
            <div className="pm-contact-submit-row"><button className="pm-contact-primary" type="submit" disabled={form.processing}>{form.processing ? 'Sending...' : 'Send message'}</button>
                <span>Email verification required before sending</span></div>
        </form>
    </section>;
}
