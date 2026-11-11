/** Shared by the admin sidebar and homepage editor. */
export const homepageSections = [
    { key: 'hero', name: 'Hero & portraits', detail: 'First impression, buttons and people' },
    { key: 'pathway', name: 'Career pathway', detail: 'Steps, exam cards and skill banner' },
    { key: 'scenario', name: 'Daily challenge', detail: 'Scenario section and featured question' },
    { key: 'community', name: 'Community feed', detail: 'Post cards, topics and call to action' },
    { key: 'members', name: 'Member preview', detail: 'New members panel and curated profiles' },
    { key: 'skills', name: 'Skills sidebar', detail: 'Practice cards and links' },
    { key: 'careers', name: 'Career highlights', detail: 'Features, opportunities, resume and join' },
] as const;

export type HomepageSection = (typeof homepageSections)[number]['key'];
export type HomepageSectionVisibility = Record<HomepageSection, boolean>;
