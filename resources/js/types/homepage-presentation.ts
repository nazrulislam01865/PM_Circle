import type { ReferencePhotoKey } from '@/components/home/v2/reference';

type Section = { enabled: boolean };
type Heading = { heading: string; description: string };
type Action = { button_label: string; button_url: string };
type Photo = { photo: ReferencePhotoKey; image: string | null };
type LinkItem = { label: string; href: string };
type TextCard = { title: string; description: string };
export type HomepagePresentation = {
    hero: Section & { slides: (Photo & TextCard & { tab: string; eyebrow: string; primary: string; secondary: string; primary_url: string; secondary_url: string })[] };
    quick_links: Section & { items: LinkItem[] };
    certification: Section & Heading & Action & { items: (Photo & TextCard & LinkItem & { button: string })[] };
    courses: Section & Heading & Action & { card_button: string; limit: number; empty_message: string };
    community_intro: Section & Heading;
    community: Section & { heading: string; compose_label: string; limit: number; empty_message: string };
    scenario: Section & { status_label: string; read_label: string; read_url: string | null; featured_id: number | null; empty_message: string };
    members: Section & Heading & Action & { featured_ids: number[]; empty_message: string };
    skills: Section & { heading: string; items: { title: string; href: string; icon: 'practice' | 'scrum' | 'learn'; image: string | null }[] };
    ai_features: Section & Heading & Action & { cards: (Photo & TextCard & { href: string })[] };
    resume: Section & TextCard & Action & { note: string; image: string | null; flow_heading: string; steps: (TextCard & { icon: 'upload' | 'edit' | 'report' | 'save' })[] };
    trends: Section & Heading & Action & Photo;
    events: Section & Heading & { view_label: string; create_label: string; card_button: string; limit: number; empty_message: string };
    join: Section & Heading & Action;
};
