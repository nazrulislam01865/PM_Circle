<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('follower_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('followed_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['follower_id', 'followed_id']);
            $table->index(['followed_id', 'created_at']);
        });
        // Both IDs reference the same table; prevent a user following themselves at the database layer.
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            Schema::getConnection()->statement('ALTER TABLE member_follows ADD CONSTRAINT member_follows_distinct CHECK (follower_id <> followed_id)');
        }
    }

    public function down(): void { Schema::dropIfExists('member_follows'); }
};
