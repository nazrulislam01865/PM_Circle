<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileCompletionReward extends Model
{
    protected $fillable = ['user_id', 'code', 'discount_type', 'discount_value', 'currency', 'validity_days', 'expires_at', 'redeemed_at', 'redemption_reference'];

    protected function casts(): array
    {
        return ['discount_value' => 'decimal:2', 'validity_days' => 'integer', 'expires_at' => 'immutable_datetime', 'redeemed_at' => 'immutable_datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
