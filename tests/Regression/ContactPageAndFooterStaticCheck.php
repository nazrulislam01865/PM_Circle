<?php

// Dependency-free source regression for the new contact page and shared footer.
$root = dirname(__DIR__, 2);
$read = static fn (string $path): string => file_get_contents($root.'/'.$path) ?: '';
$assert = static function (bool $condition, string $description): void {
    if (! $condition) {
        fwrite(STDERR, "FAIL: {$description}\n");
        exit(1);
    }
    echo "PASS: {$description}\n";
};

$routes = $read('routes/web.php');
$controller = $read('app/Http/Controllers/PublicSite/ContactController.php');
$layout = $read('resources/js/layouts/pm/PublicLayout.tsx');
$footer = $read('resources/js/components/exam/PmpPublicFooter.tsx');
$header = $read('resources/js/components/dashboard/MemberHomeHeader.tsx');
$contact = $read('resources/js/pages/public/Support.tsx');

$assert(str_contains($routes, "Route::post('/contact'") && str_contains($routes, "'throttle:5,10'"), 'Contact submission has a throttled endpoint');
$assert(str_contains($routes, "->middleware(['signed', 'throttle:10,1'])"), 'Contact confirmation is temporary signed and throttled');
$assert(str_contains($controller, "'recaptcha_token' => ['required', 'string', 'max:2048']") && str_contains($controller, "'website' => ['nullable', 'size:0']"), 'Server reCAPTCHA validation and honeypot present');
$assert(str_contains($controller, 'GoogleRecaptchaVerifier') && str_contains($read('app/Services/Security/GoogleRecaptchaVerifier.php'), '/recaptcha/api/siteverify'), 'Google reCAPTCHA tokens are checked server-side');
$assert(str_contains($controller, 'Cache::put(') && str_contains($controller, 'Cache::lock('), 'Pending submissions expire and confirmation is guarded');
$assert(str_contains($controller, 'ContactConfirmationLink') && str_contains($controller, 'ContactSupportMessage'), 'Email verification precedes forwarding');
$assert(str_contains($layout, 'footerVariant') && str_contains($footer, "variant === 'contact'"), 'One reusable footer supports marketing and contact styles');
$assert(str_contains($footer, 'pm-unified-footer-dark') && str_contains($footer, 'pm-unified-footer-compact'), 'Both footer prototypes use the same component');
$assert(str_contains($contact, '<ContactForm ') && str_contains($contact, '<ContactChat '), 'Contact UI uses reusable modular components');
$assert(str_contains($header, 'href="/contact"') && str_contains($header, 'href="/help-center"'), 'Header support links are no longer disabled');
$assert(! str_contains($read('resources/js/components/contact/ContactChat.tsx'), 'Online</span>'), 'No fake online-agent status');

$css = $read('resources/css/pm-contact.css');
$tokens = $read('resources/css/pm-design-tokens.css');
$form = $read('resources/js/components/contact/ContactForm.tsx');
$assert(! str_contains($footer, 'Find your next step in project management.'), 'Promotional footer banner removed from every shared-footer location');
$assert(str_contains($contact, 'className="pm-container pm-page pm-contact-container"') && str_contains($read('resources/css/pm-circle.css'), '.pm-container { width: min(1170px, calc(100% - 48px))') && ! str_contains($css, 'pm-contact-content-width') && ! str_contains($tokens, 'pm-contact-content-width'), 'Contact uses the shared PM Trends/Home page width and spacing without a separate wide override');
$assert(str_contains($footer, 'pm-container pm-unified-footer-container') && str_contains($css, '.pm-unified-footer-container { margin-inline:auto; }'), 'Shared footer aligns with the exact page container instead of using a separate width');
$assert(! str_contains($contact, 'footerVariant="contact"') && substr_count($contact, '<PublicLayout siteLayout') === 2, 'Contact and Help Centre use the same standard footer as other public pages');
$assert(str_contains($form, 'disabled={form.processing}') && str_contains($form, 'if (!available || !recaptchaSiteKey)'), 'Contact submit keeps the prototype button appearance and safely refuses unconfigured delivery');

$assert(str_contains($form, '<GoogleRecaptchaCheckbox') && ! str_contains($form, 'pm-contact-human-check'), 'Google reCAPTCHA replaces the fake human checkbox');
$assert(str_contains($read('config/contact.php'), "env('E2A_SENDER_EMAIL')") && str_contains($controller, 'EmailService $emailService'), 'Contact form reuses existing transactional email service with recipient fallback');
