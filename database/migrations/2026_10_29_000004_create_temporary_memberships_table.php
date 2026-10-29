<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Deliberately separate from paid subscriptions: no payment is simulated or fabricated.
        Schema::create('temporary_memberships', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('plan_code', 16);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('temporary_memberships');
    }
};
