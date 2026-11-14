<?php

namespace App\Http\Controllers\PublicSite;

use App\Http\Controllers\Controller;
use App\Mail\ContactConfirmationLink;
use App\Mail\ContactSupportMessage;
use App\Services\Email\EmailService;
use App\Services\Security\GoogleRecaptchaVerifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

final class ContactController extends Controller
{
    private const TOPICS = ['Account', 'Exam simulator', 'Billing', 'Feedback', 'Complaints', 'Other'];

    public function index(Request $request): Response
    {
        $email = config('contact.support_email');
        $configured = is_string($email) && (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
        $recaptchaSiteKey = config('contact.recaptcha.site_key');
        $recaptchaSecretKey = config('contact.recaptcha.secret_key');
        $captchaReady = is_string($recaptchaSiteKey) && trim($recaptchaSiteKey) !== ''
            && is_string($recaptchaSecretKey) && trim($recaptchaSecretKey) !== '';
        $mailReady = $this->mailDeliveryConfigured();

        return Inertia::render('public/Support', [
            'mode' => 'contact',
            'topics' => self::TOPICS,
            'supportEmail' => $configured ? $email : null,
            'contactAvailable' => $configured && $captchaReady && $mailReady,
            'recaptchaSiteKey' => $captchaReady ? $recaptchaSiteKey : null,
            'contactStatus' => $request->session()->get('contact_status'),
            'chatHours' => config('contact.hours_label'),
        ]);
    }

    public function submit(Request $request, EmailService $emailService, GoogleRecaptchaVerifier $recaptcha): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:254'],
            'topic' => ['required', 'in:'.implode(',', self::TOPICS)],
            'subject' => ['required', 'string', 'min:3', 'max:180'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            'recaptcha_token' => ['required', 'string', 'max:2048'],
            'website' => ['nullable', 'size:0'], // Hidden honeypot. Not a substitute for CAPTCHA.
        ]);

        $supportEmail = config('contact.support_email');
        if (! is_string($supportEmail) || ! filter_var($supportEmail, FILTER_VALIDATE_EMAIL)) {
            return back()->withErrors(['message' => 'Contact email delivery has not been configured. Please try again later.']);
        }

        if (! $this->mailDeliveryConfigured()) {
            return back()->withErrors(['message' => 'Email delivery is currently unavailable. Please try again later.']);
        }

        if (! $this->recaptchaConfigured()) {
            return back()->withErrors(['recaptcha_token' => 'Google reCAPTCHA is not configured. Please try again later.']);
        }

        $address = mb_strtolower(trim($data['email']));
        $key = 'contact:email-rate:'.hash('sha256', $address);
        if (RateLimiter::tooManyAttempts($key, 3)) {
            return back()->withErrors(['email' => 'Too many contact requests. Please try again later.']);
        }

        try {
            $humanVerified = $recaptcha->verify($data['recaptcha_token'], $request->getHost(), $request->ip());
        } catch (Throwable $exception) {
            Log::warning('Contact reCAPTCHA verification unavailable.', ['exception_type' => $exception::class]);

            return back()->withErrors(['recaptcha_token' => 'Verification is temporarily unavailable. Please try again.']);
        }

        if (! $humanVerified) {
            return back()->withErrors(['recaptcha_token' => 'Google reCAPTCHA verification failed or expired. Please complete it again.']);
        }

        $token = Str::random(64);
        $cacheKey = self::pendingKey($token);
        $minutes = (int) config('contact.verification_minutes', 10);
        // Do not persist personal contact messages in URLs or session cookies.
        Cache::put($cacheKey, [
            'name' => $data['name'],
            'email' => $address,
            'topic' => $data['topic'],
            'subject' => $data['subject'],
            'message' => $data['message'],
        ], now()->addMinutes($minutes));

        try {
            $url = URL::temporarySignedRoute('contact.confirm', now()->addMinutes($minutes), ['token' => $token]);
            $emailService->send($address, new ContactConfirmationLink($url, $minutes));
        } catch (Throwable $exception) {
            Cache::forget($cacheKey);
            Log::warning('Contact confirmation email failed.', ['exception_type' => $exception::class]);

            return back()->withErrors(['email' => 'We could not send your verification email. Please try again.']);
        }

        RateLimiter::hit($key, 600);

        return redirect()->route('contact')->with('contact_status', 'Check your email for a verification link. Your message will be sent only after you confirm it.');
    }

    public function confirm(string $token, EmailService $emailService): RedirectResponse
    {
        $key = self::pendingKey($token);
        $lock = Cache::lock('contact:confirm:'.hash('sha256', $token), 15);

        if (! $lock->get()) {
            return redirect()->route('contact')->with('contact_status', 'This verification is already being processed.');
        }

        try {
            $pending = Cache::get($key);
            if (! is_array($pending)) {
                return redirect()->route('contact')->withErrors(['email' => 'This verification link has expired or was already used. Please send a new message.']);
            }

            $recipient = config('contact.support_email');
            if (! is_string($recipient) || ! filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
                return redirect()->route('contact')->withErrors(['message' => 'Support email delivery is currently unavailable.']);
            }

            $emailService->send($recipient, new ContactSupportMessage($pending));
            Cache::forget($key);

            return redirect()->route('contact')->with('contact_status', 'Your email was verified and your message was sent to PM Circle support.');
        } catch (Throwable $exception) {
            Log::warning('Verified contact delivery failed.', ['exception_type' => $exception::class]);

            return redirect()->route('contact')->withErrors(['message' => 'Your message could not be delivered. Please try the verification link again before it expires.']);
        } finally {
            $lock->release();
        }
    }

    private function recaptchaConfigured(): bool
    {
        foreach (['site_key', 'secret_key'] as $key) {
            $value = config('contact.recaptcha.'.$key);
            if (! is_string($value) || trim($value) === '') {
                return false;
            }
        }

        return true;
    }

    private function mailDeliveryConfigured(): bool
    {
        if (app()->environment('testing')) {
            return true;
        }

        if (config('transactional-mail.provider') === 'e2a') {
            $key = config('transactional-mail.e2a.api_key');
            $sender = config('transactional-mail.e2a.sender');

            return is_string($key) && trim($key) !== ''
                && is_string($sender) && (bool) filter_var($sender, FILTER_VALIDATE_EMAIL);
        }

        return config('transactional-mail.provider') === 'laravel'
            && ! in_array(config('mail.default'), ['log', 'array'], true);
    }

    private static function pendingKey(string $token): string
    {
        return 'contact:pending:'.hash('sha256', $token);
    }
}
