<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = ['code', 'name', 'active', 'benefits', 'signup_visible', 'signup_badge'];
    protected function casts(): array { return ['benefits' => 'array', 'active' => 'boolean', 'signup_visible' => 'boolean']; }
    public function prices(): HasMany { return $this->hasMany(PlanPrice::class); }
}
