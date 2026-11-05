<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->string('industry', 120)->nullable()->after('headline');
            $table->string('country', 120)->nullable()->after('industry');
            $table->string('city', 120)->nullable()->after('country');
            $table->text('about')->nullable()->after('city');
            $table->json('skills')->nullable()->after('about');
            $table->string('cover_photo_path')->nullable()->after('skills');
            $table->string('avatar_path')->nullable()->after('cover_photo_path');
            $table->boolean('open_to_opportunities')->default(true)->after('avatar_path');
            $table->boolean('resume_employer_visibility')->default(true)->after('open_to_opportunities');
            $table->string('contact_visibility', 20)->default('private')->after('resume_employer_visibility');
        });

        Schema::create('experiences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('job_title', 150);
            $table->string('organization', 150);
            $table->string('employment_type', 50)->default('Full-time');
            $table->string('start_date', 50);
            $table->string('end_date', 50)->nullable();
            $table->boolean('is_current')->default(false);
            $table->text('responsibilities')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'is_current']);
        });

        Schema::create('profile_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 180);
            $table->text('summary')->nullable();
            $table->string('role', 100)->nullable();
            $table->unsignedSmallInteger('team_size')->nullable();
            $table->unsignedSmallInteger('delivery_months')->nullable();
            $table->string('work_sample_path')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_anonymized')->default(true);
            $table->timestamps();
            $table->index(['user_id', 'is_featured']);
        });

        Schema::create('educations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('degree', 180);
            $table->string('institution', 180);
            $table->string('year', 20)->nullable();
            $table->timestamps();
            $table->index(['user_id']);
        });

        Schema::create('profile_resumes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('original_name', 255);
            $table->string('storage_path', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size')->default(0);
            $table->timestamps();
            $table->index(['user_id']);
        });

        Schema::create('profile_import_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('source_filename', 255);
            $table->json('extracted_data');
            $table->string('status', 30)->default('pending');
            $table->timestamps();
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_import_sessions');
        Schema::dropIfExists('profile_resumes');
        Schema::dropIfExists('educations');
        Schema::dropIfExists('profile_projects');
        Schema::dropIfExists('experiences');

        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn([
                'industry',
                'country',
                'city',
                'about',
                'skills',
                'cover_photo_path',
                'avatar_path',
                'open_to_opportunities',
                'resume_employer_visibility',
                'contact_visibility',
            ]);
        });
    }
};

