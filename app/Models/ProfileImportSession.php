<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileImportSession extends Model
{
    protected $fillable = [
        'user_id',
        'source_filename',
        'extracted_data',
        'status',
    ];

    protected $casts = [
        'extracted_data' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

