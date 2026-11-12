<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class PostPollVote extends Model
{
    public $timestamps = false;
    protected $table = 'post_poll_votes';
}
