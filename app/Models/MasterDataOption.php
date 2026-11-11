<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class MasterDataOption extends Model
{
    protected $fillable = ['category', 'value', 'label', 'sort_order', 'is_active', 'icon_path'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer', 'is_active' => 'boolean'];
    }
}
