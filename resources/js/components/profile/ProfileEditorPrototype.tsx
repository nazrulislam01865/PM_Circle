import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';

type Value = string | boolean | number | null | undefined;
export type RowData = { id?: number; [key: string]: Value };
export type CollectionKey = 'experiences' | 'projects' | 'educations' | 'certifications' | 'courses' | 'awards' | 'publications' | 'volunteering' | 'languages' | 'links';
type SectionKey = 'basic' | 'contact' | 'about' | CollectionKey | 'career';
export type Field = { key: string; label: string; type?: 'text' | 'email' | 'tel' | 'textarea' | 'month' | 'select' | 'checkbox' | 'url'; required?: boolean; full?: boolean; options?: Array<string | { value: string; label: string }>; disabledWhen?: string };
type CollectionDefinition = { title: string; itemTitle: string; addLabel: string; titleField: string; fields: Field[] };

export type ProfileEditorDetails = {
    current_organization?: string; profile_photo_url?: string; cover_photo_url?: string;
    tools_software?: string; delivery_methods?: string;
    career?: Record<string, Value>; records?: Partial<Record<CollectionKey, RowData[]>>;
};

export type ProfileData = {
    name: string; email: string; headline: string; role: string; industry: string; country: string; city: string; phone: string; about: string;
    skills: string[]; open_to_opportunities: boolean; languages: string[]; linkedin_url: string;
    avatar_path?: string | null; cover_photo_path?: string | null;
    experiences: RowData[]; projects: RowData[]; educations: RowData[]; certifications: RowData[];
    editor_details?: ProfileEditorDetails;
};

const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Temporary', 'Volunteer'];
const workArrangements = ['On-site', 'Remote', 'Hybrid'];
const text = (key: string, label: string, required = false): Field => ({ key, label, required });
const area = (key: string, label: string): Field => ({ key, label, type: 'textarea', full: true });
const month = (key: string, label: string, required = false, disabledWhen?: string): Field => ({ key, label, type: 'month', required, disabledWhen });
const choice = (key: string, label: string, options: string[]): Field => ({ key, label, type: 'select', options });
const check = (key: string, label: string): Field => ({ key, label, type: 'checkbox' });
const link = (key: string, label: string, required = false): Field => ({ key, label, required, type: 'url' });

export const definitions: Record<CollectionKey, CollectionDefinition> = {
    experiences: { title: 'Experience', itemTitle: 'Role', addLabel: 'Add role', titleField: 'job_title', fields: [
        text('job_title', 'Job title', true), text('organization', 'Organisation', true),
        choice('employment_type', 'Employment type', employmentTypes), text('location', 'Location'),
        choice('work_arrangement', 'Work arrangement', workArrangements), month('start_month', 'Start month', true),
        month('end_month', 'End month', false, 'is_current'), check('is_current', 'Currently work here'),
        area('responsibilities', 'Responsibilities and scope'), area('achievements', 'Achievements and measurable outcomes'),
    ] },
    projects: { title: 'Selected projects', itemTitle: 'Project', addLabel: 'Add project', titleField: 'title', fields: [
        text('title', 'Project name', true), text('role', 'Role or contribution', true),
        text('organization', 'Organisation or client'), text('industry', 'Industry or business area'),
        month('start_month', 'Start month'), month('end_month', 'End month'),
        choice('status', 'Project status', ['Planned', 'In progress', 'On hold', 'Completed']), text('scale', 'Team size or project scale'),
        area('scope', 'Scope and delivery approach'), area('outcomes', 'Outcomes and metrics'), link('work_url', 'Project or case study URL'),
    ] },
    educations: { title: 'Education', itemTitle: 'Education', addLabel: 'Add education entry', titleField: 'degree', fields: [
        text('degree', 'Degree, qualification or programme', true), text('institution', 'Institution', true),
        text('field_of_study', 'Field of study'), text('location', 'Location'),
        month('start_month', 'Start month'), month('end_month', 'End or expected completion month', false, 'is_current'),
        check('is_current', 'Currently studying'), text('grade', 'Grade or CGPA'), area('honours', 'Honours or relevant coursework'),
    ] },
    certifications: { title: 'Certifications & licences', itemTitle: 'Credential', addLabel: 'Add credential', titleField: 'name', fields: [
        text('name', 'Credential name', true), text('issuing_organization', 'Issuing organisation', true),
        month('issue_month', 'Issue month'), month('expiry_month', 'Expiry month', false, 'does_not_expire'),
        check('does_not_expire', 'Credential does not expire'), text('credential_number', 'Credential ID'),
        link('verification_url', 'Verification URL'),
    ] },
    courses: { title: 'Courses & professional development', itemTitle: 'Course', addLabel: 'Add course', titleField: 'name', fields: [
        text('name', 'Course name', true), text('provider', 'Provider'),
        month('completion_month', 'Completion month'), text('hours', 'Training hours'), link('evidence_url', 'Evidence URL'),
    ] },
    awards: { title: 'Awards & honours', itemTitle: 'Award', addLabel: 'Add award', titleField: 'name', fields: [
        text('name', 'Award name', true), text('organization', 'Awarding organisation'),
        month('award_month', 'Award month'), area('details', 'Details'),
    ] },
    publications: { title: 'Publications & speaking', itemTitle: 'Publication or talk', addLabel: 'Add publication or talk', titleField: 'title', fields: [
        text('title', 'Title', true), text('publisher', 'Publisher or event'),
        month('month', 'Month'), area('details', 'Details'), link('url', 'Publication or talk URL'),
    ] },
    volunteering: { title: 'Volunteering', itemTitle: 'Volunteer role', addLabel: 'Add volunteer role', titleField: 'role', fields: [
        text('role', 'Role', true), text('organization', 'Organisation', true),
        month('start_month', 'Start month'), month('end_month', 'End month', false, 'is_current'),
        check('is_current', 'Currently volunteering'), area('contribution', 'Contribution and outcomes'),
    ] },
    languages: { title: 'Languages', itemTitle: 'Language', addLabel: 'Add language', titleField: 'name', fields: [
        text('name', 'Language', true), choice('proficiency', 'Proficiency', ['Elementary proficiency', 'Limited working proficiency', 'Professional working proficiency', 'Full professional proficiency', 'Native or bilingual']),
    ] },
    links: { title: 'Portfolio & links', itemTitle: 'Link', addLabel: 'Add link', titleField: 'label', fields: [
        text('label', 'Link label', true), link('url', 'Website, LinkedIn or portfolio URL', true),
    ] },
};

const collectionKeys = Object.keys(definitions) as CollectionKey[];

const navigation: { id: SectionKey; label: string }[] = [
    { id: 'basic', label: 'Basic details' }, { id: 'contact', label: 'Contact details' },
    { id: 'about', label: 'About & skills' }, { id: 'experiences', label: 'Experience' },
    { id: 'projects', label: 'Selected projects' }, { id: 'educations', label: 'Education' },
    { id: 'certifications', label: 'Certifications & licences' },
    { id: 'courses', label: 'Courses & professional development' }, { id: 'awards', label: 'Awards & honours' },
    { id: 'publications', label: 'Publications & speaking' }, { id: 'volunteering', label: 'Volunteering' },
    { id: 'languages', label: 'Languages' }, { id: 'links', label: 'Portfolio & links' },
    { id: 'career', label: 'Career preferences' },
];

function monthValue(value: Value): string {
    if (typeof value !== 'string' || !value) return '';
    if (/^\d{4}-\d{2}/.test(value)) return value.slice(0, 7);
    if (/^\d{4}$/.test(value)) return `${value}-01`;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

export function initialRecords(profile: ProfileData): Record<CollectionKey, RowData[]> {
    const persisted = profile.editor_details?.records ?? {};
    const merge = (type: CollectionKey, fromDatabase: RowData[], convert: (row: RowData) => RowData): RowData[] => fromDatabase.map(row => {
        const extra = (persisted[type] ?? []).find(item => item.id === row.id);
        const defaults = Object.fromEntries(definitions[type].fields.map(field => [field.key, field.type === 'checkbox' ? false : '']));
        return { ...defaults, ...extra, ...convert(row), id: row.id };
    });
    return {
        experiences: merge('experiences', profile.experiences, row => ({
            job_title: row.job_title, organization: row.organization, employment_type: row.employment_type,
            start_month: monthValue(row.start_date), end_month: monthValue(row.end_date),
            is_current: Boolean(row.is_current), responsibilities: row.responsibilities || '',
        })),
        projects: merge('projects', profile.projects, row => ({
            title: row.title, role: row.role, scope: row.summary || '',
        })),
        educations: merge('educations', profile.educations, row => {
            // The relational column stores only the year; retain a more precise saved month.
            const savedMonth = (persisted.educations ?? []).find(item => item.id === row.id)?.end_month;
            const year = String(row.year ?? '');
            return {
                degree: row.degree, institution: row.institution,
                end_month: typeof savedMonth === 'string' && savedMonth.startsWith(year) && year.length === 4
                    ? savedMonth : monthValue(row.year),
            };
        }),
        certifications: merge('certifications', profile.certifications, row => ({
            name: row.name, credential_number: row.credential_number || '', expiry_month: monthValue(row.valid_until),
        })),
        courses: persisted.courses ?? [], awards: persisted.awards ?? [], publications: persisted.publications ?? [],
        volunteering: persisted.volunteering ?? [],
        languages: persisted.languages ?? profile.languages.map(name => ({ name, proficiency: '' })),
        links: persisted.links ?? (profile.linkedin_url ? [{ label: 'LinkedIn', url: profile.linkedin_url }] : []),
    };
}

type ProfileInputProps = {
    id: string; field: Field; value: Value; disabled?: boolean; error?: string; onChange: (value: string | boolean) => void;
};

function ProfileInput({ id, field, value, disabled, error, onChange }: ProfileInputProps) {
    if (field.type === 'checkbox') return (
        <label className="pm-prototype-checkbox" htmlFor={id}>
            <input id={id} type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} /> {field.label}
        </label>
    );
    return <div className={`pm-prototype-field ${field.full ? 'pm-prototype-field--full' : ''}`}>
        <label htmlFor={id} className="pm-label">{field.label}{field.required && ' *'}</label>
        {field.type === 'textarea' ? (
            <textarea id={id} className="pm-textarea" rows={3} required={field.required} disabled={disabled} value={String(value ?? '')} maxLength={field.key === 'about' ? 2000 : 4000}
                aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
                onChange={e => onChange(e.target.value)} />
        ) : field.type === 'select' ? (
            <select id={id} className="pm-select" required={field.required} disabled={disabled} value={String(value ?? '')} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
                onChange={e => onChange(e.target.value)}>
                <option value="">Select...</option>
                {(field.options ?? []).map(option => typeof option === 'string'
                    ? <option key={option} value={option}>{option}</option>
                    : <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        ) : (
            <input id={id} className="pm-input" type={field.type === 'month' ? 'month' : field.type === 'url' ? 'url' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
                required={field.required} disabled={disabled} value={field.type === 'month' ? monthValue(value) : String(value ?? '')}
                aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
                onClick={field.type === 'month' ? event => {
                    try { event.currentTarget.showPicker?.(); } catch { /* Keep the native picker fallback. */ }
                } : undefined}
                onChange={e => onChange(e.target.value)} />
        )}
        {error && <span id={`${id}-error`} className="pm-profile-error" role="alert">{error}</span>}
    </div>;
}

function EditorCollection({ type, rows, errors, onChange, onAdd, onRemove }: {
    type: CollectionKey; rows: RowData[]; errors: Record<string, string>;
    onChange: (index: number, key: string, value: string | boolean) => void;
    onAdd: () => void; onRemove: (index: number) => void;
}) {
    const definition = definitions[type];
    const [expanded, setExpanded] = useState(true);
    useEffect(() => {
        if (Object.keys(errors).some(key => key.startsWith(`editor_details.records.${type}.`))) {
            setExpanded(true);
        }
    }, [errors, type]);
    return <section className="pm-card pm-prototype-section pm-prototype-collection" id={`editor-${type}`} aria-label={definition.title}>
        <h3 className="pm-prototype-section-head"><button type="button" aria-expanded={expanded} aria-controls={`editor-${type}-body`}
            onClick={() => setExpanded(open => !open)}>{expanded ? '▾' : '▸'} {definition.title} ({rows.length})</button></h3>
        {expanded && <div className="pm-prototype-collection-body" id={`editor-${type}-body`}>
            {rows.map((row, index) => (
                <div className="pm-prototype-entry" key={row.id ?? `${type}-draft-${index}`}>
                    <div className="pm-prototype-entry-head">
                        <h4>{String(row[definition.titleField] || definition.itemTitle)}</h4>
                        <button type="button" className="pm-prototype-remove" onClick={() => onRemove(index)}
                            aria-label={`Remove ${definition.itemTitle.toLowerCase()} ${index + 1}`}>Remove</button>
                    </div>
                    <div className="pm-prototype-fields">
                        {definition.fields.map(field => {
                            const errorKey = `editor_details.records.${type}.${index}.${field.key}`;
                            return <ProfileInput key={field.key} id={`editor-${type}-${index}-${field.key}`}
                                field={field} value={row[field.key]} error={errors[errorKey]}
                                disabled={Boolean(field.disabledWhen && row[field.disabledWhen])}
                                onChange={value => onChange(index, field.key, value)} />;
                        })}
                    </div>
                </div>
            ))}
            <button type="button" className="pm-prototype-add" onClick={onAdd}>+ {definition.addLabel}</button>
        </div>}
    </section>;
}

export function ProfileEditorPrototype({ profile, onImport, onCancel }: { profile: ProfileData; onImport: () => void; onCancel: () => void }) {
    const saved = profile.editor_details;
    const [active, setActive] = useState<SectionKey>('basic');
    const [basic, setBasic] = useState({
        name: profile.name, email: profile.email, headline: profile.headline, role: profile.role,
        industry: profile.industry, country: profile.country, city: profile.city, phone: profile.phone,
        about: profile.about, skills: profile.skills.join(', '),
        current_organization: saved?.current_organization ?? '',
        profile_photo_url: saved?.profile_photo_url ?? (profile.avatar_path?.startsWith('https://') ? profile.avatar_path : ''),
        cover_photo_url: saved?.cover_photo_url ?? (profile.cover_photo_path?.startsWith('https://') ? profile.cover_photo_path : ''),
        tools_software: saved?.tools_software ?? '', delivery_methods: saved?.delivery_methods ?? '',
    });
    const [records, setRecords] = useState<Record<CollectionKey, RowData[]>>(() => initialRecords(profile));
    const [career, setCareer] = useState<Record<string, Value>>({
        availability: profile.open_to_opportunities ? 'open' : 'not_looking', target_roles: '', seniority: '', locations: '',
        work_arrangement: '', employment_type: '', notice_period: '', relocation: false, ...saved?.career,
    });
    const [removed, setRemoved] = useState<Record<string, number[]>>({});
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Keep the navigation in sync with ordinary page scrolling, not only menu clicks.
    // Reuse the actual CSS scroll margin so this follows the shared sticky headers.
    useEffect(() => {
        let frame: number | null = null;
        const updateActiveSection = () => {
            frame = null;
            const first = document.getElementById('editor-basic');
            if (!first) return;
            const stickyOffset = Number.parseFloat(window.getComputedStyle(first).scrollMarginTop) || 0;
            let visible: SectionKey = 'basic';
            for (const item of navigation) {
                const section = document.getElementById(`editor-${item.id}`);
                if (section && section.getBoundingClientRect().top <= stickyOffset + 8) {
                    visible = item.id;
                } else if (section) {
                    break;
                }
            }
            if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 3) {
                visible = 'career';
            }
            setActive(current => current === visible ? current : visible);
        };
        const scheduleUpdate = () => {
            if (frame === null) frame = window.requestAnimationFrame(updateActiveSection);
        };
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate);
        scheduleUpdate();
        return () => {
            window.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
            if (frame !== null) window.cancelAnimationFrame(frame);
        };
    }, []);

    const setBasicField = (key: string, value: string | boolean) => setBasic(prev => ({ ...prev, [key]: value }));
    const changeRecord = (type: CollectionKey, index: number, key: string, value: string | boolean) => {
        setRecords(prev => ({ ...prev, [type]: prev[type].map((row, pos) => pos === index
            ? { ...row, [key]: value, ...(value === true && (key === 'is_current' || key === 'does_not_expire')
                ? { [key === 'does_not_expire' ? 'expiry_month' : 'end_month']: '' } : {}) }
            : row) }));
    };
    const addRecord = (type: CollectionKey) => setRecords(prev => ({ ...prev, [type]: [...prev[type], Object.fromEntries(
        definitions[type].fields.map(field => [field.key, field.type === 'checkbox' ? false : ''])
    )] }));
    const removeRecord = (type: CollectionKey, index: number) => {
        const entry = records[type][index];
        if (entry.id && ['experiences', 'projects', 'educations', 'certifications'].includes(type)) {
            setRemoved(prev => ({ ...prev, [type]: [...(prev[type] ?? []), entry.id!] }));
        }
        setRecords(prev => ({ ...prev, [type]: prev[type].filter((_, pos) => pos !== index) }));
    };
    const goTo = (section: SectionKey) => {
        setActive(section);
        document.getElementById(`editor-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const rootField = (key: keyof typeof basic, label: string, required = false, type: Field['type'] = 'text') =>
        <ProfileInput id={`editor-basic-${key}`} field={{ key, label, required, type }} value={basic[key]}
            error={errors[key] || errors[`editor_details.${key}`]} onChange={value => setBasicField(key, value)} />;
    const careerField = (key: string, label: string, options?: Array<string | { value: string; label: string }>) =>
        <ProfileInput id={`editor-career-${key}`} field={{ key, label, type: options ? 'select' : 'text', options }} value={career[key]}
            error={errors[`editor_details.career.${key}`]}
            onChange={value => setCareer(prev => ({ ...prev, [key]: value }))} />;

    const send = () => {
        if (saving) return;
        const digits = basic.phone.replace(/\D/g, '');
        const firstError: Record<string, string> = {};
        if (!basic.name.trim()) firstError.name = 'Full name is required.';
        if (!basic.email.trim()) firstError.email = 'Contact email is required.';
        if (digits.length < 7 || digits.length > 15) firstError.phone = 'Enter a phone number with 7 to 15 digits, including the country code.';
        if (Object.keys(firstError).length) {
            setErrors(firstError);
            const first = Object.keys(firstError)[0];
            document.getElementById(`editor-basic-${first}`)?.focus();
            return;
        }

        const url = ProfileController.update.url();
        setSaving(true);
        setErrors({});
        router.patch(url, {
            tab: 'edit', name: basic.name, email: basic.email, headline: basic.headline, role: basic.role,
            industry: basic.industry, country: basic.country, city: basic.city, phone: basic.phone, about: basic.about,
            skills: basic.skills.split(',').map(item => item.trim()).filter(Boolean),
            languages: records.languages.map(item => String(item.name ?? '').trim()).filter(Boolean),
            linkedin_url: String(records.links.find(item => /linkedin/i.test(String(item.label)))?.url ?? ''),
            open_to_opportunities: career.availability === 'open',
            editor_details: {
                current_organization: basic.current_organization, profile_photo_url: basic.profile_photo_url,
                cover_photo_url: basic.cover_photo_url, tools_software: basic.tools_software,
                delivery_methods: basic.delivery_methods, career, records,
            },
            removed_entries: removed,
        }, {
            preserveScroll: true,
            onError: next => {
                setErrors(next);
                requestAnimationFrame(() => {
                    const firstKey = Object.keys(next)[0];
                    const match = /^editor_details\.records\.([^.]+)\.(\d+)\.([^.]+)$/.exec(firstKey ?? '');
                    const destination = match ? `editor-${match[1]}-${match[2]}-${match[3]}`
                        : firstKey?.startsWith('editor_details.career.') ? `editor-career-${firstKey.split('.').at(-1)}`
                        : firstKey?.startsWith('skills.') ? 'editor-basic-skills'
                        : `editor-basic-${firstKey?.split('.').at(-1) ?? 'name'}`;
                    const input = document.getElementById(destination);
                    if (input) input.focus();
                });
            },
            onFinish: () => setSaving(false),
        });
    };

    return <div className="pm-prototype-editor">
        <div className="pm-profile-edit-grid pm-prototype-edit-grid">
            <nav className="pm-edit-nav pm-prototype-nav" aria-label="Edit profile sections">
                {navigation.map(item => <button key={item.id} type="button" className={`pm-edit-nav-item ${active === item.id ? 'is-active' : ''}`}
                    aria-current={active === item.id ? 'location' : undefined}
                    onClick={() => goTo(item.id)}>{item.label}</button>)}
            </nav>
            <div className="pm-prototype-main">
                <section className="pm-card pm-prototype-section pm-prototype-simple" id="editor-basic">
                    <div className="pm-card-body">
                        <h3 className="pm-card-title">Basic details</h3>
                        <div className="pm-prototype-fields">
                            {rootField('name', 'Full name', true)}
                            {rootField('headline', 'Professional headline')}
                            {rootField('role', 'Current job title')}
                            {rootField('current_organization', 'Current organisation')}
                            {rootField('industry', 'Industry')}
                            {rootField('country', 'Country')}
                            {rootField('city', 'City')}
                            {rootField('profile_photo_url', 'Profile photo URL', false, 'url')}
                            {rootField('cover_photo_url', 'Cover photo URL', false, 'url')}
                        </div>
                    </div>
                </section>
                <section className="pm-card pm-prototype-section pm-prototype-simple" id="editor-contact">
                    <div className="pm-card-body">
                        <h3 className="pm-card-title">Contact details</h3>
                        <p className="pm-prototype-note">Only you can see these details.</p>
                        <div className="pm-prototype-fields">
                            {rootField('email', 'Contact email', true, 'email')}
                            {rootField('phone', 'Contact phone with country code', true, 'tel')}
                        </div>
                    </div>
                </section>
                <section className="pm-card pm-prototype-section pm-prototype-simple" id="editor-about">
                    <div className="pm-card-body">
                        <h3 className="pm-card-title">About &amp; skills</h3>
                        <div className="pm-prototype-fields">
                            <div className="pm-prototype-field pm-prototype-field--full">
                                <ProfileInput id="editor-basic-about" field={area('about', 'Professional summary')} value={basic.about}
                                    error={errors.about} onChange={value => setBasicField('about', value)} />
                            </div>
                            <div className="pm-prototype-field pm-prototype-field--full">
                                <ProfileInput id="editor-basic-skills" field={area('skills', 'Core skills (comma-separated)')} value={basic.skills}
                                    error={errors.skills || Object.entries(errors).find(([key]) => key.startsWith('skills.'))?.[1]} onChange={value => setBasicField('skills', value)} />
                            </div>
                            {rootField('tools_software', 'Tools and software')}
                            {rootField('delivery_methods', 'Delivery methods')}
                        </div>
                    </div>
                </section>
                {collectionKeys.map(type => <EditorCollection key={type} type={type} rows={records[type]} errors={errors}
                    onChange={(index, key, value) => changeRecord(type, index, key, value)}
                    onAdd={() => addRecord(type)} onRemove={index => removeRecord(type, index)} />)}
                <section className="pm-card pm-prototype-section pm-prototype-simple" id="editor-career">
                    <div className="pm-card-body">
                        <h3 className="pm-card-title">Career preferences</h3>
                        <div className="pm-prototype-fields">
                            <ProfileInput id="editor-career-availability" field={{ key: 'availability', label: 'Availability', type: 'select', options: [{ value: 'open', label: 'Open to opportunities' }, { value: 'not_looking', label: 'Not actively looking' }] }} value={career.availability} onChange={value => setCareer(prev => ({ ...prev, availability: value }))} />
                            {careerField('target_roles', 'Target roles')}
                            {careerField('seniority', 'Seniority')}
                            {careerField('locations', 'Preferred work locations')}
                            {careerField('work_arrangement', 'Preferred work arrangement', workArrangements)}
                            {careerField('employment_type', 'Preferred employment type', employmentTypes)}
                            {careerField('notice_period', 'Notice period or earliest start')}
                            <ProfileInput id="editor-career-relocation" field={check('relocation', 'Open to relocation')} value={career.relocation}
                                onChange={value => setCareer(prev => ({ ...prev, relocation: value }))} />
                        </div>
                    </div>
                </section>
                {Object.keys(errors).length > 0 && <div className="pm-profile-error pm-prototype-error-summary" role="alert">
                    Please review the highlighted fields and try again.
                </div>}
            </div>
            <aside className="pm-prototype-help" aria-label="Profile editing help">
                <div className="pm-card"><div className="pm-card-body"><h3 className="pm-card-title">Build from your CV</h3>
                    <p>Review imported suggestions and choose what to add to your draft.</p>
                    <button type="button" className="pm-btn pm-btn-primary pm-btn-sm" onClick={onImport}>Import CV</button>
                </div></div>
                <div className="pm-card"><div className="pm-card-body"><h3 className="pm-card-title">Required fields</h3><p>Fields marked * are required.</p></div></div>
                <div className="pm-card"><div className="pm-card-body"><h3 className="pm-card-title">Profile visibility</h3>
                    <p>Manage visibility for individual fields and sections.</p></div></div>
            </aside>
        </div>
        <div className="pm-profile-sticky-save pm-prototype-save" role="group" aria-label="Profile edit actions">
            <span className="pm-profile-save-description">Review your edits before saving.</span>
            <div className="pm-profile-sticky-buttons">
                <button type="button" className="pm-btn pm-btn-secondary" disabled={saving} onClick={onCancel}>Cancel</button>
                <button type="button" className="pm-btn pm-btn-primary" disabled={saving} onClick={send}>{saving ? 'Saving...' : 'Save changes'}</button>
            </div>
        </div>
    </div>;
}
