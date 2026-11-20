<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('learning_courses', function (Blueprint $table): void {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('title', 180);
            $table->text('summary');
            $table->text('overview');
            $table->string('category', 100);
            $table->string('level', 20);
            $table->unsignedInteger('minutes');
            $table->unsignedTinyInteger('thumbnail')->default(1);
            $table->string('cover_path')->nullable();
            $table->string('access_tier', 12)->default('free');
            $table->json('objectives');
            $table->json('outline');
            $table->json('lessons');
            $table->unsignedInteger('sort_order')->default(999);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->index(['is_published', 'sort_order']);
        });

        // Import the existing public catalog exactly once. Slugs remain unchanged so
        // existing bookmarks and enrollment records retain their references.
        $time = now();
        $rows = [];
        foreach (config('demo-learning-courses.courses', []) as $index => $course) {
            $rows[] = [
                'slug' => $course['slug'],
                'title' => $course['title'],
                'summary' => $course['summary'],
                'overview' => $course['overview'] ?? $course['summary'],
                'category' => $course['category'],
                'level' => $course['level'],
                'minutes' => $course['minutes'],
                'thumbnail' => $course['thumbnail'],
                'access_tier' => $course['accessTier'],
                'objectives' => json_encode($course['objectives'] ?? array_column($course['lessons'] ?? [], 'title'), JSON_THROW_ON_ERROR),
                'outline' => json_encode($course['outline'] ?? array_map(
                    fn (array $lesson): array => ['title' => $lesson['title'], 'topics' => [$lesson['title']]],
                    $course['lessons'] ?? [],
                ), JSON_THROW_ON_ERROR),
                'lessons' => json_encode($course['lessons'] ?? [], JSON_THROW_ON_ERROR),
                'sort_order' => $index + 1,
                'is_published' => true,
                'created_at' => $time,
                'updated_at' => $time,
            ];
        }
        if ($rows !== []) {
            DB::table('learning_courses')->insert($rows);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_courses');
    }
};
