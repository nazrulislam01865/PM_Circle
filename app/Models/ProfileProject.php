<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileProject extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'summary',
        'role',
        'team_size',
        'delivery_months',
        'work_sample_path',
        'is_featured',
        'is_anonymized',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_anonymized' => 'boolean',
        'team_size' => 'integer',
        'delivery_months' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

