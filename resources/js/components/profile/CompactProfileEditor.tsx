import { useState, type FormEvent, type ReactNode } from 'react';
import { router } from '@inertiajs/react';
import { Award, BriefcaseBusiness, FileText, Sparkles, UserRound } from 'lucide-react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { ProfileInput, ProfileEditorPrototype, initialRecords, type ProfileData, type CompactDetailKey, type Field } from './ProfileEditorPrototype';

const sections = [
    { id: 'basic', label: 'Basic details', icon: UserRound },
    { id: 'contact', label: 'Contact details', icon: UserRound },
    { id: 'about', label: 'About & skills', icon: Sparkles },
    { id: 'experience', label: 'Experience', icon: BriefcaseBusiness },
    { id: 'projects', label: 'Selected projects', icon: BriefcaseBusiness },
    { id: 'education', label: 'Education', icon: FileText },
    { id: 'certifications', label: 'Certifications & licences', icon: Award },
    { id: 'courses', label: 'Courses & professional development', icon: FileText },
    { id: 'speaking', label: 'Public speaking', icon: FileText },
] as const;
type Section = typeof sections[number]['id'];
type Props = { profile: ProfileData & { completeness: number; location_label: string }; onImport?: () => void; onCancel: () => void };

function SectionPanel({ id, children }: { id: Section; children: ReactNode }) {
    const section = sections.find(item => item.id === id)!;
    const Icon = section.icon;
    return <section id={`compact-${id}`} className="pm-compact-section" aria-labelledby={`compact-title-${id}`}>
        <h2 id={`compact-title-${id}`}><Icon size={18} aria-hidden="true" />{section.label}</h2>
        <div className="pm-prototype-fields">{children}</div>
    </section>;
}

function draftFromProfile(profile: Props['profile']) {
    const details = profile.editor_details;
    const records = initialRecords(profile);
    const first = records.experiences[0];
    const asText = (value: unknown) => String(value ?? '');
    const summary = (key: CompactDetailKey, fallback: string) => Object.prototype.hasOwnProperty.call(details?.compact ?? {}, key)
        ? asText(details?.compact?.[key]) : fallback;
    return {
        name: profile.name, headline: profile.headline, role: profile.role,
        current_organization: details?.current_organization ?? asText(first?.organization),
        industry: profile.industry, country: profile.country, city: profile.city,
        profile_photo_url: details?.profile_photo_url ?? (profile.avatar_path?.startsWith('https://') ? profile.avatar_path : ''),
        cover_photo_url: details?.cover_photo_url ?? (profile.cover_photo_path?.startsWith('https://') ? profile.cover_photo_path : ''),
        email: profile.email, phone: profile.phone, linkedin_url: profile.linkedin_url,
        display_location: summary('display_location', profile.location_label),
        about: profile.about, skills: profile.skills.join(', '),
        employment_period: summary('employment_period', [first?.start_month, first?.is_current ? 'Present' : first?.end_month].filter(Boolean).join(' – ')),
        responsibilities: summary('responsibilities', asText(first?.responsibilities)),
        selected_projects: summary('selected_projects', records.projects.map(row => [row.title, row.scope].filter(Boolean).join(': ')).join('\n')),
        degree: summary('degree', asText(records.educations[0]?.degree)),
        institution: summary('institution', asText(records.educations[0]?.institution)),
        certification: summary('certification', asText(records.certifications[0]?.name)),
        professional_development: summary('professional_development', records.courses.map(row => asText(row.name)).join('\n')),
        public_speaking: summary('public_speaking', records.publications.map(row => asText(row.title)).join('\n')),
    };
}

type Draft = ReturnType<typeof draftFromProfile>;
const detailKeys: CompactDetailKey[] = ['display_location', 'employment_period', 'responsibilities', 'selected_projects', 'degree', 'institution', 'certification', 'professional_development', 'public_speaking'];

export function CompactProfileEditor({ profile, onImport, onCancel }: Props) {
    const [detailed, setDetailed] = useState(false);
    const [baseline, setBaseline] = useState(() => draftFromProfile(profile));
    const [draft, setDraft] = useState(baseline);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [completion, setCompletion] = useState(profile.completeness);
    const dirty = Object.keys(draft).some(key => draft[key as keyof Draft] !== baseline[key as keyof Draft]);
    const field = (key: keyof Draft, label: string, type: Field['type'] = 'text', required = false) =>
        <ProfileInput key={key} id={`compact-field-${key}`} field={{ key, label, type, required, full: type === 'textarea' }}
            value={draft[key]} disabled={saving} error={errors[key] ?? errors[`compact_details.${key}`] ?? (key === 'skills' ? Object.entries(errors).find(([path]) => path.startsWith('skills.'))?.[1] : undefined)}
            onChange={value => setDraft(previous => ({ ...previous, [key]: String(value) }))} />;
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) return;
        const { name, email, headline, role, industry, country, city, phone, linkedin_url, about, skills, current_organization, profile_photo_url, cover_photo_url } = draft;
        const changedDetails = Object.fromEntries(detailKeys.filter(key => draft[key] !== baseline[key]).map(key => [key, draft[key]]));
        setSaving(true);
        setErrors({});
        router.patch(ProfileController.update.url(), {
            tab: 'edit', name, email, headline, role, industry, country, city, phone, linkedin_url, about,
            skills: [...new Set(skills.split(/[,\r\n]+/).map(value => value.trim()).filter(Boolean))],
            compact_details: { current_organization,
                ...(profile_photo_url !== baseline.profile_photo_url ? { profile_photo_url } : {}),
                ...(cover_photo_url !== baseline.cover_photo_url ? { cover_photo_url } : {}),
                ...changedDetails },
        }, {
            preserveScroll: true,
            onSuccess: page => {
                const next = page.props.profileData as Props['profile'] | undefined;
                const fresh = next ? draftFromProfile(next) : draft;
                setBaseline(fresh);
                setDraft(fresh);
                if (next) setCompletion(next.completeness);
            },
            onError: next => {
                setErrors(next);
                const key = Object.keys(next)[0]?.split('.');
                const fieldKey = key?.[0] === 'compact_details' ? key[1] : key?.[0];
                requestAnimationFrame(() => document.getElementById(`compact-field-${fieldKey}`)?.focus());
            },
            onFinish: () => setSaving(false),
        });
    };
    const switchMode = () => {
        if (dirty && !window.confirm('Discard unsaved changes and open detailed records?')) return;
        setDraft(baseline);
        setErrors({});
        setDetailed(true);
    };
    if (detailed) return <>
        <div className="pm-compact-mode"><button type="button" className="pm-btn pm-btn-secondary pm-btn-sm" onClick={() => { if (!window.confirm('Return to the compact editor? Unsaved detailed edits will be discarded.')) return; const fresh = draftFromProfile(profile); setBaseline(fresh); setDraft(fresh); setCompletion(profile.completeness); setDetailed(false); }}>Return to compact editor</button></div>
        <ProfileEditorPrototype profile={profile} onImport={onImport} onCancel={onCancel} />
    </>;
    return <form className="pm-card pm-compact-editor" onSubmit={submit}>
        <nav className="pm-compact-navigation" aria-label="Edit profile sections">
            {sections.map(section => <button key={section.id} type="button" className="pm-btn pm-btn-secondary pm-btn-sm" onClick={() => document.getElementById(`compact-${section.id}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}>{section.label}</button>)}
        </nav>
        <div className="pm-compact-progress">
            <span>Profile completion</span>
            <progress aria-label="Profile completion" max={100} value={completion} />
            <strong>{completion}%</strong>
        </div>
        <SectionPanel id="basic">
            {field('name', 'Full name', 'text', true)}{field('headline', 'Professional headline')}
            {field('role', 'Current job title', 'text', true)}{field('current_organization', 'Current organisation', 'text', true)}
            {field('industry', 'Industry')}{field('country', 'Country')}{field('city', 'City')}
            {field('profile_photo_url', 'Profile photo URL', 'url')}{field('cover_photo_url', 'Cover photo URL', 'url')}
        </SectionPanel>
        <SectionPanel id="contact">
            {field('email', 'Email', 'email', true)}{field('phone', 'Phone', 'tel', true)}
            {field('linkedin_url', 'LinkedIn URL', 'url')}{field('display_location', 'Display location')}
        </SectionPanel>
        <SectionPanel id="about">{field('about', 'Professional summary', 'textarea')}{field('skills', 'Skills', 'textarea')}</SectionPanel>
        <SectionPanel id="experience">{field('employment_period', 'Employment period')}{field('responsibilities', 'Responsibilities', 'textarea')}</SectionPanel>
        <SectionPanel id="projects">{field('selected_projects', 'Selected projects', 'textarea')}</SectionPanel>
        <SectionPanel id="education">{field('degree', 'Degree')}{field('institution', 'Institution')}</SectionPanel>
        <SectionPanel id="certifications">{field('certification', 'Certification')}</SectionPanel>
        <SectionPanel id="courses">{field('professional_development', 'Courses & professional development', 'textarea')}</SectionPanel>
        <SectionPanel id="speaking">{field('public_speaking', 'Public speaking', 'textarea')}</SectionPanel>
        {Object.keys(errors).length > 0 && <div className="pm-prototype-error-summary pm-profile-error" role="alert">{Object.values(errors)[0]}</div>}
        <footer className="pm-compact-actions">
            <span>* Required fields</span>
            <button type="button" className="pm-btn pm-btn-secondary pm-btn-sm pm-compact-details-button" disabled={saving} onClick={switchMode}>Manage detailed records</button>
            <div className="pm-profile-sticky-buttons">
                <button type="button" className="pm-btn pm-btn-secondary pm-btn-sm" disabled={saving} onClick={() => { if (!dirty || window.confirm('Discard unsaved changes?')) onCancel(); }}>Cancel</button>
                <button type="submit" className="pm-btn pm-btn-primary pm-btn-sm" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
            </div>
        </footer>
    </form>;
}
