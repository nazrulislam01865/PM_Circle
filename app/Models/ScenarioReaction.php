<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScenarioReaction extends Model
{
    protected $fillable = ['scenario_id', 'user_id', 'type'];
}
