import { Link, router } from '@inertiajs/react';
import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { ContentField, HomepageImageUploader, RepeatableItems, type EditorField } from '@/components/admin/HomepageFields';
import { pmpPublicSections } from '@/components/admin/pmp-public-sections';
import { PmpPublicIcon } from '@/components/exam/PmpPublicIcon';
import type { PmpFeature, PmpPlanRow, PmpPublicContent, PmpPublicSection } from '@/types/pmp-public';

type Props = { content: PmpPublicContent; version: number; selectedSection?: PmpPublicSection };
export default function PmpPublicPage({ content, version, selectedSection = 'hero' }: Props) {
    const [data, setData] = useState(content);
    const [selected, setSelected] = useState<PmpPublicSection>(selectedSection);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [newFeatureTitle, setNewFeatureTitle] = useState('');
    const [newFeatureType, setNewFeatureType] = useState<PmpPlanRow['type']>('text');
    const [newFeatureError, setNewFeatureError] = useState('');
    const MAX_PLAN_ROWS = 40;

    useEffect(() => { setData(content); setDirty(false); }, [content, version]);
    useEffect(() => {
        if (!dirty) return;
        const confirmExit = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', confirmExit);
        return () => window.removeEventListener('beforeunload', confirmExit);
    }, [dirty]);

    function edit(path: string, value: unknown) {
        setDirty(true); setSaved(false);
        setData(previous => {
            const next = structuredClone(previous);
            const parts = path.split('.');
            let object: Record<string, unknown> = next as unknown as Record<string, unknown>;
            for (const key of parts.slice(0, -1)) object = object[key] as Record<string, unknown>;
            object[parts[parts.length - 1]] = value;
            return next;
        });
    }
    function get(path: string): unknown {
        return path.split('.').reduce<unknown>((item, key) => item && typeof item === 'object' ? (item as Record<string, unknown>)[key] : undefined, data);
    }
    function field(path: string, label: string, multiline = false, hint?: string) {
        return <ContentField key={path} id={`pmp-${path.replace(/[^a-z0-9]+/gi, '-')}`} label={label}
            type={multiline ? 'textarea' : 'text'} value={String(get(path) ?? '')} hint={hint}
            onChange={value => edit(path, value)} error={errors[`content.${path}`]}/>;
    }
    function image(path: string, label: string, variant: 'portrait' | 'icon' = 'icon') {
        return <div className="pm-admin-field pm-pmp-admin-image" key={path}>
            {label && <span className="pm-admin-field-label">{label}</span>}
            <HomepageImageUploader variant={variant} value={String(get(path) ?? '')} onChange={value => edit(path, value)}/>
            {errors[`content.${path}`] && <span role="alert" className="pm-admin-error">{errors[`content.${path}`]}</span>}
        </div>;
    }
    function repeater(path: string, title: string, fields: EditorField[], max: number, layout: 'grid' | 'stacked' = 'grid') {
        return <RepeatableItems title={title} path={`content.${path}`} rows={(get(path) ?? []) as Record<string, unknown>[]}
            fields={fields} max={max} layout={layout} errors={errors} onChange={rows => edit(path, rows)}/>;
    }
    /** Keep the existing card icons in content; admins only need a visual preview and an image uploader. */
    function featureGroup(path: 'benefits.cards' | 'ai.cards' | 'video.points', label: string, fixed: boolean) {
        const cards = (get(path) ?? []) as PmpFeature[];
        return <div className="pm-pmp-admin-cards">
            <div className="pm-admin-list-heading"><h3>{label} ({cards.length}{fixed ? ' fixed cards' : '/4'})</h3>
                {!fixed && <button type="button" className="pm-admin-button pm-admin-button-quiet"
                    disabled={cards.length >= 4}
                    onClick={() => edit(path, [...cards, { title: 'New feedback point', description: 'Describe this point.', icon: 'file-search', icon_image: '' }])}>
                    <Plus size={16}/>Add point
                </button>}
            </div>
            {cards.map((card, index) => <div key={index} className="pm-admin-repeat-card">
                <div className="pm-admin-repeat-header"><strong>{fixed ? 'Card' : 'Point'} {index + 1}</strong>
                    {!fixed && <div className="pm-admin-icon-actions">
                        <button type="button" aria-label={`Move point ${index + 1} up`} disabled={index === 0}
                            onClick={() => { const next = [...cards]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; edit(path, next); }}><ArrowUp size={16}/></button>
                        <button type="button" aria-label={`Move point ${index + 1} down`} disabled={index === cards.length - 1}
                            onClick={() => { const next = [...cards]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; edit(path, next); }}><ArrowDown size={16}/></button>
                        <button type="button" aria-label={`Remove point ${index + 1}`} disabled={cards.length <= 1}
                            onClick={() => edit(path, cards.filter((_, i) => i !== index))}><Trash2 size={16}/></button>
                    </div>}
                </div>
                {field(`${path}.${index}.title`, 'Title')}
                {field(`${path}.${index}.description`, 'Description', true)}
                <div className="pm-pmp-admin-icon-control">
                    {!card.icon_image && <span className="pm-pmp-admin-icon-preview" aria-label="Current card icon">
                        <PmpPublicIcon icon={card.icon} size={36}/>
                    </span>}
                    {image(`${path}.${index}.icon_image`, '')}
                </div>
            </div>)}
        </div>;
    }
    function save() {
        if (busy || !dirty) return;
        setBusy(true); setErrors({});
        router.put(`/admin/exam-simulator/pmp?section=${selected}`, { content: data, version }, {
            preserveScroll: true,
            onSuccess: () => { setSaved(true); setDirty(false); },
            onError: validation => { setSaved(false); setErrors(validation); },
            onFinish: () => setBusy(false),
        });
    }
    function frame(heading: string, description: string, children: ReactNode) {
        return <div className="pm-admin-editor-section"><div className="pm-admin-section-heading"><h2>{heading}</h2><p>{description}</p></div>
            <div className="pm-admin-form-content pm-pmp-admin-fields">{children}</div>
        </div>;
    }
    function listEdit(path: 'faq.items' | 'testimonials.items', title: string, fields: EditorField[], max = 8) {
        return repeater(path, title, fields, max, 'stacked');
    }
    function addPlanFeature() {
        const title = newFeatureTitle.trim();
        if (!title || title.length > 180) {
            setNewFeatureError('Enter a feature title of 1–180 characters.');
            return;
        }
        if (data.plans.rows.length >= MAX_PLAN_ROWS) return;
        edit('plans.rows', [...data.plans.rows, {
            label: title,
            type: newFeatureType,
            values: newFeatureType === 'checkbox' ? [false, false, false, false] : ['', '', '', ''],
        }]);
        setNewFeatureTitle('');
        setNewFeatureType('text');
        setNewFeatureError('');
    }
    /** Edit feature definitions once, then update each plan's values in its own column. */
    function comparisonFeature(index: number, row: PmpPlanRow) {
        return <div className="pm-admin-repeat-card pm-pmp-admin-feature-row" key={index}>
            <div className="pm-admin-repeat-header"><strong>Feature {index + 1}</strong>
                <button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={data.plans.rows.length === 1}
                    onClick={() => edit('plans.rows', data.plans.rows.filter((_, i) => i !== index))}>
                    <Trash2 size={16}/>Remove</button>
            </div>
            {field(`plans.rows.${index}.label`, 'Feature title')}
            <div className="pm-admin-field"><label htmlFor={`pmp-plan-type-${index}`}>Value type</label>
                <select id={`pmp-plan-type-${index}`} value={row.type} onChange={event => {
                    const type = event.target.value as PmpPlanRow['type'];
                    edit(`plans.rows.${index}`, { ...row, type, values: type === 'checkbox' ? [false, false, false, false] : ['', '', '', ''] });
                }}><option value="text">Text</option><option value="checkbox">Checkbox (included / not included)</option></select>
            </div>
        </div>;
    }
    function planColumn(col: number) {
        const plan = data.plans.columns[col];
        return <div className="pm-admin-repeat-card pm-pmp-admin-plan-column" key={col}>
            <strong>Plan {col + 1}{col === 2 ? ' · Featured' : ''}</strong>
            {field(`plans.columns.${col}.title`, 'Plan title')}
            {field(`plans.columns.${col}.subtitle`, 'Subheading (optional)')}
            {field(`plans.columns.${col}.action`, 'Button text')}
            <div className="pm-pmp-admin-column-values"><h4>Comparison values</h4>
                {data.plans.rows.map((row, index) => <div key={index} className="pm-admin-field">
                    <label htmlFor={`pmp-plan-cell-${index}-${col}`}>{row.label || `Feature ${index + 1}`}</label>
                    {row.type === 'checkbox' ? <label className="pm-pmp-admin-checkbox">
                        <input id={`pmp-plan-cell-${index}-${col}`} type="checkbox"
                            checked={row.values[col] === true}
                            onChange={event => edit(`plans.rows.${index}.values.${col}`, event.target.checked)}/>Included
                    </label> : <textarea id={`pmp-plan-cell-${index}-${col}`} rows={2} maxLength={200}
                        value={String(row.values[col] ?? '')}
                        onChange={event => edit(`plans.rows.${index}.values.${col}`, event.target.value)}/>}
                    {errors[`content.plans.rows.${index}.values.${col}`] && <span role="alert" className="pm-admin-error">{errors[`content.plans.rows.${index}.values.${col}`]}</span>}
                </div>)}
            </div>
        </div>;
    }

    return <AdminLayout active="/admin/exam-simulator/pmp" title="PMP public page control"
        subtitle="Edit each public page section separately. Preview before publishing; only saved changes appear on the website."
        selectedPmpSection={selected} onSelectPmpSection={setSelected} pmpVisibility={data.sections}>
        <div className="pm-admin-panel pm-admin-editor-toolbar">
            <div><span className="pm-admin-kicker">PUBLIC EXAM SIMULATOR</span><strong>Page content</strong><small>{dirty ? 'Unsaved changes' : 'All changes saved'}</small></div>
            <div className="pm-admin-editor-actions">
                <Link href="/exam-simulator/pmp/details" target="_blank" className="pm-admin-button pm-admin-button-quiet">Preview page <ExternalLink size={16}/></Link>
                <button type="button" className="pm-admin-button pm-admin-button-primary" disabled={!dirty || busy} onClick={save}><Save size={17}/>{busy ? 'Saving…' : 'Save changes'}</button>
            </div>
        </div>
        {saved && <p role="status" className="pm-admin-notice pm-admin-notice-success"><CheckCircle2 size={18}/>Page updated successfully.</p>}
        {Object.keys(errors).length > 0 && <p role="alert" className="pm-admin-notice pm-admin-notice-error"><AlertCircle size={18}/>{errors.version ?? Object.values(errors)[0]} Please review the highlighted fields.</p>}
        <div className="pm-pmp-admin-workspace">
            <section className="pm-admin-panel pm-pmp-admin-main" aria-label={`${pmpPublicSections.find(tab => tab.key === selected)?.title} editor`}>
                <label className="pm-admin-visibility"><span><strong>Show section on public page</strong><small>Hide without removing its content.</small></span>
                    <span className="pm-admin-switch"><input type="checkbox" checked={data.sections[selected]} onChange={event => edit(`sections.${selected}`, event.target.checked)}/>
                        {data.sections[selected] ? 'Visible' : 'Hidden'}</span>
                </label>
                {selected === 'hero' && frame('Banner', 'Edit the existing banner content. Compare plans always opens the existing pricing page.', <>
                    {field('hero.title', 'Main headline')}{field('hero.description', 'Description', true)}
                    <div className="pm-admin-field-grid">{field('hero.primary_label', 'Pricing button text')}{field('hero.secondary_label', 'Sample button text')}</div>
                    {image('hero.image', 'Banner image', 'portrait')}
                </>)}
                {selected === 'benefits' && frame('What you get with PM Circle', 'Four fixed cards. Each can use its built-in icon or an uploaded image.', <>
                    {field('benefits.heading', 'Section heading')}{featureGroup('benefits.cards', 'Benefits', true)}
                </>)}
                {selected === 'sample' && frame('Sample question', 'Keep the existing paid-simulator UI. Select the public sample question in PMP exam management settings.', <>
                    {field('sample.heading', 'Section heading')}{field('sample.description', 'Supporting text', true)}
                    {image('sample.icon_image', 'Heading icon (32 × 32 px)')}
                    <div className="pm-admin-notice">Choose an active question ID from PMP exam management settings, or leave blank there to use the built-in sample.</div>
                </>)}
                {selected === 'ai' && frame('AI study help', 'Four cards matching the benefit-card layout, with customizable icons.', <>
                    {field('ai.heading', 'Section heading')}{field('ai.description', 'Description', true)}
                    {image('ai.icon_image', 'Heading icon (32 × 32 px)')}{featureGroup('ai.cards', 'AI help cards', true)}
                </>)}
                {selected === 'plans' && frame('Choose your simulator plan', 'Set table headings, text cells and included/not-included checkbox cells. All four plan columns remain in place.', <>
                    {field('plans.heading', 'Section heading')}{field('plans.description', 'Description', true)}
                    {image('plans.icon_image', 'Heading icon (32 × 32 px)')}{field('plans.first_column', 'Leftmost column heading')}
                    <div className="pm-pmp-admin-cards">
                        <div className="pm-admin-list-heading"><h3>Comparison features ({data.plans.rows.length}/{MAX_PLAN_ROWS})</h3></div>
                        <div className="pm-pmp-admin-add-feature" aria-label="Add comparison feature">
                            <div className="pm-admin-field">
                                <label htmlFor="pmp-new-feature-title">New feature title</label>
                                <input id="pmp-new-feature-title" type="text" maxLength={180} value={newFeatureTitle}
                                    placeholder="e.g. Detailed performance analysis" aria-invalid={Boolean(newFeatureError)}
                                    onChange={event => { setNewFeatureTitle(event.target.value); setNewFeatureError(''); }}/>
                            </div>
                            <div className="pm-admin-field">
                                <label htmlFor="pmp-new-feature-type">Value type</label>
                                <select id="pmp-new-feature-type" value={newFeatureType}
                                    onChange={event => setNewFeatureType(event.target.value as PmpPlanRow['type'])}>
                                    <option value="text">Text</option><option value="checkbox">Checkbox (included / not included)</option>
                                </select>
                            </div>
                            <button type="button" className="pm-admin-button pm-admin-button-quiet"
                                disabled={data.plans.rows.length >= MAX_PLAN_ROWS} onClick={addPlanFeature}>
                                <Plus size={16}/>Add feature
                            </button>
                            {newFeatureError && <span className="pm-admin-error" role="alert">{newFeatureError}</span>}
                        </div>
                        <div className="pm-pmp-admin-feature-list">{data.plans.rows.map((row, index) => comparisonFeature(index, row))}</div>
                    </div>
                    <div className="pm-pmp-admin-cards"><h3>Plan columns</h3>
                        <p className="pm-admin-guidance">Edit each plan from top to bottom. The comparison table uses these same four columns.</p>
                        <div className="pm-pmp-admin-price-columns">{data.plans.columns.map((_, index) => planColumn(index))}</div>
                    </div>
                    {field('plans.price_note', 'Pricing disclaimer', true)}{field('plans.checkout_note', 'Information below table', true)}
                </>)}
                {selected === 'faq' && frame('FAQ', 'Manage question and answer entries without changing page structure.', <>
                    {field('faq.heading', 'Heading')}{listEdit('faq.items', 'Questions', [{ key: 'question', label: 'Question' }, { key: 'answer', label: 'Answer', kind: 'textarea' }], 12)}
                </>)}
                {selected === 'video' && frame('Video stories', 'Supply an approved HTTPS MP4 URL. The page uses its existing video player.', <>
                    {field('video.heading', 'Section heading')}{field('video.video_url', 'Video HTTPS URL')}{field('video.feedback_heading', 'Feedback column heading')}
                    {featureGroup('video.points', 'Feedback points', false)}
                </>)}
                {selected === 'testimonials' && frame('Testimonials', 'Enter approved learner names, quotes, and photos. Avoid publishing placeholder endorsements.', <>
                    {field('testimonials.heading', 'Heading')}
                    {repeater('testimonials.items', 'Learner testimonials', [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Job title' }, { key: 'quote', label: 'Approved quote', kind: 'textarea' }, { key: 'image', label: 'Portrait', kind: 'image' }], 8)}
                </>)}
            </section>
        </div>
    </AdminLayout>;
}
