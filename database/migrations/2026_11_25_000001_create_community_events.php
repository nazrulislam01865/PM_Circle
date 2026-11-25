<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('community_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('creator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('publisher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('slug', 160)->unique();
            $table->string('title', 120);
            $table->string('description', 500);
            $table->text('about')->nullable();
            $table->string('category', 80);
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->string('format', 16);
            $table->string('location', 120)->nullable();
            $table->string('venue', 160)->nullable();
            $table->string('address', 255)->nullable();
            $table->string('host', 120);
            $table->string('host_type', 80)->nullable();
            $table->string('cover_path')->nullable();
            $table->string('map_path')->nullable();
            $table->json('agenda')->nullable();
            $table->json('speakers')->nullable();
            $table->boolean('open_to_everyone')->default(false);
            $table->boolean('sponsored')->default(false);
            $table->boolean('registration_open')->default(true);
            $table->boolean('discussion_open')->default(true);
            $table->string('status', 16)->default('pending');
            $table->timestamps();
            $table->index(['status', 'starts_at', 'id']);
            $table->index(['status', 'category', 'starts_at']);
            $table->index(['creator_id', 'id']);
        });
        Schema::create('community_event_registrations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('event_id')->constrained('community_events')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name', 120);
            $table->string('email', 254);
            $table->string('phone', 20);
            $table->string('role', 120)->nullable();
            $table->timestamps();
            $table->unique(['event_id', 'email']);
            $table->unique(['event_id', 'user_id']);
        });
        Schema::create('community_event_comments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('event_id')->constrained('community_events')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name', 80);
            $table->text('message');
            $table->string('status', 16)->default('pending');
            $table->timestamps();
            $table->index(['event_id', 'status', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_event_comments');
        Schema::dropIfExists('community_event_registrations');
        Schema::dropIfExists('community_events');
    }
};
