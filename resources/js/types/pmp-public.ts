export type PmpIcon = 'clipboard-check' | 'calendar-days' | 'users-round' | 'book-open' | 'bot' | 'file-search' | 'sparkles';
export type PmpFeature = { title: string; description: string; icon: PmpIcon; icon_image: string };
export type PmpPlanCell = string | boolean;
export type PmpPlanRow = { label: string; type: 'text' | 'checkbox'; values: PmpPlanCell[] };
export type PmpPublicSection = 'hero' | 'benefits' | 'sample' | 'ai' | 'plans' | 'faq' | 'video' | 'testimonials' | 'footer';
export type PmpPublicContent = {
    sections: Record<PmpPublicSection, boolean>;
    hero: { title: string; description: string; image: string; primary_label: string; secondary_label: string };
    benefits: { heading: string; cards: PmpFeature[] };
    sample: { heading: string; description: string; icon_image: string; question_id: number | null };
    ai: { heading: string; description: string; icon_image: string; cards: PmpFeature[] };
    plans: {
        heading: string; description: string; icon_image: string; first_column: string;
        columns: { title: string; subtitle: string; action: string }[];
        rows: PmpPlanRow[]; price_note: string; checkout_note: string;
    };
    faq: { heading: string; items: { question: string; answer: string }[] };
    video: { heading: string; video_url: string; feedback_heading: string; points: PmpFeature[] };
    testimonials: { heading: string; items: { name: string; role: string; quote: string; image: string }[] };
    footer: {
        description: string; explore_heading: string; support_heading: string; newsletter_heading: string; newsletter_placeholder: string; newsletter_button: string; payment_usd: string; payment_bdt: string;
        explore_links: { label: string; href: string }[]; support_links: { label: string; href: string }[];
        social: Record<'linkedin' | 'facebook' | 'instagram' | 'youtube', string>;
        social_icons: Record<'linkedin' | 'facebook' | 'instagram' | 'youtube', string>;
        legal_notice: string; disclaimer: string;
    };
};
