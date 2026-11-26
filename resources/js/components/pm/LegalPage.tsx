import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { LegalBody, type LegalPageData } from '@/components/pm/LegalContent';
import { Head, Link } from '@inertiajs/react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

export function LegalPage({ legalPage, document }: { legalPage: LegalPageData; document: 'terms' | 'privacy' }) {
    const { content, version, published_at } = legalPage;
    const tocSections = content.sections.filter(section => section.show_in_toc !== false);
    const titleId = document === 'terms' ? 'pm-terms-page-title' : 'pm-privacy-policy-title';
    const date = published_at ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${published_at.slice(0, 10)}T00:00:00Z`)) : null;
    return <PublicLayout siteLayout homePrototype guideLayout banner={{title: content.title, description: content.description, titleId}}>
        <Head title={`${content.title} | PM Circle`}>
            <meta name="description" content={content.meta_description}/>
        </Head>
        <div className={`pm-terms-page${document === 'privacy' ? ' pm-privacy-policy-page' : ''}`}>
            <LegacyPageHeading><section className="pm-terms-banner" aria-labelledby={titleId}>
                <div className="pm-terms-wrap">
                    <nav className="pm-terms-breadcrumb" aria-label="Breadcrumb">
                        <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">{content.title}</span>
                    </nav>
                    <h1 id={titleId}>{content.title}</h1>
                    <p>{content.description}</p>
                </div>
            </section></LegacyPageHeading>
            <div className="pm-terms-wrap pm-terms-main">
                <div className={`pm-terms-grid${tocSections.length ? '' : ' pm-terms-grid-no-toc'}`}>
                    {tocSections.length > 0 && <nav className="pm-terms-toc" aria-label={content.toc_title}>
                        <h2>{content.toc_title}</h2>
                        <ul>{tocSections.map(section => <li key={section.id}>
                            <a href={`#${section.id}`}>{section.toc_label || section.title}</a>
                        </li>)}</ul>
                    </nav>}
                    <article className="pm-terms-article" aria-label={content.title}>
                        <p className="pm-terms-updated">{version && date ? `Published ${date} · Version ${version}` : 'Draft for review · 22 November 2026'}</p>
                        {content.sections.map(section => <section className="pm-terms-section" key={section.id} id={section.id} aria-label={section.title}>
                            <h2>{section.title}</h2>
                            <LegalBody body={section.body}/>
                        </section>)}
                    </article>
                </div>
            </div>
        </div>
    </PublicLayout>;
}
