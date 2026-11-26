<?php

namespace App\Support\Admin;

/** The single presentation schema for the public and compact member footers. */
final class SiteFooterContent
{
    public const KEY = 'footer_v2';

    public const SOCIAL_ICONS = ['facebook', 'instagram', 'youtube', 'linkedin', 'globe', 'mail', 'link', 'message-circle', 'github', 'twitter'];

    public static function fromLegacy(array $legacy): array
    {
        $link = static fn (string $label, string $href): array => compact('label', 'href');
        $explore = $legacy['show_explore'] !== false;
        $support = $legacy['show_support'] !== false;
        $legal = $legacy['show_legal'] !== false;
        $columns = [
            ['title' => 'Company', 'visible' => true, 'links' => [
                ...($explore ? [$link('About Us', '/about'), $link('Testimonials', '/exam-simulator/pmp/details#learner-testimonials'), ...($legacy['show_trends'] !== false ? [$link('Trends', '/pm-trends')] : [])] : []),
                ...($support ? [$link('Help Centre', '/help-center')] : []),
            ]],
            ['title' => 'Learning', 'visible' => true, 'links' => $explore ? [$link('Exam Simulator', '/exam-simulator/pmp'), $link('Courses', '/learning'), $link('AI Tools', '/#pm-v2-ai')] : []],
            ['title' => 'Community', 'visible' => true, 'links' => $explore ? [$link('Community Feed', '/community'), $link('Daily Challenge', '/daily-challenge'), $link('Events', '/events'), $link('Community Guidelines', '/terms#community')] : []],
            ['title' => 'Plans & Policies', 'visible' => true, 'links' => [
                ...($legacy['show_membership'] !== false ? [$link('Compare Plans', '/pricing'), $link('How to Purchase', '/pricing')] : []),
                ...($legal ? [$link('Privacy Policy', '/privacy'), $link('Terms and Conditions', '/terms'), $link('Refund Policy', '/refund-policy')] : []),
            ]],
        ];
        // Preserve the currently rendered prototype and existing working visibility settings.
        // Old unused settings stay in the original footer record for rollback/review.
        $socials = [];
        foreach (['facebook' => 'Facebook', 'instagram' => 'Instagram', 'youtube' => 'YouTube', 'linkedin' => 'LinkedIn'] as $icon => $label) {
            $socials[] = ['label' => $label, 'href' => $legacy['social'][$icon] ?? '', 'icon' => $icon, 'image' => $legacy['social_icons'][$icon] ?? ''];
        }

        return [
            'brand_name' => $legacy['brand_name'], 'brand_tagline' => $legacy['brand_tagline'] ?? '', 'brand_logo' => $legacy['brand_logo'] ?? '', 'brand_href' => '/',
            'show_brand' => $legacy['show_brand'], 'show_about' => $legacy['show_about'], 'show_social' => $legacy['show_social'],
            'description' => 'Learn project management, practise for certification, and connect with peers.',
            'columns' => array_values(array_filter($columns, static fn (array $column): bool => $column['links'] !== [])),
            'socials' => $socials,
            'show_legal' => $legal, 'show_notice' => true, 'notice_label' => 'Trademark notice.',
            'legal_notice' => 'PMP®, CAPM®, PMI-ACP® and PMI-PBA® are marks of Project Management Institute, Inc. Certified ScrumMaster® (CSM) is a certification of Scrum Alliance, Inc. Certification names identify the exams covered by our independent practice materials. PM Circle provides community learning and exam preparation and is not affiliated with, sponsored by, or endorsed by PMI or Scrum Alliance.',
            'show_copyright' => true, 'copyright_label' => '© PM Circle by ITQAN', 'bottom_links' => [],
            'show_member_footer' => true, 'member_links' => [$link('Terms', '/terms'), $link('Privacy', '/privacy'), $link('Refund Policy', '/refund-policy')],
            'show_member_notice' => true, 'member_notice_label' => 'Trademark Notice',
        ];
    }
}
