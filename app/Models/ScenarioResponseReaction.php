<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScenarioResponseReaction extends Model
{
    protected $fillable = ['scenario_response_id', 'user_id', 'type'];
}
