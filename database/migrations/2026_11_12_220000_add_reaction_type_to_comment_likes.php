<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Retain every existing comment like as a Like reaction.
        Schema::table('comment_likes', function (Blueprint $table): void {
            $table->string('type', 12)->default('like');
        });
    }

    public function down(): void
    {
        Schema::table('comment_likes', function (Blueprint $table): void {
            $table->dropColumn('type');
        });
    }
};
