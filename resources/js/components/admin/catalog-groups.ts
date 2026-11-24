/** Navigation control manages site-wide header/footer menus only. */
export const navigationGroups = [
    { key: 'header_menu', label: 'Header menu' },
    { key: 'footer_menu', label: 'Footer menu' },
] as const;

/** Master data manages non-icon selections; homepage icons are uploaded per item. */
export const dropdownGroups = [
    { key: 'careers_location', label: 'Job locations' },
    { key: 'careers_type', label: 'Employment types' },
    { key: 'career_trend_topic', label: 'Career Trends topics' },
    { key: 'career_trend_target_level', label: 'Career Trends target levels' },
    { key: 'signup_role', label: 'Signup roles' },
    { key: 'signup_experience', label: 'Signup experience' },
    { key: 'signup_certification', label: 'Signup certifications' },
    { key: 'course_category', label: 'Course categories' },
    { key: 'course_level', label: 'Course levels' },
    { key: 'course_access', label: 'Course access' },
    { key: 'course_question_kind', label: 'Course question types' },
    { key: 'course_question_difficulty', label: 'Course difficulty' },
    { key: 'course_resource_kind', label: 'Course resource types' },
    { key: 'interview_industry', label: 'Interview industries' },
    { key: 'interview_role', label: 'Interview PM roles' },
    { key: 'interview_experience', label: 'Interview experience levels' },
    { key: 'interview_type', label: 'Interview question types' },
    { key: 'interview_count', label: 'Interview question counts' },
    { key: 'interview_mode', label: 'Interview answer modes' },
] as const;
