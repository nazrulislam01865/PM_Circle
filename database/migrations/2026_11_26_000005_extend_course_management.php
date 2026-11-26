<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('learning_courses', function (Blueprint $table): void {
            $table->json('presentation')->nullable();
        });
        Schema::table('learning_course_resources', function (Blueprint $table): void {
            $table->uuid('lesson_uid')->nullable();
            $table->index(['course_id', 'is_published', 'lesson_uid'], 'learning_resource_lesson_idx');
        });
        Schema::create('learning_course_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained('learning_courses');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('body');
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->unique(['course_id', 'user_id']);
            $table->index(['course_id', 'is_published']);
        });
        // Preserve the legacy outline and all original lesson bodies. IDs are independent of progress hashes.
        DB::table('learning_courses')->select('id', 'lessons', 'outline')->chunkById(100, function ($courses): void {
            foreach ($courses as $course) {
                $lessons = json_decode($course->lessons, true, 512, JSON_THROW_ON_ERROR);
                $outline = json_decode($course->outline, true, 512, JSON_THROW_ON_ERROR);
                foreach ($lessons as &$lesson) {
                    $lesson['uid'] ??= (string) Str::uuid();
                    $matches = [];
                    foreach ($outline as $section) {
                        if (in_array($lesson['title'], $section['topics'] ?? [], true)) {
                            $matches[] = $section['title'];
                        }
                    }
                    if (count($matches) === 1) {
                        $lesson['section_title'] = $matches[0];
                        $lesson['topic_title'] = $lesson['title'];
                    }
                }
                unset($lesson);
                DB::table('learning_courses')->where('id', $course->id)->update(['lessons' => json_encode($lessons, JSON_THROW_ON_ERROR)]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_course_reviews');
        Schema::table('learning_course_resources', function (Blueprint $table): void {
            $table->dropIndex('learning_resource_lesson_idx');
            $table->dropColumn('lesson_uid');
        });
        Schema::table('learning_courses', fn (Blueprint $table) => $table->dropColumn('presentation'));
    }
};
