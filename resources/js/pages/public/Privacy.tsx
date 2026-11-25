import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type PrivacySection = {
    id: string;
    title: string;
    body: ReactNode;
};

const description = 'How PM Circle handles your information and the choices available to you.';

// The supplied prototype is a draft for review, not a new consent version.
const sections: PrivacySection[] = [
    {
        id: 'who-we-are',
        title: 'Who we are',
        body: <p>PM Circle is a learning, practice and professional community from ITQAN Consulting. This policy describes how information is handled when you browse the site, create an account, use member features or contact us.</p>,
    },
    {
        id: 'information-we-collect',
        title: 'Information we collect',
        body: <ul className="pm-terms-list">
            <li><strong>Account and profile.</strong> Name, email, account credentials or verification information, profile photo, and professional details you choose to add.</li>
            <li><strong>Learning and practice.</strong> Courses, progress, practice answers, simulator attempts, scores, feedback and achievements.</li>
            <li><strong>Community and events.</strong> Posts, comments, reactions, reports, event registrations and details requested on the registration form, such as contact information.</li>
            <li><strong>Career and AI tools.</strong> Résumés and other files you upload, prompts, interview responses, and the feedback or drafts generated from them. If you choose voice input where offered, this can include audio or a transcript.</li>
            <li><strong>Purchases and support.</strong> Plan or product purchased, transaction reference, billing details needed for the order and messages you send to support. Payment providers may collect payment information directly.</li>
            <li><strong>Technical information.</strong> Device and browser details, IP address, activity logs, and cookie or browser storage information used to operate and protect the service.</li>
        </ul>,
    },
    {
        id: 'how-we-use-information',
        title: 'How we use information',
        body: <p>We use information to verify accounts, provide features, save progress, score attempts, generate requested feedback, manage subscriptions and event registrations, respond to requests, and protect the service. We may also use activity information to understand which features are working and improve them. Where required, we ask for consent or provide a choice for optional uses.</p>,
    },
    {
        id: 'profiles-community-and-event-visibility',
        title: 'Profiles, community and event visibility',
        body: <>
            <p>Choose what to share in your profile and check who can see a contribution before posting. Information you publish publicly can be viewed by visitors. Where the anonymous posting feature is available, other members see an anonymous label and authorised moderators can identify the author when handling reports or misuse.</p>
            <p>For events, the registration form should identify the organiser and explain what details are shared for registration, event communications or attendance. An external organiser may handle its copy under its own privacy notice.</p>
        </>,
    },
    {
        id: 'ai-features-and-automated-feedback',
        title: 'AI features and automated feedback',
        body: <>
            <p>When you request AI assistance, relevant material may be sent to the provider supporting that feature. This can include résumé text, interview responses or scenario answers. AI may also assist with feedback or moderation. Review results for accuracy and share only information you have permission to use.</p>
            <p>We will identify provider handling, including retention and any model-training use, in the relevant feature notice where applicable. Contact us if you want to question an AI-assisted moderation decision or request a review.</p>
        </>,
    },
    {
        id: 'who-may-receive-information',
        title: 'Who may receive information',
        body: <p>We may share the information needed to provide a service with hosting, email, analytics, payment, AI and other service providers, or with an event organiser as described at registration. We may also disclose information where required by law or to respond to fraud, abuse or a security incident. Some service providers may process information outside Bangladesh. Applicable safeguards depend on the service and the transfer.</p>,
    },
    {
        id: 'cookies-and-browser-storage',
        title: 'Cookies and browser storage',
        body: <p>We may use cookies or browser storage for sign-in, preferences and security. Optional analytics, where enabled, help us understand usage. You can manage browser storage in your browser settings and optional cookies through any controls provided on the site.</p>,
    },
    {
        id: 'retention-and-security',
        title: 'Retention and security',
        body: <p>We keep records for as long as needed for their purpose, including account access, learning history, support, billing and resolving disputes. Retention varies by type of record and applicable requirements. We use measures designed to protect information and restrict access to authorised people. Use a unique password and let us know if you suspect unauthorised access.</p>,
    },
    {
        id: 'your-choices-and-requests',
        title: 'Your choices and requests',
        body: <p>You can update profile information and visibility settings where those controls are available. Depending on applicable law, you may request access, correction, deletion or a copy of your information, withdraw consent, or object to or restrict certain uses. To make a request, <Link href="/contact">contact ITQAN Consulting</Link> and include the email linked to your account. We may verify your identity before acting on the request.</p>,
    },
    {
        id: 'childrens-privacy',
        title: 'Children’s privacy',
        body: <p>Children who need consent to use the service under applicable law should use it only with the required permission. If you believe a child provided personal information without the required consent, contact us so we can review it.</p>,
    },
    {
        id: 'changes-and-contact',
        title: 'Changes and contact',
        body: <p>We will post updates on this page and notify members of material changes where required. For a privacy question, data request or concern, <Link href="/contact">contact ITQAN Consulting</Link>. See also our <Link href="/terms">Terms and Conditions</Link>.</p>,
    },
];

export default function Privacy() {
    return <PublicLayout siteLayout homePrototype guideLayout banner={{title: 'Privacy Policy', description, titleId: 'pm-privacy-policy-title'}}>
        <Head title="Privacy Policy">
            <meta name="description" content={description}/>
        </Head>
        <div className="pm-terms-page pm-privacy-policy-page">
            <LegacyPageHeading><section className="pm-terms-banner" aria-labelledby="pm-privacy-policy-title">
                <div className="pm-terms-wrap">
                    <nav className="pm-terms-breadcrumb" aria-label="Breadcrumb">
                        <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Privacy Policy</span>
                    </nav>
                    <h1 id="pm-privacy-policy-title">Privacy Policy</h1>
                    <p>{description}</p>
                </div>
            </section></LegacyPageHeading>
            <div className="pm-terms-wrap pm-terms-main">
                <div className="pm-terms-grid">
                    <nav className="pm-terms-toc" aria-label="On this page">
                        <h2>On this page</h2>
                        <ul>{sections.map(section => <li key={section.id}>
                            <a href={`#${section.id}`}>{section.title}</a>
                        </li>)}</ul>
                    </nav>
                    <article className="pm-terms-article" aria-labelledby="pm-privacy-policy-title">
                        <p className="pm-terms-updated">Draft for review · 22 November 2026</p>
                        {sections.map(section => <section className="pm-terms-section" key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
                            <h2 id={`${section.id}-title`}>{section.title}</h2>
                            {section.body}
                        </section>)}
                    </article>
                </div>
            </div>
        </div>
    </PublicLayout>;
}
