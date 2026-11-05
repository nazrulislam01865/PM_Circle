<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class HomePageContent extends Model
{
    protected $fillable = ['key', 'content'];

    protected function casts(): array
    {
        return ['content' => 'array'];
    }
}
