import type { PmpPublicSection } from '@/types/pmp-public';

/** Shared order and labels for the public PMP page editor and admin navigation. */
export const pmpPublicSections: readonly { key: PmpPublicSection; title: string }[] = [
    { key: 'hero', title: 'Banner' },
    { key: 'benefits', title: 'Benefit cards' },
    { key: 'sample', title: 'Sample question' },
    { key: 'ai', title: 'AI study help' },
    { key: 'plans', title: 'Plan comparison' },
    { key: 'faq', title: 'FAQ' },
    { key: 'video', title: 'Video stories' },
    { key: 'testimonials', title: 'Testimonials' },
    { key: 'footer', title: 'Footer' },
];
