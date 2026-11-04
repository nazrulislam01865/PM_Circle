<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    protected $fillable = [
        'role',
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
    ];

    protected $casts = [
        'skills' => 'array',
        'open_to_opportunities' => 'boolean',
        'resume_employer_visibility' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
