import { Head, Link, usePage } from '@inertiajs/react';
import { ContactForm } from '@/components/contact/ContactForm';
import { ContactChat, ContactSupportCards } from '@/components/contact/ContactChat';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type SupportProps = {
    mode: 'help' | 'contact';
    topics?: string[];
    supportEmail?: string | null;
    contactAvailable?: boolean;
    recaptchaSiteKey?: string | null;
    contactStatus?: string | null;
    chatHours?: string;
};

export default function Support({ mode, topics = [], supportEmail = null, contactAvailable = false, recaptchaSiteKey = null, contactStatus = null, chatHours = 'Mon–Sat · 10 AM–6 PM (Bangladesh time)' }: SupportProps) {
    const { errors } = usePage<{ errors?: Record<string,string> }>().props;
    if (mode === 'help') return <PublicLayout siteLayout>
        <Head title="Help Centre | PM Circle"/><div className="pm-container pm-page pm-contact-help-page"><h1>Help Centre</h1>
            <p>Find information about learning, practice and the PM Circle community.</p>
            <div className="pm-contact-card pm-contact-help-links"><Link href="/exam-simulator/pmp#simulator-faq">PMP Exam Simulator FAQs</Link><Link href="/learning">Learn &amp; Practice</Link><Link href="/community">Community discussions</Link><Link href="/contact">Contact us</Link></div>
        </div>
    </PublicLayout>;

    return <PublicLayout siteLayout active="/contact">
        <Head title="Contact us | PM Circle"/><div className="pm-contact-page">
            <div className="pm-container pm-page pm-contact-container">
                <nav className="pm-contact-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span aria-current="page">Contact Us</span></nav>
                <header className="pm-contact-page-heading"><h1>Contact us</h1><p>Tell us what you need help with and we'll get your message to the right team.</p></header>
                {contactStatus && <div role="status" className="pm-contact-status-notice">{contactStatus}</div>}
                {errors && Object.keys(errors).length > 0 && <div role="alert" className="pm-contact-error pm-contact-status-notice">{Object.values(errors)[0]}</div>}
                <div className="pm-contact-layout"><ContactForm topics={topics} available={contactAvailable} recaptchaSiteKey={recaptchaSiteKey}/><ContactSupportCards email={supportEmail} hours={chatHours}/></div>
            </div><ContactChat hours={chatHours}/>
        </div>
    </PublicLayout>;
}
