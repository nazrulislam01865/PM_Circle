/** Navigation labels only; the editable dropdown values are always database-driven. */
export const navigationGroups = [
    { key: 'hero_primary_url', label: 'Primary hero links' },
    { key: 'hero_secondary_url', label: 'Secondary hero links' },
    { key: 'skills_url', label: 'Skill card links' },
    { key: 'careers_feature_url', label: 'Career feature links' },
] as const;

export const dropdownGroups = [
    { key: 'pathway_step_icon', label: 'Career pathway icons' },
    { key: 'pathway_exam_icon', label: 'Exam card icons' },
    { key: 'skills_icon', label: 'Skill card icons' },
    { key: 'careers_feature_icon', label: 'Career feature icons' },
    { key: 'careers_opportunity_icon', label: 'Opportunity icons' },
    { key: 'careers_location', label: 'Job locations' },
    { key: 'careers_type', label: 'Employment types' },
] as const;
