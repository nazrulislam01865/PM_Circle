<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = ['code', 'name', 'active', 'benefits'];
    protected function casts(): array { return ['benefits' => 'array', 'active' => 'boolean']; }
    public function prices(): HasMany { return $this->hasMany(PlanPrice::class); }
}
