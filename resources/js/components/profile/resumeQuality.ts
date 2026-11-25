import type { ResumeDocument, ResumeEntry } from './ResumeDocumentFields';
import type { ResumeFields } from './ResumeDraftPreview';

const words = (value?: string | null) => (value ?? '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const meaningful = (value?: string | null, min = 2) => new Set(words(value).filter(word => word.length > 1)).size >= min;
const present = (value?: string | null) => Boolean(value?.trim());
const dated = (value?: string | null) => /\b(?:19|20)\d{2}\b/.test(value ?? '');
const populated = (rows: ResumeEntry[]) => rows.filter(row => Object.values(row).some(present));

/** Transparent template completeness, not a judgement of career merit or ATS compatibility. */
export function qualityChecks(data: ResumeFields, document: ResumeDocument) {
    const evidence = [
        ...populated(document.education).map(row => ({ row, detail: meaningful(row.description, 5) || meaningful(row.courses, 3) })),
        ...[...document.experience, ...document.research, ...document.projects].filter(row => Object.values(row).some(present)).map(row => ({ row, detail: meaningful(row.description, 5) })),
    ];
    const skills = populated(document.skills);
    const optional = [document.achievements, document.interests, document.languages, document.certifications].flatMap(populated);
    const incomplete = evidence.some(({row}) => !present(row.title) || !present(row.subtitle) || !dated(row.period)) || skills.some(row => !present(row.title) || !meaningful(row.description, 2)) || optional.some(row => !present(row.title)) || populated(document.languages).some(row => !present(row.description)) || populated(document.interests).some(row => !present(row.description)) || populated(document.achievements).some(row => !dated(row.period) || !present(row.subtitle));
    const checks = [
        ['Name and contact email', meaningful(data.name, 1) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()), 'Add your full name and a valid contact email.'],
        ['Headline and location', meaningful(document.headline || data.role, 1) && meaningful(data.location, 1), 'Add a professional headline and location.'],
        ['Personal profile', meaningful(data.summary, 8), 'Write a meaningful personal profile describing your background.'],
        ['Personal profile detail', meaningful(data.summary, 18), 'Expand your personal profile with relevant experience and strengths.'],
        ['Education or practical experience', evidence.some(({row}) => present(row.title) && present(row.subtitle)), 'Add education, work experience, research or a project with a role or qualification.'],
        ['Dates in education or experience', evidence.some(({row}) => present(row.title) && present(row.subtitle) && dated(row.period)), 'Add a dated education, work, research or project entry.'],
        ['Evidence and contributions', evidence.some(({row,detail}) => present(row.title) && present(row.subtitle) && detail), 'Describe coursework, responsibilities, contributions or outcomes.'],
        ['Relevant skills', skills.some(row => meaningful(row.description, 2)), 'List relevant skills.'],
        ['Categorized skills', skills.some(row => present(row.title) && meaningful(row.description, 3)), 'Organize skills under meaningful categories.'],
        ['Consistent entry details', evidence.length > 0 && !incomplete, 'Complete missing titles, dates and details in the sections you have added.'],
    ] as const;
    return checks.map(([label, passed, tip]) => ({label, points: passed ? 1 : 0, tip}));
}
