<?php

namespace Tests\Feature\Learning;

use App\Models\LearningActivity;
use App\Models\LearningQuestion;
use App\Models\User;
use Database\Seeders\LearningDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class LearningFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LearningDemoSeeder::class);
    }

    public function test_member_can_access_skills_check_and_starting_point_result(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->get('/learning/skills-check')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('learning/SkillsCheck'));

        $this->actingAs($member)->get('/learning/starting-point-result?recommended=student-beginner')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('learning/StartingPointResult')
                ->where('recommendedSlug', 'student-beginner'));
    }

    public function test_catalog_is_public_but_learning_activities_still_require_authentication(): void
    {
        $this->get('/learning')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('learning/Catalog')->has('courses', 12)->has('paths', 5)
            ->where('shell', null)->where('isMember', false));
        $this->get('/learning/student-beginner')->assertRedirect('/login');
    }

    public function test_member_can_navigate_catalog_and_path(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->get('/learning')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('learning/Catalog')
                ->has('paths', 5)->where('shell', null)->where('memberShell', null));
        $this->actingAs($member)->get('/learning/student-beginner')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('learning/PathShow')->has('path.modules', 6));
    }

    public function test_catalog_uses_demo_course_cards_without_prices_or_fabricated_ratings(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);

        $this->actingAs($member)->get('/learning')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('learning/Catalog')
                ->has('paths', 5)
                ->has('courses', 12)
                ->has('practiceModules', 32)
                ->where('courses.0.title', 'PMP Exam Preparation (Complete Course)')
                ->where('courses.0.slug', 'pmp-exam-preparation')
                ->where('courses.0.accessTier', 'paid')
                ->where('courses.0.enrolled', false)
                ->where('courses.0.saved', false)
                ->missing('courses.0.price')
                ->missing('courses.0.rating'));

        $this->actingAs($member)->post('/learning/student-beginner/save')->assertRedirect();
        $this->actingAs($member)->get('/learning')->assertInertia(fn (Assert $page) => $page
            ->where('paths.0.saved', true)
            ->where('courses.0.saved', false));
    }

    public function test_question_key_is_hidden_until_answer_submitted_and_scored_on_server(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $url = '/learning/student-beginner/modules/1/activities/2';
        $this->actingAs($member)->get($url)->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('learning/Activity')
                ->where('question.prompt', 'Which of these is a project?')
                ->missing('question.answer_key')->where('question.explanation', null));

        $this->actingAs($member)->post($url.'/check', ['question' => 1, 'choice' => 'B'])->assertRedirect();
        $question = LearningQuestion::query()->where('prompt', 'Which of these is a project?')->firstOrFail();
        $this->assertDatabaseHas('learning_answers', [
            'user_id' => $member->id, 'learning_question_id' => $question->id,
            'answer_key' => 'B', 'is_correct' => true,
        ]);
        $this->actingAs($member)->get($url)->assertInertia(fn (Assert $page) =>
            $page->where('question.isCorrect', true)->where('answered', 1));
    }

    public function test_replayed_questions_do_not_duplicate_completion(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $activity = LearningActivity::query()->where('type', 'mcq')->firstOrFail();
        $url = '/learning/student-beginner/modules/1/activities/2/check';
        foreach ([1, 2, 3, 3] as $position) {
            $this->actingAs($member)->post($url, ['question' => $position, 'choice' => 'A'])->assertRedirect();
        }
        $this->assertEquals(1, DB::table('learning_activity_completions')
            ->where('user_id', $member->id)->where('learning_activity_id', $activity->id)->count());
    }

    public function test_answer_and_progress_remain_private_to_the_member(): void
    {
        $first = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $url = '/learning/student-beginner/modules/1/activities/2';
        $this->actingAs($first)->post($url.'/check', ['question' => 1, 'choice' => 'B'])->assertRedirect();
        $this->actingAs($other)->get($url)->assertInertia(fn (Assert $page) =>
            $page->where('answered', 0)->where('question.selected', null)
                ->where('question.explanation', null));
    }

    public function test_member_must_finish_onboarding_before_learning(): void
    {
        $member = User::factory()->create(['onboarding_step' => 1]);
        $this->actingAs($member)->get('/learning')->assertOk();
        $this->actingAs($member)->get('/learning/skills-check')->assertRedirect(route('join.profile'));
    }

    public function test_lesson_and_scenario_completions_are_saved_once(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $lesson = '/learning/student-beginner/modules/1/activities/1/complete';
        $scenario = '/learning/student-beginner/modules/1/activities/4/complete';
        $this->actingAs($member)->post($lesson)->assertRedirect();
        $this->actingAs($member)->post($lesson)->assertRedirect();
        $this->actingAs($member)->post($scenario, ['response' => '0'])->assertRedirect();
        $this->assertEquals(2, DB::table('learning_activity_completions')
            ->where('user_id', $member->id)->count());
    }

    public function test_save_and_unsave_path_are_idempotent(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $url = '/learning/student-beginner/save';
        $this->actingAs($member)->post($url)->assertRedirect();
        $this->actingAs($member)->post($url)->assertRedirect();
        $this->assertEquals(1, DB::table('learning_path_saves')->where('user_id', $member->id)->count());
        $this->actingAs($member)->delete($url)->assertRedirect();
        $this->assertEquals(0, DB::table('learning_path_saves')->where('user_id', $member->id)->count());
    }

    public function test_invalid_answers_and_cross_path_activities_are_rejected(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->post('/learning/student-beginner/modules/1/activities/2/check', [
            'question' => 1, 'choice' => 'E',
        ])->assertSessionHasErrors('choice');
        $this->actingAs($member)->get('/learning/project-coordinator/modules/999/activities/2')->assertNotFound();
        $this->actingAs($member)->post('/learning/student-beginner/modules/1/activities/3/complete', [
            'response' => 'short',
        ])->assertSessionHasErrors('response');
    }
}
