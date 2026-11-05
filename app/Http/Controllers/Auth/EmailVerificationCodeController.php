<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\SignupVerificationCode;
use App\Models\User;
use App\Services\Email\EmailService;
use App\Support\SignupVerificationMode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Log;
use Throwable;

class EmailVerificationCodeController extends Controller
{
    private const CODE_LIFETIME = 900; // 15 minutes

    private const VERIFIED_LIFETIME = 1800; // 30 minutes

    public function sendCode(Request $request, EmailService $emailService): JsonResponse
    {
        $mode = SignupVerificationMode::current();
        abort_if($mode === 'off', 404);

        $data = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email', 'max:255'],
        ])->validate();
        $email = mb_strtolower(trim($data['email']));

        if (User::query()->where('email', $email)->exists()) {
            return response()->json(['message' => 'This email is already registered. Please log in.'], 422);
        }

        // Bound requests for the same address across sessions/IPs (Redis in production).
        $emailLimit = 'signup-email:'.hash('sha256', $email);
        if (RateLimiter::tooManyAttempts($emailLimit, 3)) {
            return response()->json(['message' => 'Too many codes requested. Please try again later.'], 429);
        }

        // A log/array mailer is not delivery. Do not claim to have sent an OTP.
        if ($mode === 'email' && config('transactional-mail.provider') === 'laravel'
            && ! app()->environment('testing') && in_array(config('mail.default'), ['log', 'array'], true)) {
            return response()->json(['message' => 'Email delivery is not configured yet. Please contact support.'], 503);
        }

        $challenge = $request->session()->get('signup_email_challenge');
        if (is_array($challenge) && ($challenge['sent_at'] ?? 0) > time() - 60) {
            return response()->json(['message' => 'Please wait one minute before requesting another code.'], 429);
        }

        $code = $mode === 'fixed' ? SignupVerificationMode::FIXED_CODE : (string) random_int(100000, 999999);
        if ($mode === 'email') {
            try {
                $emailService->send(
                    $email,
                    new SignupVerificationCode($code),
                    view('mail.signup-verification-code-text', ['code' => $code])->render(),
                );
            } catch (Throwable $exception) {
                Log::warning('Signup verification email delivery failed.', ['exception_type' => $exception::class]);
                return response()->json(['message' => 'We could not send the email. Please try again.'], 503);
            }
        }

        RateLimiter::hit($emailLimit, 600);

        $request->session()->forget('signup_verified_email');
        $request->session()->put('signup_email_challenge', [
            'email' => $email,
            'code_hash' => hash_hmac('sha256', $email.':'.$code, config('app.key')),
            'expires_at' => time() + self::CODE_LIFETIME,
            'sent_at' => time(),
            'attempts' => 0,
        ]);

        return response()->json($mode === 'fixed'
            ? ['message' => 'Use the local testing code below.', 'development_code' => $code]
            : ['message' => 'Verification code sent. Check your email.']);
    }

    public function verifyCode(Request $request): JsonResponse
    {
        abort_if(SignupVerificationMode::current() === 'off', 404);

        $data = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email', 'max:255'],
            'code' => ['required', 'string', 'regex:/^[0-9]{6}$/'],
        ])->validate();
        $email = mb_strtolower(trim($data['email']));
        $challenge = $request->session()->get('signup_email_challenge');
        $validChallenge = is_array($challenge)
            && ($challenge['email'] ?? null) === $email
            && ($challenge['expires_at'] ?? 0) >= time()
            && ($challenge['attempts'] ?? 0) < 5;

        if (! $validChallenge) {
            return response()->json(['message' => 'Your code has expired. Please request a new one.'], 422);
        }

        $submittedHash = hash_hmac('sha256', $email.':'.$data['code'], config('app.key'));
        if (! hash_equals($challenge['code_hash'], $submittedHash)) {
            $challenge['attempts']++;
            $request->session()->put('signup_email_challenge', $challenge);
            return response()->json(['message' => 'Incorrect code. Please try again.'], 422);
        }

        $request->session()->forget('signup_email_challenge');
        $request->session()->put('signup_verified_email', [
            'email' => $email,
            'expires_at' => time() + self::VERIFIED_LIFETIME,
        ]);

        return response()->json(['verified' => true, 'message' => 'Email verified successfully.']);
    }
}
