import { Head, Link } from '@inertiajs/react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type AboutFeature = {
    title: string;
    description: string;
    linkLabel: string;
    href: string;
};

const features: AboutFeature[] = [
    {
        title: 'Learn',
        description: 'Build practical skills in project planning, communication and delivery.',
        linkLabel: 'Browse courses',
        href: '/learning',
    },
    {
        title: 'Practise',
        description: 'Work through realistic scenarios and prepare for certification with timed practice.',
        linkLabel: 'Browse exam simulators',
        href: '/simulators',
    },
    {
        title: 'Connect',
        description: 'Discuss how others handle project challenges and join community events.',
        linkLabel: 'Browse events',
        href: '/events',
    },
];

function AboutFeatureCard({ title, description, linkLabel, href }: AboutFeature) {
    return <article className="pm-about-card">
        <h3>{title}</h3>
        <p>{description}</p>
        <Link href={href}>{linkLabel}</Link>
    </article>;
}

/** About Us prototype: homepage shell, centrally defined guide tokens, no page-specific data requests. */
export default function About() {
    return <PublicLayout siteLayout homePrototype guideLayout>
        <Head title="About PM Circle"/>
        <div className="pm-about-page">
            <section className="pm-about-banner" aria-labelledby="pm-about-title">
                <div className="pm-about-wrap">
                    <nav className="pm-about-breadcrumb" aria-label="Breadcrumb">
                        <Link href="/">Home</Link>
                        <span aria-hidden="true">/</span>
                        <span aria-current="page">About PM Circle</span>
                    </nav>
                    <h1 id="pm-about-title">About PM Circle</h1>
                    <p>Learn, practise and connect with people who manage projects.</p>
                </div>
            </section>

            <div className="pm-about-wrap pm-about-content">
                <section className="pm-about-intro" aria-labelledby="pm-about-intro-title">
                    <h2 id="pm-about-intro-title">Built around real project work</h2>
                    <p>PM Circle by ITQAN Consulting is a learning and practice community for project professionals in Bangladesh. It brings project management courses, exam practice and peer discussions into one place, whether you are starting out or already leading projects.</p>
                </section>

                <section className="pm-about-features" aria-labelledby="pm-about-features-title">
                    <h2 id="pm-about-features-title">What you can do on PM Circle</h2>
                    <div className="pm-about-cards">
                        {features.map(feature => <AboutFeatureCard key={feature.title} {...feature}/>)}
                    </div>
                </section>

                <section className="pm-about-itqan" aria-labelledby="pm-about-itqan-title">
                    <h2 id="pm-about-itqan-title">Developed by ITQAN Consulting</h2>
                    <p>The platform draws on ITQAN’s work in project delivery, consulting and training. AI tools support activities like résumé review and interview practice, while practical examples and peer discussion help members put ideas to work.</p>
                    <a href="https://www.itqanconsulting.com/" target="_blank" rel="noopener noreferrer">Visit ITQAN Consulting</a>
                </section>
            </div>
        </div>
    </PublicLayout>;
}
