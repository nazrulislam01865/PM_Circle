import { resumeSectionNavigation, resumeSections, type ResumeSectionId } from './resumeFieldSchema';

export type Value = string | boolean | number | null | undefined;
export type RowData = { id?: number; [key: string]: Value };
export type CollectionKey = 'experiences' | 'projects' | 'educations' | 'certifications' | 'courses' | 'awards' | 'publications' | 'volunteering' | 'languages' | 'links' | 'research' | 'skill_groups' | 'interests';
export type Field = { key: string; label: string; type?: 'text' | 'email' | 'tel' | 'textarea' | 'month' | 'select' | 'checkbox' | 'url'; required?: boolean; full?: boolean; maxLength?: number; options?: Array<string | { value: string; label: string }>; disabledWhen?: string };
type CollectionDefinition = { title: string; itemTitle: string; addLabel: string; titleField: string; fields: Field[] };

export type CompactDetailKey = 'display_location' | 'employment_period' | 'responsibilities' | 'selected_projects' | 'degree' | 'institution' | 'certification' | 'professional_development' | 'public_speaking';

export type ProfileEditorDetails = {
    current_organization?: string; profile_photo_url?: string; cover_photo_url?: string;
    tools_software?: string; delivery_methods?: string; portfolio?: string; github?: string;
    compact?: Partial<Record<CompactDetailKey, string | null>>;
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
export const area = (key: string, label: string): Field => ({ key, label, type: 'textarea', full: true });
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
        text('technical', 'Technical skills'), text('soft', 'Soft skills'),
    ] },
    research: { title: 'Research work', itemTitle: 'Research', addLabel: 'Add research entry', titleField: 'title', fields: [
        text('title', 'Research title', true), text('location', 'Location'), text('team_role', 'Role / research team'),
        text('period', 'Research period'), area('description', 'Research details'), text('technical', 'Technical skills'), text('soft', 'Soft skills'),
    ] },
    projects: { title: 'Selected projects', itemTitle: 'Project', addLabel: 'Add project', titleField: 'title', fields: [
        text('title', 'Project name', true), text('role', 'Role or contribution', true),
        text('organization', 'University / organisation or client'), text('industry', 'Industry or business area'),
        text('location', 'Location'), text('team', 'Team members'),
        month('start_month', 'Start month'), month('end_month', 'End month'),
        choice('status', 'Project status', ['Planned', 'In progress', 'On hold', 'Completed']), text('scale', 'Team size or project scale'),
        area('scope', 'Scope and delivery approach'), area('outcomes', 'Outcomes and metrics'),
        text('technical', 'Technical skills'), text('soft', 'Soft skills'), link('work_url', 'Project or case study URL'),
    ] },
    educations: { title: 'Education', itemTitle: 'Education', addLabel: 'Add education entry', titleField: 'degree', fields: [
        text('degree', 'Degree, qualification or programme', true), text('institution', 'Institution', true),
        text('field_of_study', 'Field of study'), text('location', 'Location'),
        month('start_month', 'Start month'), month('end_month', 'End or expected completion month', false, 'is_current'),
        check('is_current', 'Currently studying'), text('grade', 'Grade or CGPA'), area('honours', 'Honours or relevant coursework'), area('courses', 'Courses'),
    ] },
    certifications: { title: 'Certifications & licences', itemTitle: 'Credential', addLabel: 'Add credential', titleField: 'name', fields: [
        text('name', 'Credential name', true), text('issuing_organization', 'Issuing organisation', true),
        month('issue_month', 'Issue month'), month('expiry_month', 'Expiry month', false, 'does_not_expire'),
        check('does_not_expire', 'Credential does not expire'), text('credential_number', 'Credential ID'),
        link('verification_url', 'Verification URL'), area('details', 'Details'),
    ] },
    skill_groups: { title: 'Skill categories', itemTitle: 'Skill category', addLabel: 'Add skill category', titleField: 'category', fields: [
        text('category', 'Skill category', true), area('skills', 'Skills'),
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
    interests: { title: 'Interests', itemTitle: 'Interest', addLabel: 'Add interest', titleField: 'title', fields: [
        text('title', 'Interest', true), area('description', 'Details'),
    ] },
    languages: { title: 'Languages', itemTitle: 'Language', addLabel: 'Add language', titleField: 'name', fields: [
        text('name', 'Language', true), choice('proficiency', 'Proficiency', ['Elementary proficiency', 'Limited working proficiency', 'Professional working proficiency', 'Full professional proficiency', 'Native or bilingual']),
    ] },
    links: { title: 'Portfolio & links', itemTitle: 'Link', addLabel: 'Add link', titleField: 'label', fields: [
        text('label', 'Link label', true), link('url', 'Website, LinkedIn or portfolio URL', true),
    ] },
};

// Keep the original definitions for legacy read-only records; the editable form
// is generated from the same schema as the private resume assistant.
export const resumeCollectionMap = {
    education: 'educations', experience: 'experiences', research: 'research', projects: 'projects',
    skills: 'skill_groups', achievements: 'awards', interests: 'interests', languages: 'languages', certifications: 'certifications',
} as const satisfies Record<ResumeSectionId, CollectionKey>;
const resumeFieldMap: Record<ResumeSectionId, Record<string, string>> = {
    education: {title:'institution', subtitle:'degree', description:'honours'},
    experience: {title:'organization', subtitle:'job_title', description:'responsibilities'},
    research: {subtitle:'team_role'},
    projects: {subtitle:'organization', description:'scope'},
    skills: {title:'category', description:'skills'},
    achievements: {title:'name', subtitle:'organization'},
    interests: {}, languages: {title:'name', description:'proficiency'},
    certifications: {title:'name', subtitle:'issuing_organization', description:'details'},
};
export const alignedCollections = resumeSections.map(section => resumeCollectionMap[section.id]);
export const alignedDefinitions = Object.fromEntries(resumeSections.map(section => {
    const key = resumeCollectionMap[section.id];
    const map = resumeFieldMap[section.id];
    const fields = section.fields.map(([name,label]): Field => ({
        key: map[name] ?? name, label,
        ...(name === 'description' || name === 'courses' ? {type:'textarea' as const, full:true} : {}),
        required: name === 'title' || (name === 'subtitle' && ['education','experience'].includes(section.id)),
        maxLength: section.id === 'education' && ['title','subtitle'].includes(name) ? 180 : section.id === 'experience' && ['title','subtitle'].includes(name) ? 150 : section.id === 'projects' && name === 'title' ? 180 : section.id === 'certifications' && name === 'title' ? 100 : section.id === 'languages' && name === 'title' ? 50 : ['description','courses'].includes(name) ? 4000 : 255,
    }));
    return [key, {...definitions[key], title:section.title, titleField:map.title ?? 'title', fields, addLabel:`Add ${section.id === 'experience' ? 'experience' : section.title.toLowerCase()} entry`}];
})) as Record<typeof alignedCollections[number], CollectionDefinition>;
export const navigation = resumeSectionNavigation.map(section => ({id: section.id === 'basic' || section.id === 'summary' ? section.id : resumeCollectionMap[section.id], label:section.label}));

export function monthValue(value: Value): string {
    if (typeof value === 'number') value = String(value);
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
    const links = persisted.links ?? [];
    const linkedIn = links.some(item => /linkedin/i.test(String(item.label ?? '')));
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
        volunteering: persisted.volunteering ?? [], research: persisted.research ?? [],
        skill_groups: persisted.skill_groups ?? [], interests: persisted.interests ?? [],
        languages: persisted.languages ?? profile.languages.map(name => ({ name, proficiency: '' })),
        links: !linkedIn && profile.linkedin_url ? [...links, { label: 'LinkedIn', url: profile.linkedin_url }] : links,
    };
}

const joinDetails = (...values: Value[]) => values.map(value => String(value ?? '').trim()).filter(Boolean).join('\n');
const formatPeriod = (start: Value, end: Value, current?: Value) => [start, current ? 'Present' : end].filter(Boolean).join(' – ');
export function alignedRecords(profile: ProfileData): Record<CollectionKey, RowData[]> {
    const records = initialRecords(profile);
    const source = profile.editor_details?.records ?? {};
    const originalExperiences = new Map(profile.experiences.map(row => [row.id, row]));
    const originalEducations = new Map(profile.educations.map(row => [row.id, row]));
    const originalCertifications = new Map(profile.certifications.map(row => [row.id, row]));
    const savedEducations = new Map((source.educations ?? []).map(row => [row.id, row]));
    const educationEnd = (id: number | undefined) => {
        const year = originalEducations.get(id)?.year;
        const month = savedEducations.get(id)?.end_month;
        return month && year && String(month).startsWith(String(year)) ? month : year;
    };
    records.experiences = records.experiences.map(row => ({...row,
        period: row.period ?? formatPeriod(originalExperiences.get(row.id)?.start_date, originalExperiences.get(row.id)?.end_date, row.is_current),
        responsibilities: joinDetails(row.responsibilities, row.achievements),
    }));
    records.projects = records.projects.map(row => ({...row,
        period: row.period ?? formatPeriod(row.start_month, row.end_month),
        organization: row.organization ?? '', scope: joinDetails(row.scope,row.outcomes),
    }));
    records.educations = records.educations.map(row => ({...row, period: row.period ?? formatPeriod(row.start_month,educationEnd(row.id),row.is_current)}));
    records.certifications = records.certifications.map(row => ({...row, period: row.period ?? formatPeriod(row.issue_month,row.does_not_expire ? 'Does not expire' : originalCertifications.get(row.id)?.valid_until)}));
    records.awards = (source.awards ?? []).map((row,index) => ({...row, source_index:index, period:row.period ?? row.award_month ?? ''}));
    const categorized = new Set(records.skill_groups.flatMap(row => String(row.skills ?? '').split(/[,\r\n]+/).map(skill=>skill.trim().toLowerCase())));
    const remaining = profile.skills.filter(skill => !categorized.has(skill.trim().toLowerCase()));
    if (remaining.length) records.skill_groups = [...records.skill_groups, {category:'Professional skills',skills:remaining.join(', ')}];
    return records;
}
export function alignedBasic(profile: ProfileData) {
    return {name:profile.name,email:profile.email,role:profile.role,location:profile.editor_details?.compact?.display_location ?? [profile.city,profile.country].filter(Boolean).join(', '),
        headline:profile.headline,phone:profile.phone,portfolio:profile.editor_details?.portfolio ?? '',github:profile.editor_details?.github ?? '',linkedin:profile.linkedin_url,about:profile.about};
}
export function alignedPayload(records: Record<CollectionKey, RowData[]>) {
    return Object.fromEntries(alignedCollections.map(type => [type, records[type].map(row => Object.fromEntries([
        ...alignedDefinitions[type].fields.map(field => [field.key, row[field.key] ?? '']),
        ...(row.id != null && ['experiences','projects','educations','certifications'].includes(type) ? [['id',row.id]] : []),
        ...(type === 'awards' && row.source_index != null ? [['source_index',row.source_index]] : []),
    ]))]));
}

