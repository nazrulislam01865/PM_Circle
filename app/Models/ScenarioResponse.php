<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScenarioResponse extends Model
{
    protected $fillable = [
        'user_id',
        'scenario_id',
        'parent_id',
        'body',
        'is_community_helpful',
        'is_question',
        'ai_score',
        'ai_feedback',
        'likes_count',
        'loves_count',
    ];

    protected function casts(): array
    {
        return [
            'ai_feedback' => 'array',
            'is_community_helpful' => 'boolean',
            'is_question' => 'boolean',
            'ai_score' => 'integer',
            'likes_count' => 'integer',
            'loves_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scenario(): BelongsTo
    {
        return $this->belongsTo(Scenario::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ScenarioResponse::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(ScenarioResponse::class, 'parent_id');
    }
}
