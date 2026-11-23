import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Facebook, Instagram, Linkedin, Save, Youtube } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { ContentField, HomepageImageUploader, RepeatableItems } from '@/components/admin/HomepageFields';
import { HomeFooter } from '@/components/home/v2/HomeFooter';
import type { PmpPublicContent } from '@/types/pmp-public';

type Footer = PmpPublicContent['footer'];
type RouteChoice = { value: string; label: string };
type SocialNetwork = keyof Footer['social'];
type Props = { footer: Footer; version: number; routeChoices: RouteChoice[] };

const socialNetworks = [
    { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
    { key: 'facebook', label: 'Facebook', Icon: Facebook },
    { key: 'instagram', label: 'Instagram', Icon: Instagram },
    { key: 'youtube', label: 'YouTube', Icon: Youtube },
] as const;

/** One editor for the footer rendered by every public/member page. */
export default function SiteFooterEditor({ footer, version, routeChoices }: Props) {
    const [data, setData] = useState<Footer>(footer);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => { setData(footer); setDirty(false); }, [footer, version]);
    useEffect(() => {
        if (!dirty) return;
        const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', protect);
        return () => window.removeEventListener('beforeunload', protect);
    }, [dirty]);

    function change<K extends keyof Footer>(key: K, value: Footer[K]) {
        setData(current => ({ ...current, [key]: value }));
        setDirty(true);
        setSaved(false);
    }
    function text(key: keyof Footer, label: string, multiline = false, hint?: string) {
        return <ContentField key={key} id={`footer-${key}`} label={label} value={String(data[key] ?? '')}
            type={multiline ? 'textarea' : 'text'} hint={hint} error={errors[`footer.${key}`]}
            onChange={value => change(key, value as Footer[typeof key])}/>;
    }
    function list(key: 'explore_links' | 'support_links' | 'legal_links', label: string, max: number) {
        return <RepeatableItems collapsible title={label} path={`footer.${key}`}
            rows={data[key] as unknown as Record<string, unknown>[]}
            fields={[{ key: 'label', label: 'Link text' }, { key: 'href', label: 'Destination', kind: 'route', choices: routeChoices }]}
            layout="stacked" max={max} errors={errors}
            onChange={rows => change(key, rows as unknown as Footer[typeof key])}/>;
    }
    function checkbox(key: 'show_brand' | 'show_about' | 'show_explore' | 'show_support' | 'show_social' | 'show_newsletter' | 'show_newsletter_form' | 'show_payments' | 'show_legal' | 'show_trends' | 'show_membership' | 'show_disclaimer', label: string, hint?: string) {
        return <label className="pm-admin-check-row pm-footer-control-choice" key={key}>
            <input type="checkbox" checked={data[key]} onChange={event => change(key, event.target.checked)}/>
            <span><strong>{label}</strong>{hint && <small>{hint}</small>}</span>
        </label>;
    }
    function save() {
        if (!dirty || saving) return;
        setSaving(true); setErrors({});
        router.put('/admin/footer', { footer: data, version }, {
            preserveScroll: true,
            onSuccess: () => { setDirty(false); setSaved(true); },
            onError: invalid => { setErrors(invalid); setSaved(false); },
            onFinish: () => setSaving(false),
        });
    }
    const saveButton = <button className="pm-admin-button pm-admin-button-primary" type="button" disabled={!dirty || saving} onClick={save}>
        <Save size={17}/>{saving ? 'Saving…' : 'Save footer'}
    </button>;

    return <AdminLayout title="Shared site footer" subtitle="Manage the same footer shown on the public homepage and other eligible pages."
        active="/admin/footer">
        <div className="pm-admin-editor-toolbar pm-admin-panel">
            <div><span className="pm-admin-kicker">PUBLIC WEBSITE</span><strong>Footer management</strong>
                <small>{dirty ? 'Unsaved changes' : 'Changes apply site-wide after saving'}</small></div>
            <div className="pm-admin-editor-actions">
                <Link className="pm-admin-button pm-admin-button-quiet" href="/" target="_blank">View footer <ExternalLink size={16}/></Link>
                {saveButton}
            </div>
        </div>
        {saved && <p className="pm-admin-notice pm-admin-notice-success" role="status"><CheckCircle2 size={18}/> Footer saved. Public pages now use the updated settings.</p>}
        {Object.keys(errors).length > 0 && <p className="pm-admin-notice pm-admin-notice-error" role="alert"><AlertCircle size={18}/>{errors.version ?? Object.values(errors)[0]}</p>}
        <section className="pm-admin-panel pm-footer-admin-editor" aria-label="Shared footer settings">
            <div className="pm-footer-admin-section">
                <div className="pm-admin-section-heading"><h2>Footer visibility</h2><p>Choose which parts appear on the public footer. Hiding a part does not delete its contents.</p></div>
                <div className="pm-footer-admin-toggle-grid">
                    {checkbox('show_brand', 'Brand logo and name')}
                    {checkbox('show_about', 'About text')}
                    {checkbox('show_explore', 'Quick links')}
                    {checkbox('show_support', 'Support links')}
                    {checkbox('show_social', 'Social icons')}
                    {checkbox('show_newsletter', 'Email updates')}
                    {checkbox('show_payments', 'Payment badges')}
                    {checkbox('show_legal', 'Copyright and legal links')}
                </div>
            </div>
            <div className="pm-footer-admin-section">
                <div className="pm-admin-section-heading"><h2>Brand and about</h2><p>Only the footer brand changes here. The site header logo remains unchanged.</p></div>
                {text('brand_name', 'Footer brand name')}
                {text('brand_tagline', 'Brand byline')}
                <div className="pm-admin-field"><span className="pm-admin-field-label">Footer logo</span>
                    <HomepageImageUploader variant="icon" value={data.brand_logo} fallbackPreview={<span className="pm-footer-admin-logo-mark" aria-hidden="true"/>}
                        onChange={value => change('brand_logo', value)}/>
                    {errors['footer.brand_logo'] && <span role="alert" className="pm-admin-error">{errors['footer.brand_logo']}</span>}
                </div>
                {text('about_heading', 'About heading')}
                {text('description', 'About description', true)}
            </div>
            <div className="pm-footer-admin-section">
                <div className="pm-admin-section-heading"><h2>Footer navigation</h2><p>Edit menu labels, destinations and display order. Suggested destinations use Navigation master data.</p></div>
                {text('explore_heading', 'Quick links heading')}
                {list('explore_links', 'Quick links', 8)}
                {checkbox('show_trends', 'Show PM Trends shortcut', 'Displayed only when PM Trends is not already among the quick links.')}
                {text('support_heading', 'Support links heading')}
                {list('support_links', 'Support links', 8)}
                {checkbox('show_membership', 'Show Membership plans shortcut', 'Displayed only when membership is not already in the support links.')}
            </div>
            <div className="pm-footer-admin-section">
                <div className="pm-admin-section-heading"><h2>Social profiles</h2><p>Use HTTPS profile links. Leave a URL empty to hide that network. The default icon is shown unless replaced.</p></div>
                <div className="pm-footer-admin-social-list">{socialNetworks.map(({ key, label, Icon }) => <div className="pm-footer-admin-social" key={key}>
                    <ContentField id={`footer-social-${key}`} label={`${label} URL (optional)`} value={data.social[key] ?? ''} onChange={value => {
                        change('social', { ...data.social, [key]: value });
                    }} error={errors[`footer.social.${key}`]} hint="Leave blank to hide this social link."/>
                    <div className="pm-admin-field"><span className="pm-admin-field-label">{label} icon</span>
                        <HomepageImageUploader variant="icon" value={data.social_icons[key] ?? ''}
                            fallbackPreview={<Icon size={28} aria-hidden="true"/>}
                            onChange={value => change('social_icons', { ...data.social_icons, [key as SocialNetwork]: value })}/>
                        {errors[`footer.social_icons.${key}`] && <span className="pm-admin-error" role="alert">{errors[`footer.social_icons.${key}`]}</span>}
                    </div>
                </div>)}</div>
            </div>
            <div className="pm-footer-admin-section">
                <div className="pm-admin-section-heading"><h2>Email updates</h2><p>Control the displayed newsletter text. Email submissions remain disabled until a service is configured.</p></div>
                {text('newsletter_heading', 'Newsletter heading')}
                {text('newsletter_description', 'Description', true)}
                {text('newsletter_compact_description', 'Compact footer description', true)}
                {text('newsletter_placeholder', 'Email placeholder')}
                {text('newsletter_button', 'Button label')}
                {checkbox('show_newsletter_form', 'Show the email entry and Subscribe button', 'The form remains disabled until a newsletter service is implemented. No messages are sent.')}
            </div>
            <div className="pm-footer-admin-section">
                <div className="pm-admin-section-heading"><h2>Payment display</h2><p>These are display labels only. No payment integrations or checkout logic are changed.</p></div>
                {text('payment_heading', 'Payment heading')}
                <RepeatableItems collapsible title="Payment badges" path="footer.payment_methods" rows={data.payment_methods as unknown as Record<string, unknown>[]}
                    fields={[{ key: 'label', label: 'Badge label / accessible name' }, { key: 'image', label: 'Optional payment logo', kind: 'image' }]} layout="stacked" max={8} errors={errors}
                    onChange={rows => change('payment_methods', rows as Footer['payment_methods'])}/>
                <small className="pm-admin-hint">Leave the image empty to show the current text badge. These badges do not configure payment gateways.</small>
            </div>
            <div className="pm-footer-admin-section">
                <div className="pm-admin-section-heading"><h2>Copyright and legal</h2><p>The current year is inserted automatically; control the wording and footer policy links here.</p></div>
                {text('copyright_label', 'Copyright owner')}
                {list('legal_links', 'Legal links', 6)}
                {text('legal_notice', 'Trademark notice', true)}
                {checkbox('show_disclaimer', 'Show additional disclaimer')}
                {text('disclaimer', 'Additional disclaimer', true)}
            </div>
        </section>
        <section className="pm-footer-admin-preview" aria-label="Footer preview">
            <div className="pm-admin-section-heading"><h2>Preview footer</h2><p>Preview uses your current editor values; save to publish them site-wide.</p></div>
            <HomeFooter content={data}/>
        </section>
        <div className="pm-footer-admin-bottom-actions">{saveButton}</div>
    </AdminLayout>;
}
