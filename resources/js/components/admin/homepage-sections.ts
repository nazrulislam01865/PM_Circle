/** Public homepage order, shared with the admin sidebar. */
export const homepageSections = [
    { key: 'hero', name: 'Hero slider', detail: 'Slides, text, images and actions' },
    { key: 'quick_links', name: 'Quick links', detail: 'Links below the hero' },
    { key: 'certification', name: 'Certification practice', detail: 'Exam simulator cards and comparison link' },
    { key: 'courses', name: 'Courses', detail: 'Section copy and published course limit' },
    { key: 'community_intro', name: 'Community heading', detail: 'Introduction above the community panels' },
    { key: 'community', name: 'Community feed', detail: 'Composer and latest public posts' },
    { key: 'scenario', name: 'Daily challenge', detail: 'Published scenario selection and actions' },
    { key: 'members', name: 'Member preview', detail: 'Public profiles and member directory link' },
    { key: 'skills', name: 'Skills sidebar', detail: 'Practice resource links and icons' },
    { key: 'ai_features', name: 'AI features', detail: 'Eight AI practice cards and actions' },
    { key: 'resume', name: 'AI Resume Assistant', detail: 'Resume promotion and workflow steps' },
    { key: 'trends', name: 'Trends banner', detail: 'Banner copy, image and destination' },
    { key: 'events', name: 'Community events', detail: 'Published upcoming events and actions' },
    { key: 'join', name: 'Join banner', detail: 'Final membership call to action' },
] as const;
export type HomepageSection = (typeof homepageSections)[number]['key'];
export type HomepageSectionVisibility = Record<HomepageSection, boolean>;
