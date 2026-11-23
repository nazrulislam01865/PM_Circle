import { Head, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { RewardPromotionData } from '@/types/reward';

type TermsSection = {
    id: string;
    title: string;
    body: ReactNode;
};

// The approved prototype is explicitly marked as a draft for review.
// Keep this content static until the actual legal policy is approved; do not add a query.
const sections: TermsSection[] = [
    {
        id: 'about',
        title: 'About these terms',
        body: <>These terms govern access to PM Circle, a learning, practice and community service from ITQAN Consulting. By creating an account or using PM Circle, you agree to the terms that apply to your use. Our <Link href="/privacy">Privacy Policy</Link> explains how information is handled.</>,
    },
    {
        id: 'accounts',
        title: 'Accounts and eligibility',
        body: <>Provide accurate account information, keep your credentials secure and tell us if you suspect unauthorised access. Use your own account and do not sell or share access. If you need parent or guardian consent under applicable law, obtain it before using the service.</>,
    },
    {
        id: 'plans',
        title: 'Plans, purchases and refunds',
        body: <>Access depends on your plan, purchase or any offer shown at checkout. Before paying, review the total price, access period, included features, renewal terms if applicable, and cancellation and refund conditions. You can cancel a monthly plan at any time. Completed monthly plan payments are non-refundable, subject to any rights provided by law. See our <Link href="/refund-policy">Refund Policy</Link> for cancellation and purchase support. Contact us with your order reference if there is a billing error or you cannot access what you purchased.</>,
    },
    {
        id: 'learning',
        title: 'Learning content and exam practice',
        body: <>Courses, practice tests and feedback are for learning and preparation. Simulator scores are practice results. Passing an official exam, obtaining certification or securing employment depends on the relevant provider or employer. Certification names identify the exams being discussed. Any affiliation or endorsement will be stated where applicable.</>,
    },
    {
        id: 'ai-tools',
        title: 'AI tools and career guidance',
        body: <>AI suggestions, scores and sample answers can contain mistakes or miss context. Review them before relying on them or sharing them. For a résumé, use only descriptions and results you can verify. For interview practice and career guidance, use feedback to prepare and make your own decisions.</>,
    },
    {
        id: 'community',
        title: 'Community rules and moderation',
        body: <>Respect other members and follow the <Link href="/community">Community Guidelines</Link>. Do not post harassment, spam, misleading claims, leaked exam content, or personal information without permission. Do not impersonate others or misuse anonymous posting. We may review reports, restrict visibility or suspend access for misuse. Contact us to request review of a moderation decision.</>,
    },
    {
        id: 'content',
        title: 'Your content and platform materials',
        body: <>You retain rights to original content you submit. You give PM Circle permission to store, process and display it as needed to operate the features you use and honour your visibility settings. Submit only material you have the right to share. PM Circle learning and simulator materials are provided for personal use. Redistribution, resale or republishing requires permission unless applicable law allows it.</>,
    },
    {
        id: 'events',
        title: 'Events and third-party services',
        body: <>Event pages identify the organiser, eligibility and any registration requirements. Member-hosted and sponsored events may have additional rules. Check the event page before registering. External organisers and linked services are responsible for their own offers, content and terms. Sponsored placement identifies paid promotion where applicable.</>,
    },
    {
        id: 'changes',
        title: 'Service changes and account closure',
        body: <>Features and content may change or be temporarily unavailable. We may restrict an account to address misuse, protect members or comply with law. If a change affects paid access, applicable purchase terms and consumer rights continue to apply. Contact us to request account closure.</>,
    },
    {
        id: 'rights',
        title: 'Consumer rights and disputes',
        body: <>These terms apply subject to applicable law. Your mandatory consumer rights remain available. If there is a problem, contact us with the details so we can try to resolve it. If we cannot resolve it, you may use any complaint or dispute-resolution route available to you under applicable law.</>,
    },
    {
        id: 'updates',
        title: 'Updates and contact',
        body: <>We will post revised terms here and notify members of material changes where required. For questions about an account, purchase, event or these terms, <Link href="/contact">contact ITQAN Consulting</Link>.</>,
    },
];

export default function Terms() {
    const { rewardPromotion } = usePage<{ rewardPromotion?: RewardPromotionData | null }>().props;

    return <PublicLayout siteLayout homePrototype guideLayout homeOfferLabel={rewardPromotion?.discountLabel}>
        <Head title="Terms and Conditions | PM Circle">
            <meta name="description" content="Read the PM Circle terms and conditions for accounts, learning, exam practice, community participation and purchases."/>
        </Head>
        <div className="pm-terms-page">
            <section className="pm-terms-banner" aria-labelledby="pm-terms-page-title">
                <div className="pm-terms-wrap">
                    <nav aria-label="Breadcrumb" className="pm-terms-breadcrumb">
                        <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Terms and Conditions</span>
                    </nav>
                    <h1 id="pm-terms-page-title">Terms and Conditions</h1>
                    <p>The rules for using PM Circle, joining the community and purchasing access.</p>
                </div>
            </section>
            <div className="pm-terms-wrap pm-terms-main">
                <div className="pm-terms-grid">
                    <nav className="pm-terms-toc" aria-label="On this page">
                        <h2>On this page</h2>
                        <ul>{sections.map(section => <li key={section.id}>
                            <a href={`#${section.id}`}>{section.title}</a>
                        </li>)}</ul>
                    </nav>
                    <article className="pm-terms-article" aria-label="Terms and conditions draft">
                        <p className="pm-terms-updated">Draft for review · 22 November 2026</p>
                        {sections.map(section => <section className="pm-terms-section" key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
                            <h2 id={`${section.id}-title`}>{section.title}</h2>
                            <p>{section.body}</p>
                        </section>)}
                    </article>
                </div>
            </div>
        </div>
    </PublicLayout>;
}
