<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Scenario extends Model
{
    protected $fillable = ['slug', 'title', 'summary', 'situation', 'known_facts', 'topics', 'difficulty', 'focus', 'minutes', 'status', 'published_at', 'ai_generated'];
    protected function casts(): array { return ['known_facts'=>'array','topics'=>'array','published_at'=>'datetime','ai_generated'=>'boolean']; }
    public function responses(): HasMany { return $this->hasMany(ScenarioResponse::class); }
}
