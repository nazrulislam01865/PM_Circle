<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scenario_response_reactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('scenario_response_id')->constrained('scenario_responses')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 12);
            $table->timestamps();
            $table->unique(['scenario_response_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scenario_response_reactions');
    }
};
