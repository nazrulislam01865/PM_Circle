<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('learning_demo_course_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('course_slug', 100);
            $table->timestamps();
            $table->unique(['user_id', 'course_slug']);
        });
        Schema::create('learning_demo_course_saves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('course_slug', 100);
            $table->timestamps();
            $table->unique(['user_id', 'course_slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_demo_course_saves');
        Schema::dropIfExists('learning_demo_course_enrollments');
    }
};
