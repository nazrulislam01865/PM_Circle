import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { ContentField, HomepageImageUploader, RepeatableItems } from '@/components/admin/HomepageFields';
import { HomeFooter } from '@/components/home/v2/HomeFooter';
import { MemberFooter } from '@/components/pm/MemberFooter';
import { footerSocialIcons } from '@/components/pm/FooterIdentity';
import type { FooterLink, SiteFooterContent as Footer, FooterColumn, FooterSocialLink } from '@/types/pmp-public';

type RouteChoice = { value: string; label: string };
type Props = { footer: Footer; version: number; routeChoices: RouteChoice[] };
type Flag = 'show_brand' | 'show_about' | 'show_social' | 'show_legal' | 'show_notice' | 'show_copyright' | 'show_member_footer' | 'show_member_notice';
type TextField = 'brand_name' | 'brand_tagline' | 'brand_href' | 'description' | 'notice_label' | 'legal_notice' | 'copyright_label' | 'member_notice_label';
const iconChoices = Object.keys(footerSocialIcons).map(value => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));

function RowActions({ label, index, count, move, remove }: { label: string; index: number; count: number; move: (direction: number) => void; remove: () => void }) {
    return <div className="pm-admin-icon-actions">
        <button type="button" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => move(-1)}><ArrowUp size={16}/></button>
        <button type="button" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => move(1)}><ArrowDown size={16}/></button>
        <button type="button" aria-label={`Delete ${label}`} onClick={remove}><Trash2 size={16}/></button>
    </div>;
}
function moved<T>(rows: T[], index: number, direction: number): T[] {
    const next = [...rows]; const other = index + direction;
    if (other < 0 || other >= next.length) return rows;
    [next[index], next[other]] = [next[other], next[index]];
    return next;
}

/** One editor for all public and compact member footer content. */
export default function SiteFooterEditor({ footer, version, routeChoices }: Props) {
    const [data, setData] = useState<Footer>(footer);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { setData(footer); setDirty(false); }, [footer, version]);
    useEffect(() => {
        if (!dirty) return;
        const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', protect);
        const unsubscribe = router.on('before', event => {
            if (event.detail.visit.method === 'get' && !window.confirm('Leave without saving footer changes?')) event.preventDefault();
        });
        return () => { window.removeEventListener('beforeunload', protect); unsubscribe(); };
    }, [dirty]);

    function change<K extends keyof Footer>(key: K, value: Footer[K]) {
        setData(current => ({ ...current, [key]: value })); setDirty(true); setSaved(false);
    }
    function text(key: TextField, label: string, type: 'text' | 'textarea' | 'route' = 'text') {
        return <ContentField id={`footer-${key}`} label={label} value={data[key] ?? ''} type={type} choices={routeChoices}
            error={errors[`footer.${key}`]} onChange={value => change(key, value)}/>;
    }
    function toggle(key: Flag, label: string) {
        return <label className="pm-admin-check-row pm-footer-control-choice" key={key}>
            <input type="checkbox" checked={data[key]} onChange={event => change(key, event.target.checked)}/><span><strong>{label}</strong></span>
        </label>;
    }
    function links(path: string, title: string, rows: FooterLink[], update: (links: FooterLink[]) => void) {
        return <RepeatableItems title={title} path={path} rows={rows} fields={[{ key: 'label', label: 'Link label' }, { key: 'href', label: 'Destination', kind: 'route', choices: routeChoices }]}
            layout="stacked" max={16} addLabel="Add link" emptyMessage="No links. Add a link to display it in this group." errors={errors} onChange={items => update(items.map(item => ({ label: String(item.label ?? ''), href: String(item.href ?? '') })))}/>;
    }
    function updateColumn(index: number, patch: Partial<FooterColumn>) {
        change('columns', data.columns.map((item, i) => i === index ? { ...item, ...patch } : item));
    }
    function updateSocial(index: number, patch: Partial<FooterSocialLink>) {
        change('socials', data.socials.map((item, i) => i === index ? { ...item, ...patch } : item));
    }
    function save() {
        if (!dirty || saving || uploading) return;
        setSaving(true); setErrors({});
        router.put('/admin/footer', { footer: data, version }, {
            preserveScroll: true,
            onSuccess: () => { setDirty(false); setSaved(true); },
            onError: invalid => { setErrors(invalid); setSaved(false); },
            onFinish: () => setSaving(false),
        });
    }
    const saveButton = <button className="pm-admin-button pm-admin-button-primary" type="button" disabled={!dirty || saving || uploading} onClick={save}>
        <Save size={17}/>{saving ? 'Saving…' : uploading ? 'Uploading…' : 'Save footer'}
    </button>;

    return <AdminLayout title="Footer control" subtitle="Manage the public footer and compact member footer from one place." active="/admin/footer">
        <div className="pm-admin-editor-toolbar pm-admin-panel">
            <div><span className="pm-admin-kicker">PUBLIC WEBSITE</span><strong>Footer management</strong><small>{dirty ? 'Unsaved changes' : 'Changes apply site-wide after saving'}</small></div>
            <div className="pm-admin-editor-actions"><Link className="pm-admin-button pm-admin-button-quiet" href="/" target="_blank">View public footer <ExternalLink size={16}/></Link>{saveButton}</div>
        </div>
        {saved && <p className="pm-admin-notice pm-admin-notice-success" role="status"><CheckCircle2 size={18}/> Footer saved.</p>}
        {Object.keys(errors).length > 0 && <p className="pm-admin-notice pm-admin-notice-error" role="alert"><AlertCircle size={18}/>{errors.version ?? Object.values(errors)[0]}</p>}
        <fieldset disabled={saving || uploading} className="pm-admin-panel pm-footer-admin-editor" aria-label="Footer settings">
            <section className="pm-footer-admin-section">
                <div className="pm-admin-section-heading"><h2>Brand and description</h2><p>Change the footer branding without changing the header.</p></div>
                {toggle('show_brand', 'Show brand logo and name')}
                {text('brand_name', 'Brand name')}{text('brand_tagline', 'Brand byline')}{text('brand_href', 'Logo destination', 'route')}
                <div className="pm-admin-field"><span className="pm-admin-field-label">Footer logo</span>
                    <HomepageImageUploader variant="icon" value={data.brand_logo ?? ''} fallbackPreview={<span className="pm-footer-admin-logo-mark" aria-hidden="true"/>}
                        onBusyChange={setUploading} onChange={value => change('brand_logo', value)}/>
                    {errors['footer.brand_logo'] && <span role="alert" className="pm-admin-error">{errors['footer.brand_logo']}</span>}
                </div>
                {toggle('show_about', 'Show description')}{text('description', 'Description', 'textarea')}
            </section>
            <section className="pm-footer-admin-section">
                <div className="pm-admin-list-heading"><div className="pm-admin-section-heading"><h2>Footer menu columns</h2><p>Add, remove, reorder or hide groups and their individual links.</p></div>
                    <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={data.columns.length >= 8} onClick={() => change('columns', [...data.columns, { title: '', visible: true, links: [] }])}><Plus size={16}/> Add column</button></div>
                {data.columns.length === 0 && <p className="pm-admin-empty">No footer menu columns.</p>}
                {data.columns.map((column, index) => <div className="pm-admin-repeat-card" key={index}>
                    <div className="pm-admin-repeat-header"><strong>{column.title || `Column ${index + 1}`}</strong><RowActions label={`column ${index + 1}`} index={index} count={data.columns.length}
                        move={direction => change('columns', moved(data.columns, index, direction))} remove={() => change('columns', data.columns.filter((_, i) => i !== index))}/></div>
                    <ContentField id={`footer-column-${index}`} label="Column heading" value={column.title} onChange={title => updateColumn(index, { title })} error={errors[`footer.columns.${index}.title`]}/>
                    <label className="pm-admin-check-row"><input type="checkbox" checked={column.visible} onChange={event => updateColumn(index, { visible: event.target.checked })}/> Show column</label>
                    {links(`footer.columns.${index}.links`, 'Menu links', column.links, values => updateColumn(index, { links: values }))}
                </div>)}
            </section>
            <section className="pm-footer-admin-section">
                <div className="pm-admin-list-heading"><div className="pm-admin-section-heading"><h2>Social media</h2><p>Choose a built-in icon or upload your own. Only links with an HTTPS destination are displayed.</p></div>
                    <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={data.socials.length >= 16} onClick={() => change('socials', [...data.socials, { label: '', href: '', icon: 'globe', image: '' }])}><Plus size={16}/> Add social link</button></div>
                {toggle('show_social', 'Show social icons')}
                {data.socials.length === 0 && <p className="pm-admin-empty">No social links.</p>}
                {data.socials.map((social, index) => {
                    const Icon = footerSocialIcons[social.icon as keyof typeof footerSocialIcons] ?? footerSocialIcons.globe;
                    return <div className="pm-admin-repeat-card" key={index}>
                        <div className="pm-admin-repeat-header"><strong>{social.label || `Social link ${index + 1}`}</strong><RowActions label={`social link ${index + 1}`} index={index} count={data.socials.length}
                            move={direction => change('socials', moved(data.socials, index, direction))} remove={() => change('socials', data.socials.filter((_, i) => i !== index))}/></div>
                        <ContentField id={`footer-social-label-${index}`} label="Social label" value={social.label} onChange={label => updateSocial(index, { label })} error={errors[`footer.socials.${index}.label`]}/>
                        <ContentField id={`footer-social-href-${index}`} label="Profile URL (HTTPS)" value={social.href ?? ''} onChange={href => updateSocial(index, { href })} error={errors[`footer.socials.${index}.href`]}/>
                        <ContentField id={`footer-social-icon-${index}`} label="Default icon" type="select" choices={iconChoices} value={social.icon} onChange={icon => updateSocial(index, { icon })} error={errors[`footer.socials.${index}.icon`]}/>
                        <div className="pm-admin-field"><span className="pm-admin-field-label">Custom icon (optional)</span><HomepageImageUploader variant="icon" value={social.image ?? ''} fallbackPreview={<Icon size={28} aria-hidden="true"/>}
                            onBusyChange={setUploading} onChange={image => updateSocial(index, { image })}/>
                            {errors[`footer.socials.${index}.image`] && <span role="alert" className="pm-admin-error">{errors[`footer.socials.${index}.image`]}</span>}</div>
                    </div>;
                })}
            </section>
            <section className="pm-footer-admin-section">
                <div className="pm-admin-section-heading"><h2>Public footer — legal and bottom row</h2><p>Manage the notice, copyright and optional links at the bottom.</p></div>
                {toggle('show_legal', 'Show legal and bottom area')}{toggle('show_notice', 'Show trademark / legal notice')}
                {text('notice_label', 'Notice label')}{text('legal_notice', 'Legal notice text', 'textarea')}
                {toggle('show_copyright', 'Show copyright (public and member)')}{text('copyright_label', 'Copyright text')}
                {links('footer.bottom_links', 'Bottom links', data.bottom_links, values => change('bottom_links', values))}
            </section>
            <section className="pm-footer-admin-section">
                <div className="pm-admin-section-heading"><h2>Compact member footer</h2><p>Manage links displayed after sign-in. Copyright and notice text are shared with the public footer.</p></div>
                {toggle('show_member_footer', 'Show member footer')}{toggle('show_member_notice', 'Show notice dialog link')}{text('member_notice_label', 'Notice link label')}
                {links('footer.member_links', 'Member footer links', data.member_links, values => change('member_links', values))}
            </section>
        </fieldset>
        <section className="pm-footer-admin-preview" aria-label="Footer preview">
            <div className="pm-admin-section-heading"><h2>Public footer preview</h2><p>Changes are visible to users only after saving.</p></div>
            <HomeFooter content={data}/>
            <div className="pm-admin-section-heading"><h2>Member footer preview</h2></div>
            <MemberFooter content={data}/>
        </section>
        <div className="pm-footer-admin-bottom-actions">{saveButton}</div>
    </AdminLayout>;
}
