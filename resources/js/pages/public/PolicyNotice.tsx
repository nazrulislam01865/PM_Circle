import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type RefundSection = {
    id: string;
    title: string;
    navigationTitle?: string;
    paragraphs: ReactNode[];
};

// Approved refund-policy prototype copy. Static content needs no page-specific request.
const sections: RefundSection[] = [
    {
        id: 'monthly-plan-payments',
        title: 'Monthly plan payments',
        paragraphs: [
            <>Completed monthly plan payments are non-refundable, including if you change your mind, use only part of your plan, or cancel during a paid month. This policy applies to PM Circle’s monthly subscription plans.</>,
        ],
    },
    {
        id: 'cancel-your-plan',
        title: 'Cancel your plan any time',
        navigationTitle: 'Cancel your plan',
        paragraphs: [
            <>You can cancel at any time. To avoid the next charge on a renewing plan, cancel before the next renewal date. You can continue using your paid features until the end of the period you have already paid for. Cancellation does not generate a prorated refund.</>,
            <>If you need help cancelling, <Link href="/contact">contact PM Circle support through ITQAN Consulting</Link>.</>,
        ],
    },
    {
        id: 'payment-and-access-issues',
        title: 'Payment and access issues',
        paragraphs: [
            <>If you were charged but your plan did not activate, you cannot access the features you paid for, or you see a billing error, <Link href="/contact">report the issue</Link>. Include your account email, payment date and order or transaction reference. We will check the payment and resolve any confirmed billing or activation issue.</>,
        ],
    },
    {
        id: 'consumer-rights',
        title: 'Consumer rights',
        paragraphs: [
            <>Any refund or other remedy required by applicable law remains available. See the <Link href="/terms">Terms and Conditions</Link> for more on purchases and plan access.</>,
        ],
    },
];

export default function PolicyNotice() {
    return <PublicLayout siteLayout homePrototype guideLayout>
        <Head title="Refund Policy">
            <meta name="description" content="Monthly plan payments, cancellations and purchase support."/>
        </Head>
        <div className="pm-terms-page pm-refund-page">
            <section className="pm-terms-banner" aria-labelledby="pm-refund-title">
                <div className="pm-terms-wrap">
                    <nav className="pm-terms-breadcrumb" aria-label="Breadcrumb">
                        <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Refund Policy</span>
                    </nav>
                    <h1 id="pm-refund-title">Refund Policy</h1>
                    <p>Monthly plan payments, cancellations and purchase support.</p>
                </div>
            </section>
            <div className="pm-terms-wrap pm-terms-main">
                <div className="pm-terms-grid">
                    <nav className="pm-terms-toc" aria-label="On this page">
                        <h2>On this page</h2>
                        <ul>{sections.map(section => <li key={section.id}>
                            <a href={`#${section.id}`}>{section.navigationTitle ?? section.title}</a>
                        </li>)}</ul>
                    </nav>
                    <article className="pm-terms-article" aria-labelledby="pm-refund-title">
                        {sections.map(section => <section className="pm-terms-section" key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
                            <h2 id={`${section.id}-title`}>{section.title}</h2>
                            {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                        </section>)}
                    </article>
                </div>
            </div>
        </div>
    </PublicLayout>;
}
