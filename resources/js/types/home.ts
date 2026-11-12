export type HomePathwayContent = {
    steps: {
        heading: string;
        items: { title: string; description: string; icon: string; icon_image?: string | null }[];
    };
    exams: {
        heading: string;
        description: string;
        compare_label: string;
        more_label: string;
        items: { title: string; description: string; icon: string; icon_image?: string | null; features: string[]; button_label: string; plans_label: string }[];
    };
    banner: { heading: string; description: string; button_label: string };
};
export type HomePerson = { name: string; avatar_path?: string | null };
export type HomeFeature = { title: string; description: string; url: string; icon: string; icon_image?: string | null };
export type HomeOpportunity = { role: string; company: string; location: string; type: string; icon?: string };
export type HomeCareerJob = { slug: string; title: string; company: string; location: string; type: string };
export type HomeContent = {
    sections?: Record<'hero' | 'pathway' | 'scenario' | 'community' | 'members' | 'skills' | 'career_features' | 'careers', boolean>;
    hero?: { eyebrow: string; title: string; description: string; primary_label: string; secondary_label: string; primary_url?: string; secondary_url?: string; people: HomePerson[]; caption_learn?: string; caption_discuss?: string; caption_career?: string };
    pathway?: HomePathwayContent;
    scenario?: { heading: string; status_label: string; button_label: string; read_button_label?: string; discussion_button_label?: string; responses_heading?: string; hint: string; score_label?: string; demo_response_emails?: string[]; featured_id?: number | null; view_all_label?: string; view_all_url?: string; read_url?: string; discussion_url?: string; empty_message?: string; empty_responses_message?: string };
    members?: { heading: string; hint: string; button_label: string; featured_ids?: number[]; empty_message?: string };
    skills?: { heading: string; items: HomeFeature[] };
    community?: { heading: string; view_all_label: string; prompt_title: string; prompt_description: string; button_label: string; topics?: string[]; demo_post_emails?: string[]; featured_ids?: number[]; view_all_url?: string; button_url?: string; empty_message?: string };
    careers?: {
        heading: string;
        features: HomeFeature[];
        opportunities_heading: string;
        jobs_view_all_label?: string; jobs_url?: string;
        show_sample_opportunities?: boolean;
        empty_message?: string;
        opportunities: HomeOpportunity[];
        resume: { title: string; description: string; button_label: string; button_url?: string; icon_image?: string | null };
        join: { heading: string; description: string; button_label: string; button_url?: string; hint: string };
    };
};
export type HomeMember = {
    id: number;
    name: string;
    profile?: { role?: string | null; avatar_path?: string | null } | null;
};
