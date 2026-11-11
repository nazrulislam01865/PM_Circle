<?php

namespace App\Models;

use App\Mail\PasswordResetLink;
use App\Services\Email\EmailService;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

#[Fillable(['name', 'email', 'password', 'onboarding_step', 'accepted_terms_version', 'accepted_privacy_version', 'legal_accepted_at'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'accepted_terms_version', 'accepted_privacy_version'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'legal_accepted_at' => 'datetime',
            'onboarding_step' => 'integer',
            'is_admin' => 'boolean',
        ];
    }

    /** When verification is temporarily optional, no ownership claim is made. */
    public function hasVerifiedEmail(): bool
    {
        return ! config('pm-circle.email_verification_required') || $this->email_verified_at !== null;
    }

    public function sendEmailVerificationNotification(): void
    {
        if (config('pm-circle.email_verification_required')) {
            parent::sendEmailVerificationNotification();
        }
    }

    /** Send a one-time reset link through the same transactional provider as signup. */
    public function sendPasswordResetNotification($token): void
    {
        $email = $this->getEmailForPasswordReset();
        // Use the configured application origin, not an untrusted request Host header.
        $url = rtrim((string) config('app.url'), '/').route('password.reset', [
            'token' => $token, 'email' => $email,
        ], false);
        $broker = config('auth.defaults.passwords', 'users');
        $minutes = (int) config('auth.passwords.'.$broker.'.expire', 60);

        try {
            // Logging an email is not delivering it; do not claim success.
            if (! app()->environment('testing') && config('transactional-mail.provider') === 'laravel'
                && in_array(config('mail.default'), ['log', 'array'], true)) {
                throw new RuntimeException('Password reset email delivery is not configured.');
            }

            app(EmailService::class)->send(
                $email,
                new PasswordResetLink($url, $minutes),
                view('mail.password-reset-link-text', ['resetUrl' => $url, 'expiresInMinutes' => $minutes])->render(),
            );
        } catch (Throwable $exception) {
            // Never include reset URLs, tokens, or email addresses in logs.
            Log::warning('Password reset email delivery failed.', ['exception_type' => $exception::class]);

            throw ValidationException::withMessages([
                'email' => 'We could not send the reset link right now. Please try again later.',
            ]);
        }
    }

    public function profile(): HasOne { return $this->hasOne(Profile::class); }
    public function certifications(): HasMany { return $this->hasMany(Certification::class); }
    public function posts(): HasMany { return $this->hasMany(Post::class, 'author_id'); }
    public function experiences(): HasMany { return $this->hasMany(Experience::class)->orderByDesc('is_current')->orderByDesc('start_date'); }
    public function profileProjects(): HasMany { return $this->hasMany(ProfileProject::class); }
    public function educations(): HasMany { return $this->hasMany(Education::class); }
    public function resumes(): HasMany { return $this->hasMany(ProfileResume::class)->latest()->latest('id'); }
    public function importSessions(): HasMany { return $this->hasMany(ProfileImportSession::class)->latest()->latest('id'); }
}
