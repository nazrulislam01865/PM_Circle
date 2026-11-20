<?php

namespace App\Support\Admin;

use Illuminate\Support\Facades\Storage;

/** Shared validation for the single footer record, regardless of admin entry point. */
final class SiteFooterValidation
{
    public static function rules(string $prefix): array
    {
        $text = ['required', 'string', 'max:180'];
        $body = ['required', 'string', 'max:2000'];
        $route = ['required', 'string', 'max:160', static function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_string($value) || ! HomepageMasterData::isAllowedNewValue('footer_menu', $value)) {
                $fail('Choose a valid public-page destination.');
            }
        }];
        $socialUrl = ['nullable', 'string', 'url:http,https', 'max:2048', static function (string $attribute, mixed $value, \Closure $fail): void {
            if ($value !== null && $value !== '' && (! is_string($value) || ! str_starts_with($value, 'https://'))) {
                $fail('Use an HTTPS URL or leave this blank to hide the icon.');
            }
        }];
        $icon = ['nullable', 'string', 'max:1024', static function (string $attribute, mixed $value, \Closure $fail): void {
            if ($value === null || $value === '') return;
            if (! is_string($value)) { $fail('Choose a valid uploaded image.'); return; }
            $prefix = Storage::disk('public')->url('homepage/');
            $filename = str_starts_with($value, $prefix) ? substr($value, strlen($prefix)) : '';
            if (preg_match('~^[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$~D', $filename) !== 1
                && preg_match('~^/images/exam/public/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$~D', $value) !== 1) {
                $fail('Use an image uploaded through the admin editor.');
            }
        }];

        return [
            $prefix => ['required', 'array:brand_name,brand_tagline,brand_logo,show_brand,show_about,show_explore,show_support,show_social,show_newsletter,show_newsletter_form,show_payments,show_legal,description,explore_heading,support_heading,newsletter_heading,newsletter_placeholder,newsletter_button,payment_usd,payment_bdt,explore_links,support_links,social,social_icons,legal_notice,disclaimer,about_heading,newsletter_description,newsletter_compact_description,payment_heading,payment_methods,copyright_label,legal_links,show_trends,show_membership,show_disclaimer'],
            "$prefix.brand_name" => $text,
            "$prefix.brand_tagline" => ['nullable', 'string', 'max:180'],
            "$prefix.brand_logo" => $icon,
            "$prefix.show_brand" => ['sometimes', 'boolean'],
            "$prefix.show_about" => ['sometimes', 'boolean'],
            "$prefix.show_explore" => ['sometimes', 'boolean'],
            "$prefix.show_support" => ['sometimes', 'boolean'],
            "$prefix.show_social" => ['sometimes', 'boolean'],
            "$prefix.show_newsletter" => ['sometimes', 'boolean'],
            "$prefix.show_newsletter_form" => ['sometimes', 'boolean'],
            "$prefix.show_payments" => ['sometimes', 'boolean'],
            "$prefix.show_legal" => ['sometimes', 'boolean'],
            "$prefix.description" => $body,
            "$prefix.about_heading" => $text,
            "$prefix.explore_heading" => $text,
            "$prefix.support_heading" => $text,
            "$prefix.newsletter_heading" => $text,
            "$prefix.newsletter_description" => $body,
            "$prefix.newsletter_compact_description" => $body,
            "$prefix.newsletter_placeholder" => $text,
            "$prefix.newsletter_button" => $text,
            // Retained for previously saved PMP public-page records.
            "$prefix.payment_usd" => $text,
            "$prefix.payment_bdt" => $text,
            "$prefix.payment_heading" => $text,
            "$prefix.payment_methods" => ['required', 'array', 'max:8'],
            "$prefix.payment_methods.*" => ['required', 'array:label,image'],
            "$prefix.payment_methods.*.image" => $icon,
            "$prefix.payment_methods.*.label" => $text,
            "$prefix.explore_links" => ['required', 'array', 'max:8'],
            "$prefix.support_links" => ['required', 'array', 'max:8'],
            "$prefix.explore_links.*" => ['required', 'array:label,href'],
            "$prefix.support_links.*" => ['required', 'array:label,href'],
            "$prefix.explore_links.*.label" => $text,
            "$prefix.support_links.*.label" => $text,
            "$prefix.explore_links.*.href" => $route,
            "$prefix.support_links.*.href" => $route,
            "$prefix.show_trends" => ['required', 'boolean'],
            "$prefix.show_membership" => ['required', 'boolean'],
            "$prefix.social" => ['required', 'array:linkedin,facebook,instagram,youtube'],
            "$prefix.social.*" => $socialUrl,
            "$prefix.social_icons" => ['required', 'array:linkedin,facebook,instagram,youtube'],
            "$prefix.social_icons.*" => $icon,
            "$prefix.copyright_label" => $text,
            "$prefix.legal_links" => ['required', 'array', 'max:6'],
            "$prefix.legal_links.*" => ['required', 'array:label,href'],
            "$prefix.legal_links.*.label" => $text,
            "$prefix.legal_links.*.href" => $route,
            "$prefix.legal_notice" => $body,
            "$prefix.disclaimer" => $body,
            "$prefix.show_disclaimer" => ['required', 'boolean'],
        ];
    }
}
