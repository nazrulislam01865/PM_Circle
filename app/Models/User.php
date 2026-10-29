<?php

namespace App\Models;

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

    public function profile(): HasOne { return $this->hasOne(Profile::class); }
    public function certifications(): HasMany { return $this->hasMany(Certification::class); }
    public function posts(): HasMany { return $this->hasMany(Post::class, 'author_id'); }
}
