import { ChevronDown } from 'lucide-react';
import { ProfileEntryEditor } from './ProfileEntryEditor';

type Entry = { id?: number; [key: string]: unknown };
export type ProfileSectionId = 'basic' | 'about' | 'experience' | 'projects' | 'education' | 'certifications' | 'career' | 'links';
export const sectionAnchor: Record<ProfileSectionId, string> = {
    basic: 'basic-details', about: 'about-skills', experience: 'experience-section',
    projects: 'projects-section', education: 'education-section', certifications: 'certifications-section',
    career: 'career-section', links: 'links-section',
};
export const sectionLabel: Record<ProfileSectionId, string> = {
    basic: 'Basic details', about: 'About & skills', experience: 'Experience', projects: 'Projects',
    education: 'Education', certifications: 'Certifications', career: 'Career preferences', links: 'Links & languages',
};

type Props = {
    active: ProfileSectionId;
    expanded: Record<string, boolean>;
    toggle: (id: ProfileSectionId) => void;
    projects: Entry[];
    experiences: Entry[];
    educations: Entry[];
    certifications: Entry[];
    career: { open_to_opportunities: boolean };
    links: { linkedin_url: string; languages: string[] };
    update: (changes: Record<string, unknown>) => void;
};

function ExpandableSection({ id, active, expanded, toggle, count, children, note }: {
    id: ProfileSectionId; active: ProfileSectionId; expanded: boolean; toggle: () => void;
    count?: number; children: React.ReactNode; note?: string;
}) {
    return <section id={sectionAnchor[id]} className={`pm-card pm-profile-expandable ${active === id ? 'is-current' : ''}`}>
        <button type="button" className="pm-profile-section-toggle" onClick={toggle} aria-expanded={expanded}
            aria-controls={`${id}-editor-panel`}>
            <strong>{sectionLabel[id]}{count !== undefined ? ` (${count})` : ''}</strong>
            <span className="pm-profile-section-trailing">{!expanded && note && <span>{note}</span>}
                <ChevronDown size={18} className={expanded ? 'rotate-180' : ''} /></span>
        </button>
        {expanded && <div id={`${id}-editor-panel`} className="pm-card-body pm-profile-section-content">{children}</div>}
    </section>;
}

export function ProfileEditSections({ active, expanded, toggle, projects, experiences, educations, certifications, career, links, update }: Props) {
    return <div className="pm-profile-edit-sections">
        <ExpandableSection id="experience" active={active} expanded={expanded.experience} toggle={() => toggle('experience')} count={experiences.length}>
            <ProfileEntryEditor label="experience" entries={experiences} saveUrl="/settings/profile/experiences"
                deleteUrl={(id) => `/settings/profile/experiences/${id}`}
                summary={(entry) => `${entry.job_title || 'Untitled'} at ${entry.organization || 'Organisation'}`}
                blank={{ job_title: '', organization: '', employment_type: 'Full-time', start_date: '', end_date: '', is_current: false, responsibilities: '' }}
                fields={[{ key: 'job_title', label: 'Job title', required: true, placeholder: 'e.g. Project Manager' }, { key: 'organization', label: 'Organisation', required: true, placeholder: 'e.g. Acme Ltd' },
                    { key: 'employment_type', label: 'Employment type', kind: 'select', choices: ['Full-time', 'Part-time', 'Contract', 'Freelance'] },
                    { key: 'start_date', label: 'Start date', kind: 'date', required: true },
                    { key: 'end_date', label: 'End date', kind: 'date' },
                    { key: 'is_current', label: 'Currently work here', kind: 'checkbox' },
                    { key: 'responsibilities', label: 'Responsibilities & measurable outcomes', kind: 'textarea', fullWidth: true, placeholder: 'Describe achievements, responsibilities and measurable results...' }]} />
        </ExpandableSection>
        <ExpandableSection id="projects" active={active} expanded={expanded.projects} toggle={() => toggle('projects')} count={projects.length}>
            <ProfileEntryEditor label="project" entries={projects} saveUrl="/settings/profile/projects"
                deleteUrl={(id) => `/settings/profile/projects/${id}`}
                summary={(entry) => String(entry.title || 'Untitled project')}
                blank={{ title: '', summary: '', role: '', team_size: null, delivery_months: null, is_featured: false, is_anonymized: true }}
                fields={[{ key: 'title', label: 'Project title', required: true, placeholder: 'e.g. Customer portal rollout' },
                    { key: 'role', label: 'Your role', placeholder: 'e.g. Project Lead' }, { key: 'team_size', label: 'Team size', kind: 'number', placeholder: 'e.g. 8' },
                    { key: 'delivery_months', label: 'Delivery (months)', kind: 'number', placeholder: 'e.g. 6' },
                    { key: 'summary', label: 'Summary', kind: 'textarea', fullWidth: true, placeholder: 'What did you deliver and what impact did it have?' },
                    { key: 'is_featured', label: 'Show as featured project', kind: 'checkbox' },
                    { key: 'is_anonymized', label: 'Anonymize work sample', kind: 'checkbox' }]} />
        </ExpandableSection>
        <ExpandableSection id="education" active={active} expanded={expanded.education} toggle={() => toggle('education')} count={educations.length}>
            <ProfileEntryEditor label="education" entries={educations} saveUrl="/settings/profile/educations"
                deleteUrl={(id) => `/settings/profile/educations/${id}`}
                summary={(entry) => `${entry.degree || 'Degree'} · ${entry.institution || 'Institution'}`}
                blank={{ degree: '', institution: '', year: '' }}
                fields={[{ key: 'degree', label: 'Degree / qualification', required: true, placeholder: 'e.g. BSc in Computer Science' },
                    { key: 'institution', label: 'Institution', required: true, placeholder: 'University or institution name' }, { key: 'year', label: 'Graduation year', placeholder: 'e.g. 2026' }]} />
        </ExpandableSection>
        <ExpandableSection id="certifications" active={active} expanded={expanded.certifications} toggle={() => toggle('certifications')} count={certifications.length}>
            <ProfileEntryEditor label="certification" entries={certifications} saveUrl="/settings/profile/certifications"
                deleteUrl={(id) => `/settings/profile/certifications/${id}`}
                summary={(entry) => String(entry.name || 'Certification')}
                blank={{ name: '', credential_number: '', valid_until: '' }}
                fields={[{ key: 'name', label: 'Certification name', required: true, placeholder: 'e.g. PMP' },
                    { key: 'credential_number', label: 'Credential number', placeholder: 'Credential ID (if available)' }, { key: 'valid_until', label: 'Valid until', kind: 'date' }]} />
            <p className="pm-profile-hint">Credentials remain self-reported until separately verified.</p>
        </ExpandableSection>
        <ExpandableSection id="career" active={active} expanded={expanded.career} toggle={() => toggle('career')}
            note={career.open_to_opportunities ? 'Open to opportunities' : 'Not actively looking'}>
            <div className="pm-form-group">
                <label className="pm-profile-checkbox"><input type="checkbox" checked={career.open_to_opportunities}
                    onChange={(e) => update({ open_to_opportunities: e.target.checked })} /> Open to career opportunities</label>
            </div>
        </ExpandableSection>
        <ExpandableSection id="links" active={active} expanded={expanded.links} toggle={() => toggle('links')}
            note={[links.linkedin_url ? 'LinkedIn' : '', ...links.languages].filter(Boolean).join(', ')}>
            <div className="pm-form-group">
                <label htmlFor="pm-linkedin-profile" className="pm-label">LinkedIn profile URL</label>
                <input id="pm-linkedin-profile" type="url" className="pm-input" placeholder="https://linkedin.com/in/your-name"
                    value={links.linkedin_url} onChange={(e) => update({ linkedin_url: e.target.value })} />
            </div>
            <div className="pm-form-group">
                <label htmlFor="pm-language-list" className="pm-label">Languages (comma separated)</label>
                <input id="pm-language-list" className="pm-input" placeholder="English, Bangla"
                    value={links.languages.join(', ')} onChange={(e) => update({ languages: e.target.value.split(',').map((s) => s.trim()) })} />
            </div>
            <p className="pm-profile-hint">Use “Save changes” at the top to update your career preferences and links.</p>
        </ExpandableSection>
    </div>;
}
