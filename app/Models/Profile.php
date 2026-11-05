<?php

namespace App\Models;

use App\Support\ProfileMediaUrl;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    protected $fillable = [
        'role',
        'phone',
        'years_experience',
        'headline',
        'industry',
        'country',
        'city',
        'bio',
        'about',
        'skills',
        'visibility',
        'resume_path',
        'resume_scan_status',
        'cover_photo_path',
        'avatar_path',
        'open_to_opportunities',
        'resume_employer_visibility',
        'contact_visibility',
        'linkedin_url',
        'languages',
    ];

    protected $casts = [
        'skills' => 'array',
        'languages' => 'array',
        'open_to_opportunities' => 'boolean',
        'resume_employer_visibility' => 'boolean',
    ];

    /** The database retains the original storage path; all API/Inertia consumers get a working URL. */
    protected function avatarPath(): Attribute
    {
        return Attribute::get(fn (?string $value): ?string => ProfileMediaUrl::for($value, 'avatar'));
    }

    protected function coverPhotoPath(): Attribute
    {
        return Attribute::get(fn (?string $value): ?string => ProfileMediaUrl::for($value, 'cover'));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
