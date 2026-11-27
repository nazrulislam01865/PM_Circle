import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Head, Link } from '@inertiajs/react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type RefundParagraph = { text: string; linkLabel?: string | null; href?: string | null };
type RefundSection = { title: string; navigationTitle: string; paragraphs: RefundParagraph[] };
const sectionIds = ['monthly-plan-payments', 'cancel-your-plan', 'payment-and-access-issues', 'consumer-rights'] as const;
type RefundContent = { banner: { title: string; description: string }; navigation: { title: string; enabled: boolean } } & Record<typeof sectionIds[number], RefundSection>;

function Paragraph({ text, linkLabel, href }: RefundParagraph) {
    const position = linkLabel && href ? text.indexOf(linkLabel) : -1;
    if (position < 0 || !linkLabel || !href) return <>{text}</>;
    return <>{text.slice(0, position)}{href.startsWith('/') ? <Link href={href}>{linkLabel}</Link> : <a href={href}>{linkLabel}</a>}{text.slice(position + linkLabel.length)}</>;
}

export default function PolicyNotice({ content }: { content: RefundContent }) {
    const { banner, navigation } = content;
    const sections = sectionIds.map(id => ({ id, ...content[id] }));
    return <PublicLayout siteLayout homePrototype guideLayout banner={{title: banner.title, description: banner.description, titleId: 'pm-refund-title'}}>
        <Head title={banner.title}>
            <meta name="description" content={banner.description}/>
        </Head>
        <div className="pm-terms-page pm-refund-page">
            <LegacyPageHeading><section className="pm-terms-banner" aria-labelledby="pm-refund-title">
                <div className="pm-terms-wrap">
                    <nav className="pm-terms-breadcrumb" aria-label="Breadcrumb">
                        <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">{banner.title}</span>
                    </nav>
                    <h1 id="pm-refund-title">{banner.title}</h1>
                    <p>{banner.description}</p>
                </div>
            </section></LegacyPageHeading>
            <div className="pm-terms-wrap pm-terms-main">
                <div className={`pm-terms-grid${navigation.enabled ? '' : ' pm-terms-grid-no-toc'}`}>
                    {navigation.enabled && <nav className="pm-terms-toc" aria-label={navigation.title}>
                        <h2>{navigation.title}</h2>
                        <ul>{sections.map(section => <li key={section.id}>
                            <a href={`#${section.id}`}>{section.navigationTitle}</a>
                        </li>)}</ul>
                    </nav>}
                    <article className="pm-terms-article" aria-labelledby="pm-refund-title">
                        {sections.map(section => <section className="pm-terms-section" key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
                            <h2 id={`${section.id}-title`}>{section.title}</h2>
                            {section.paragraphs.map((paragraph, index) => <p key={index}><Paragraph {...paragraph}/></p>)}
                        </section>)}
                    </article>
                </div>
            </div>
        </div>
    </PublicLayout>;
}
