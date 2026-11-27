import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Head, Link } from '@inertiajs/react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { AboutContent, AboutFeature } from '@/types/public-content';
import { safeLink } from '@/components/pm/legal-links';

function AboutLink({ href, label }: { href: string; label: string }) {
    const kind = safeLink(href);
    return kind === 'local' ? <Link href={href}>{label}</Link> : kind === 'external' ? <a href={href} target="_blank" rel="noopener noreferrer">{label}</a> : null;
}

function AboutFeatureCard({ title, description, linkLabel, href }: AboutFeature) {
    return <article className="pm-about-card"><h3>{title}</h3><p>{description}</p><AboutLink href={href} label={linkLabel}/></article>;
}

export default function About({ content }: { content: AboutContent }) {
    const { banner, intro, features, company } = content;
    return <PublicLayout siteLayout homePrototype guideLayout banner={{...banner, titleId: 'pm-about-title'}}>
        <Head title={banner.title}><meta name="description" content={banner.description}/></Head>
        <div className="pm-about-page">
            <LegacyPageHeading><section className="pm-about-banner" aria-labelledby="pm-about-title"><div className="pm-about-wrap"><nav className="pm-about-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">{banner.title}</span></nav><h1 id="pm-about-title">{banner.title}</h1><p>{banner.description}</p></div></section></LegacyPageHeading>
            <div className="pm-about-wrap pm-about-content">
            {intro.enabled && <section className="pm-about-intro" aria-labelledby="pm-about-intro-title"><h2 id="pm-about-intro-title">{intro.title}</h2><p>{intro.description}</p></section>}
            {features.enabled && <section className="pm-about-features" aria-labelledby="pm-about-features-title"><h2 id="pm-about-features-title">{features.title}</h2><div className="pm-about-cards">{features.cards.map((feature, index) => <AboutFeatureCard key={index} {...feature}/>)}</div></section>}
            {company.enabled && <section className="pm-about-itqan" aria-labelledby="pm-about-itqan-title"><h2 id="pm-about-itqan-title">{company.title}</h2><p>{company.description}</p><AboutLink href={company.href} label={company.linkLabel}/></section>}
        </div></div>
    </PublicLayout>;
}
