<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class PostEngagementStats extends Model
{
    protected $table = 'post_engagement_stats';

    protected $primaryKey = 'post_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $guarded = [];
}
