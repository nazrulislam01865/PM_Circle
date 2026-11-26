export const resumeSections = [
    { id: 'education', title: 'Education', fields: [['title','Institution'],['location','Location'],['subtitle','Degree or qualification'],['period','Study period'],['description','Highlights'],['courses','Courses']] },
    { id: 'experience', title: 'Work Experience', fields: [['title','Company'],['location','Location'],['subtitle','Job title'],['period','Employment period'],['description','Responsibilities and achievements'],['technical','Technical skills'],['soft','Soft skills']] },
    { id: 'research', title: 'Research Work', fields: [['title','Research title'],['location','Location'],['subtitle','Role / research team'],['period','Research period'],['description','Research details'],['technical','Technical skills'],['soft','Soft skills']] },
    { id: 'projects', title: 'Projects', fields: [['title','Project title'],['location','Location'],['subtitle','University / organisation'],['period','Project period'],['description','Project details'],['technical','Technical skills'],['soft','Soft skills'],['team','Team members']] },
    { id: 'skills', title: 'Skills', fields: [['title','Skill category'],['description','Skills']] },
    { id: 'achievements', title: 'Achievements', fields: [['period','Year'],['title','Achievement'],['subtitle','Awarding organisation']] },
    { id: 'interests', title: 'Interests', fields: [['title','Interest'],['description','Details']] },
    { id: 'languages', title: 'Languages', fields: [['title','Language'],['description','Proficiency']] },
    { id: 'certifications', title: 'Certifications', fields: [['title','Certification'],['subtitle','Issuer'],['period','Date / validity'],['description','Details']] },
] as const;
export type ResumeSectionId = typeof resumeSections[number]['id'];
export type ResumeEntry = Partial<Record<'title'|'location'|'subtitle'|'period'|'description'|'courses'|'technical'|'soft'|'team', string | null>>;
export type ResumeContactKey = 'headline'|'phone'|'portfolio'|'github'|'linkedin';
export type ResumeDocument = Record<ResumeContactKey,string|null> & Record<ResumeSectionId,ResumeEntry[]>;
export const contactFields = [['headline','Professional headline'],['phone','Phone'],['portfolio','Portfolio URL or label'],['github','GitHub username or URL'],['linkedin','LinkedIn username or URL']] as const;

export const resumeIdentityFields = [['name','Full name'],['email','Email'],['role','Current role'],['location','Location']] as const;
export const resumeBasicFields = [...resumeIdentityFields,...contactFields] as const;
export const resumeSectionNavigation = [{id:'basic',label:'Basic details'},{id:'summary',label:'Personal Profile'},...resumeSections.map(section=>({id:section.id,label:section.title}))] as const;

/** A rewrite request is scoped to one actual textarea, not an entire CV entry list. */
export const resumeRewriteSections = {
    education: { description: 'Education highlights', courses: 'Education courses' },
    experience: { description: 'Responsibilities' },
    research: { description: 'Research details' },
    projects: { description: 'Project details' },
    skills: { description: 'Skills' },
    interests: { description: 'Interest details' },
    languages: { description: 'Language proficiency' },
    certifications: { description: 'Certification details' },
} as const;
export type ResumeLongField = 'description' | 'courses';
export function resumeRewriteLabel(section: ResumeSectionId, field: ResumeLongField): string | undefined {
    const labels: Partial<Record<ResumeSectionId, Partial<Record<ResumeLongField, string>>>> = resumeRewriteSections;
    return labels[section]?.[field];
}
