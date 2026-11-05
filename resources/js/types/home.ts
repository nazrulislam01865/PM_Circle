export type HomePathwayContent = {
    steps: {
        heading: string;
        items: { title: string; description: string; icon: string }[];
    };
    exams: {
        heading: string;
        description: string;
        compare_label: string;
        more_label: string;
        items: { title: string; description: string; icon: string; features: string[]; button_label: string; plans_label: string }[];
    };
    banner: { heading: string; description: string; button_label: string };
};
export type HomePerson = { name: string; avatar_path?: string | null };
export type HomeFeature = { title: string; description: string; url: string; icon: string };
export type HomeOpportunity = { role: string; company: string; location: string; type: string; icon?: string };
export type HomeContent = {
    hero?: { eyebrow: string; title: string; description: string; primary_label: string; secondary_label: string; people: HomePerson[] };
    pathway?: HomePathwayContent;
    scenario?: { heading: string; status_label: string; button_label: string; read_button_label?: string; discussion_button_label?: string; responses_heading?: string; hint: string; score_label?: string; demo_response_emails?: string[] };
    members?: { heading: string; hint: string; button_label: string };
    skills?: { heading: string; items: HomeFeature[] };
    community?: { heading: string; view_all_label: string; prompt_title: string; prompt_description: string; button_label: string; topics?: string[]; demo_post_emails?: string[] };
    careers?: {
        heading: string;
        features: HomeFeature[];
        opportunities_heading: string;
        opportunities: HomeOpportunity[];
        resume: { title: string; description: string; button_label: string };
        join: { heading: string; description: string; button_label: string; hint: string };
    };
};
export type HomeMember = {
    id: number;
    name: string;
    profile?: { role?: string | null; avatar_path?: string | null } | null;
};
