<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LearningModule extends Model
{
    protected $fillable = ['learning_path_id', 'position', 'title', 'summary', 'minutes'];
    public function path(): BelongsTo { return $this->belongsTo(LearningPath::class, 'learning_path_id'); }
    public function activities(): HasMany { return $this->hasMany(LearningActivity::class)->orderBy('position'); }
}
