<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LearningActivity extends Model
{
    protected $fillable = ['learning_module_id', 'position', 'type', 'title', 'content', 'payload', 'minutes'];
    protected function casts(): array { return ['payload' => 'array']; }
    public function module(): BelongsTo { return $this->belongsTo(LearningModule::class, 'learning_module_id'); }
    public function questions(): HasMany { return $this->hasMany(LearningQuestion::class)->orderBy('position'); }
}
