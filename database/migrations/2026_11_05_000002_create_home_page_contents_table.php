<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_page_contents', function (Blueprint $table): void {
            $table->id();
            $table->string('key', 80)->unique();
            $table->jsonb('content');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_page_contents');
    }
};
