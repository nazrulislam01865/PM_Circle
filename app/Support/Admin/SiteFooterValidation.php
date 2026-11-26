<?php

namespace App\Support\Admin;

use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

final class SiteFooterValidation
{
    public static function rules(string $prefix): array
    {
        $text = ['required', 'string', 'max:180'];
        $optional = ['nullable', 'string', 'max:2000'];
        $route = ['required', 'string', 'max:2048', static function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_string($value) || ! self::safeDestination($value)) {
                $fail('Choose an existing public-page path (optional section anchor) or a valid HTTPS URL.');
            }
        }];
        $socialUrl = ['nullable', 'string', 'max:2048', static function (string $attribute, mixed $value, \Closure $fail): void {
            if ($value !== null && $value !== '' && (! is_string($value) || ! self::https($value))) {
                $fail('Use a valid HTTPS URL or leave blank to hide this social link.');
            }
        }];
        $icon = ['nullable', 'string', 'max:1024', static function (string $attribute, mixed $value, \Closure $fail): void {
            if ($value === null || $value === '') return;
            if (! is_string($value)) { $fail('Choose a valid uploaded image.'); return; }
            $base = Storage::disk('public')->url('homepage/');
            $filename = str_starts_with($value, $base) ? substr($value, strlen($base)) : '';
            if (preg_match('~^[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$~D', $filename) !== 1
                && preg_match('~^/images/exam/public/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$~D', $value) !== 1) {
                $fail('Use an image uploaded through the admin editor.');
            }
        }];
        $rules = [
            $prefix => ['required', 'array:brand_name,brand_tagline,brand_logo,brand_href,show_brand,show_about,show_social,description,columns,socials,show_legal,show_notice,notice_label,legal_notice,show_copyright,copyright_label,bottom_links,show_member_footer,member_links,show_member_notice,member_notice_label'],
            "$prefix.brand_name" => $text, "$prefix.brand_tagline" => ['nullable', 'string', 'max:180'],
            "$prefix.brand_logo" => $icon, "$prefix.brand_href" => $route,
            "$prefix.description" => $optional, "$prefix.notice_label" => ['nullable', 'string', 'max:180'],
            "$prefix.legal_notice" => $optional, "$prefix.copyright_label" => ['nullable', 'string', 'max:180'],
            "$prefix.member_notice_label" => $text,
            "$prefix.columns" => ['present', 'array', 'list', 'max:8'],
            "$prefix.columns.*" => ['required', 'array:title,visible,links'],
            "$prefix.columns.*.title" => $text, "$prefix.columns.*.visible" => ['required', 'boolean'],
            "$prefix.socials" => ['present', 'array', 'list', 'max:16'],
            "$prefix.socials.*" => ['required', 'array:label,href,icon,image'],
            "$prefix.socials.*.label" => $text, "$prefix.socials.*.href" => $socialUrl,
            "$prefix.socials.*.icon" => ['required', Rule::in(SiteFooterContent::SOCIAL_ICONS)],
            "$prefix.socials.*.image" => $icon,
        ];
        foreach (['show_brand', 'show_about', 'show_social', 'show_legal', 'show_notice', 'show_copyright', 'show_member_footer', 'show_member_notice'] as $flag) {
            $rules["$prefix.$flag"] = ['required', 'boolean'];
        }
        foreach (['columns.*.links', 'bottom_links', 'member_links'] as $list) {
            $rules["$prefix.$list"] = ['present', 'array', 'list', 'max:16'];
            $rules["$prefix.$list.*"] = ['required', 'array:label,href'];
            $rules["$prefix.$list.*.label"] = $text;
            $rules["$prefix.$list.*.href"] = $route;
        }
        return $rules;
    }

    private static function https(string $value): bool
    {
        if (! str_starts_with($value, 'https://') || preg_match('/[\\x00-\\x20\\x7f\\\\\\\\]/', $value) || ! filter_var($value, FILTER_VALIDATE_URL)) return false;
        $parts = parse_url($value);
        return is_array($parts) && ! empty($parts['host']) && ! isset($parts['user']) && ! isset($parts['pass']);
    }

    public static function safeDestination(string $value): bool
    {
        if (self::https($value)) return true;
        if (preg_match('~^(/[a-z0-9/-]{0,158})(?:#[A-Za-z0-9_-]{1,100})?$~D', $value, $matches) !== 1) return false;
        $path = rtrim($matches[1], '/') ?: '/';
        if ($path === '/careers' || str_starts_with($path, '/careers/')) return false;
        return HomepageMasterData::isAllowedNewValue('footer_menu', $matches[1]);
    }
}
