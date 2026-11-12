<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class PostPollOption extends Model
{
    public $timestamps = false;
    protected $fillable = ['post_id', 'label', 'position'];

    public function votes(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PostPollVote::class, 'option_id');
    }
}
