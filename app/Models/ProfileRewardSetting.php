<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProfileRewardSetting extends Model
{
    protected $fillable = ['enabled', 'discount_type', 'discount_value', 'currency', 'validity_days', 'updated_by'];

    protected function casts(): array
    {
        return ['enabled' => 'boolean', 'discount_value' => 'decimal:2', 'validity_days' => 'integer'];
    }
}
