<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningQuestion extends Model
{
    protected $fillable = ['learning_activity_id', 'position', 'prompt', 'choices', 'answer_key', 'explanation'];
    protected function casts(): array { return ['choices' => 'array']; }
    public function activity(): BelongsTo { return $this->belongsTo(LearningActivity::class, 'learning_activity_id'); }
}
