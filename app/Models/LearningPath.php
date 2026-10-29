<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LearningPath extends Model
{
    protected $fillable = ['slug', 'level', 'title', 'summary', 'introduction', 'objectives', 'position', 'access_tier', 'is_published'];
    protected function casts(): array { return ['objectives' => 'array', 'is_published' => 'boolean']; }
    public function modules(): HasMany { return $this->hasMany(LearningModule::class)->orderBy('position'); }
}
