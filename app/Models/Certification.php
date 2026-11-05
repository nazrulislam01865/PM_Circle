<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Certification extends Model
{
    protected $fillable = ['name', 'credential_number', 'valid_until'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
