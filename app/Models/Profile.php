<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    protected $fillable = ['role', 'years_experience', 'headline', 'bio', 'visibility', 'resume_path', 'resume_scan_status'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
