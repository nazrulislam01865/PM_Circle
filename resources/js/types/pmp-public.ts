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
    footer: SiteFooterContent;
};

export type FooterLink = { label: string; href: string };
export type FooterColumn = { title: string; visible: boolean; links: FooterLink[] };
export type FooterSocialLink = { label: string; href: string | null; icon: string; image: string | null };
export type SiteFooterContent = {
    brand_name: string; brand_tagline: string | null; brand_logo: string | null; brand_href: string;
    show_brand: boolean; show_about: boolean; show_social: boolean; description: string | null;
    columns: FooterColumn[]; socials: FooterSocialLink[];
    show_legal: boolean; show_notice: boolean; notice_label: string | null; legal_notice: string | null;
    show_copyright: boolean; copyright_label: string | null; bottom_links: FooterLink[];
    show_member_footer: boolean; member_links: FooterLink[]; show_member_notice: boolean; member_notice_label: string;
};
