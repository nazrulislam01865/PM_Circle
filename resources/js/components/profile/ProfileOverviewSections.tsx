import type { ReactNode } from 'react';
import {
    Award, BookOpen, Briefcase, Building2, FileText, GraduationCap,
    Languages, Link as LinkIcon, MapPin, Pencil, Shield, Sparkles, UserCheck, Laptop,
    Users,
} from 'lucide-react';
import {
    definitions, initialRecords,
    type CollectionKey, type Field, type ProfileData, type RowData,
} from './ProfileEditorPrototype';

type Props = {
    profile: ProfileData;
    featuredProjectId?: number;
    onEdit: () => void;
};

const headings: Array<{ key: CollectionKey; icon: typeof Briefcase }> = [
    { key: 'experiences', icon: Briefcase },
    { key: 'projects', icon: FileText },
    { key: 'educations', icon: GraduationCap },
    { key: 'certifications', icon: Shield },
    { key: 'courses', icon: BookOpen },
    { key: 'awards', icon: Award },
    { key: 'publications', icon: FileText },
    { key: 'volunteering', icon: Users },
    { key: 'languages', icon: Languages },
    { key: 'links', icon: LinkIcon },
];

const careerFields: Field[] = [
    { key: 'availability', label: 'Availability' },
    { key: 'target_roles', label: 'Target roles' },
    { key: 'seniority', label: 'Seniority' },
    { key: 'locations', label: 'Preferred work locations' },
    { key: 'work_arrangement', label: 'Preferred work arrangement' },
    { key: 'employment_type', label: 'Preferred employment type' },
    { key: 'notice_period', label: 'Notice period or earliest start' },
    { key: 'relocation', label: 'Open to relocation', type: 'checkbox' },
];

function displayValue(field: Field, value: string | boolean | number | null | undefined): string {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (field.key === 'availability') {
        return value === 'open' ? 'Open to opportunities' : value === 'not_looking' ? 'Not actively looking' : String(value ?? '');
    }
    const result = String(value ?? '').trim();
    if (field.type === 'month' && /^\d{4}-(0[1-9]|1[0-2])$/.test(result)) {
        const [year, month] = result.split('-');
        return `${new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
    }
    return result;
}

function ReadOnlyFields({ fields, record, omit = [] }: {
    fields: Field[];
    record: RowData;
    omit?: string[];
}) {
    const displayed = fields.filter(field => !omit.includes(field.key) &&
        (typeof record[field.key] === 'boolean' || String(record[field.key] ?? '').trim() !== ''));
    if (displayed.length === 0) return null;

    return <dl className="pm-overview-field-grid">
        {displayed.map(field => {
            const value = displayValue(field, record[field.key]);
            const isWebLink = field.type === 'url' && /^https?:\/\//i.test(value);
            return <div className="pm-overview-field" key={field.key}>
                <dt>{field.label}</dt>
                <dd>{isWebLink
                    ? <a href={value} target="_blank" rel="noopener noreferrer" className="pm-overview-field-link">{value}</a>
                    : value}</dd>
            </div>;
        })}
    </dl>;
}

function OverviewCard({ title, icon: Icon, onEdit, children }: {
    title: string;
    icon: typeof Briefcase;
    onEdit: () => void;
    children: ReactNode;
}) {
    return <section className="pm-card" aria-label={title}>
        <div className="pm-card-body">
            <div className="pm-card-header-row">
                <h3 className="pm-card-title"><Icon size={20} aria-hidden="true" /> {title}</h3>
                <button type="button" className="pm-btn-ghost" onClick={onEdit} aria-label={`Edit ${title}`}>
                    <Pencil size={14} aria-hidden="true" /> Edit
                </button>
            </div>
            {children}
        </div>
    </section>;
}

function CollectionCard({ type, icon, rows, featuredProjectId, originalProjects, onEdit }: {
    type: CollectionKey;
    icon: typeof Briefcase;
    rows: RowData[];
    featuredProjectId?: number;
    originalProjects: RowData[];
    onEdit: () => void;
}) {
    const definition = definitions[type];
    const ordered = type === 'projects' && featuredProjectId
        ? [...rows].sort((a, b) => Number(b.id === featuredProjectId) - Number(a.id === featuredProjectId))
        : rows;
    return <OverviewCard title={definition.title} icon={icon} onEdit={onEdit}>
        {ordered.length === 0
            ? <p className="pm-profile-empty">No {definition.title.toLowerCase()} added yet.</p>
            : <div className="pm-overview-records">
                {ordered.map((record, index) => {
                    const original = type === 'projects' ? originalProjects.find(project => project.id === record.id) : null;
                    const workSample = typeof original?.work_sample_path === 'string' && /^https?:\/\//i.test(original.work_sample_path)
                        ? original.work_sample_path : typeof original?.work_sample_path === 'string' && original.work_sample_path.startsWith('/')
                            ? original.work_sample_path : null;
                    return type === 'projects' ? <article className="pm-project-card" key={record.id ?? `${type}-${index}`}>
                        <div className="pm-project-thumb"><Laptop size={44} strokeWidth={1.5} aria-hidden="true" /></div>
                        <div className="pm-project-info">
                            <div>
                                <h4 className="pm-project-title">{String(record.title || definition.itemTitle)}</h4>
                                {record.id === featuredProjectId && <span className="pm-reported-tag">Featured project</span>}
                                {original && (Number(original.team_size) > 0 || Number(original.delivery_months) > 0) &&
                                    <div className="pm-project-metrics">
                                        {Number(original.team_size) > 0 && <span>Team size: <strong>{original.team_size}</strong></span>}
                                        {Number(original.delivery_months) > 0 && <span>Delivery: <strong>{original.delivery_months} months</strong></span>}
                                    </div>}
                                <ReadOnlyFields fields={definition.fields} record={record} omit={['title']} />
                            </div>
                            {workSample && <a className="pm-btn pm-btn-secondary pm-btn-sm pm-overview-work-link" href={workSample}
                                target="_blank" rel="noopener noreferrer">View work sample ↗</a>}
                        </div>
                    </article> : <article className="pm-overview-record" key={record.id ?? `${type}-${index}`}>
                        <div className="pm-overview-record-heading">
                            {type === 'experiences' && <span className="pm-company-logo"><Building2 size={24} aria-hidden="true" /></span>}
                            <div className="pm-overview-record-name">
                                <h4>{String(record[definition.titleField] ?? definition.itemTitle)}</h4>
                            </div>
                        </div>
                        <ReadOnlyFields fields={definition.fields} record={record} omit={[definition.titleField]} />
                    </article>;
                })}
            </div>}
    </OverviewCard>;
}

/** The signed-in owner's overview: it mirrors the editor's persisted fields, without new reads. */
export function ProfileOverviewSections({ profile, featuredProjectId, onEdit }: Props) {
    const details = profile.editor_details;
    const records = initialRecords(profile);
    const basic: RowData = {
        name: profile.name, headline: profile.headline, role: profile.role,
        current_organization: details?.current_organization, industry: profile.industry,
        country: profile.country, city: profile.city,
        profile_photo_url: details?.profile_photo_url,
        cover_photo_url: details?.cover_photo_url,
    };
    const basicFields: Field[] = [
        { key: 'name', label: 'Full name' },
        { key: 'headline', label: 'Professional headline' },
        { key: 'role', label: 'Current job title' },
        { key: 'current_organization', label: 'Current organisation' },
        { key: 'industry', label: 'Industry' },
        { key: 'country', label: 'Country' },
        { key: 'city', label: 'City' },
        { key: 'profile_photo_url', label: 'Profile photo URL', type: 'url' },
        { key: 'cover_photo_url', label: 'Cover photo URL', type: 'url' },
    ];
    const career: RowData = {
        availability: profile.open_to_opportunities ? 'open' : 'not_looking',
        relocation: false,
        ...details?.career,
    };

    return <>
        <OverviewCard title="Basic details" icon={UserCheck} onEdit={onEdit}>
            <ReadOnlyFields fields={basicFields} record={basic} />
        </OverviewCard>
        <OverviewCard title="Contact details" icon={MapPin} onEdit={onEdit}>
            <p className="pm-overview-private-note">Only you can see these contact details on this page.</p>
            <ReadOnlyFields fields={[{ key: 'email', label: 'Contact email' }, { key: 'phone', label: 'Contact phone with country code' }]}
                record={{ email: profile.email, phone: profile.phone }} />
        </OverviewCard>
        <OverviewCard title="About & skills" icon={Sparkles} onEdit={onEdit}>
            {profile.about
                ? <p className="pm-overview-about">{profile.about}</p>
                : <p className="pm-profile-empty">No professional summary added yet.</p>}
            <div className="pm-overview-skills-title">Core skills</div>
            {profile.skills.length
                ? <div className="pm-skills-list">{profile.skills.map(skill => <span className="pm-skill-tag" key={skill}>{skill}</span>)}</div>
                : <p className="pm-profile-empty">No skills added yet.</p>}
            <ReadOnlyFields fields={[{ key: 'tools_software', label: 'Tools and software' }, { key: 'delivery_methods', label: 'Delivery methods' }]}
                record={{ tools_software: details?.tools_software, delivery_methods: details?.delivery_methods }} />
        </OverviewCard>
        {headings.map(({ key, icon }) => <CollectionCard key={key} type={key} icon={icon} rows={records[key]}
            featuredProjectId={featuredProjectId} originalProjects={profile.projects} onEdit={onEdit} />)}
        <OverviewCard title="Career preferences" icon={Briefcase} onEdit={onEdit}>
            <ReadOnlyFields fields={careerFields} record={career} />
        </OverviewCard>
    </>;
}
