<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScenarioResponse extends Model
{
    protected $fillable = ['user_id', 'scenario_id', 'body'];
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
