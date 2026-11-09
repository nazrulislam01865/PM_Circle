<?php

use App\Http\Controllers\Auth\EmailVerificationCodeController;
use App\Http\Controllers\Community\PostController;
use App\Http\Controllers\Members\MemberDirectoryController;
use App\Http\Controllers\Account\AccountFeatureController;
use App\Http\Controllers\Account\SavedPostsController;
use App\Http\Controllers\Learning\LearningController;
use App\Http\Controllers\Learning\DemoCourseController;
use App\Http\Controllers\Exam\PmpExamController;
use App\Http\Controllers\Billing\TemporaryMembershipController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Community\PostInteractionController;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Http\Controllers\Settings\ProfileController as SettingsProfileController;
use App\Http\Controllers\PublicSite\HomeController;
use App\Http\Controllers\Scenario\ScenarioController;
use App\Http\Controllers\Scenario\ScenarioReactionController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');
// Public, static PM Trends prototype; no database query or new content table.
Route::inertia('/pm-trends', 'trends/Index')->name('pm-trends.index');
Route::get('/pm-trends/{slug}', fn (string $slug) => \Inertia\Inertia::render('trends/Show', ['slug' => $slug]))
    ->where('slug', '[a-z0-9-]+')->name('pm-trends.show');
Route::get('/pricing', [HomeController::class, 'pricing'])->name('pricing');
Route::get('/community', [PostController::class, 'index'])->name('community.index');
Route::get('/community/feed-page', [PostController::class, 'feedPage'])->middleware('throttle:90,1')->name('community.feed-page');
Route::get('/learning', [LearningController::class, 'index'])->name('learning.index');
Route::get('/learning/courses/{course}', [DemoCourseController::class, 'show'])->name('learning.courses.show');
Route::get('/profile-media/{kind}/{filename}', [SettingsProfileController::class, 'showProfileImage'])
    ->where(['kind' => 'avatar|cover', 'filename' => '[a-zA-Z0-9._-]+'])->name('profile-media.show');
Route::get('/post-media/{filename}', [PostController::class, 'media'])->where('filename', '[a-zA-Z0-9._-]+')->name('posts.media');
Route::get('/posts/{post}', [PostController::class, 'show'])->name('posts.show');
Route::get('/posts/{post}/comments/preview', [PostInteractionController::class, 'previewComments'])->middleware('throttle:60,1')->name('posts.comments.preview');
Route::get('/daily-challenge', [ScenarioController::class, 'index'])->name('scenarios.index');
Route::get('/scenarios/{scenario:slug}', [ScenarioController::class, 'show'])->name('scenarios.show');
Route::redirect('/join/step/1', '/register')->name('join.account');
Route::post('/join/email', [OnboardingController::class, 'beginRegistration'])->middleware('throttle:15,1')->name('join.email');
Route::get('/join/step/2', [OnboardingController::class, 'profile'])->name('join.profile');
Route::post('/join/step/2', [OnboardingController::class, 'saveProfile'])->middleware('throttle:10,1')->name('join.profile.save');
Route::post('/api/auth/send-verification-code', [EmailVerificationCodeController::class, 'sendCode'])->middleware('throttle:15,1');
Route::post('/api/auth/verify-code', [EmailVerificationCodeController::class, 'verifyCode'])->middleware('throttle:30,1');
Route::inertia('/about', 'public/About')->name('about');
Route::inertia('/terms', 'public/Terms')->name('terms');
Route::inertia('/privacy', 'public/Privacy')->name('privacy');

Route::get('/careers', fn () => \Inertia\Inertia::render('career/Jobs', ['demo' => app()->environment(['local','testing']) && config('pm-circle.demo_content_enabled')]))->name('careers.index');
Route::get('/members', [MemberDirectoryController::class, 'index'])->name('members.index');
Route::get('/members/{member}', [MemberDirectoryController::class, 'show'])->whereNumber('member')->name('members.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/join/step/3', [OnboardingController::class, 'plan'])->name('join.plan');
    Route::post('/join/step/3', [OnboardingController::class, 'choosePlan'])->middleware('throttle:10,1')->name('join.plan.save');
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/dashboard/features/{feature}', AccountFeatureController::class)->name('dashboard.features');
});

Route::middleware(['auth', 'verified', 'pm.onboarded'])->group(function () {
    Route::get('/exams/pmp', [PmpExamController::class, 'index'])->name('exams.pmp.index');
    Route::post('/exams/pmp/start', [PmpExamController::class, 'start'])->middleware('throttle:pmp-exam-start')->name('exams.pmp.start');
    Route::get('/exams/pmp/attempts/{attempt}', [PmpExamController::class, 'take'])->whereNumber('attempt')->name('exams.pmp.take');
    Route::put('/exams/pmp/attempts/{attempt}/answer', [PmpExamController::class, 'answer'])->middleware('throttle:120,1')->whereNumber('attempt')->name('exams.pmp.answer');
    Route::post('/exams/pmp/attempts/{attempt}/submit', [PmpExamController::class, 'submit'])->middleware('throttle:pmp-exam-submit')->whereNumber('attempt')->name('exams.pmp.submit');
    Route::get('/exams/pmp/attempts/{attempt}/result', [PmpExamController::class, 'result'])->whereNumber('attempt')->name('exams.pmp.result');
    Route::get('/exams/pmp/attempts/{attempt}/review', [PmpExamController::class, 'review'])->whereNumber('attempt')->name('exams.pmp.review');
    // Member workspace aliases reuse the public page queries and React components.
    // The public routes remain available to visitors and members.
    Route::get('/dashboard/learning', [LearningController::class, 'index'])->name('dashboard.learning.index');
    Route::get('/dashboard/learning/courses/{course}', [DemoCourseController::class, 'show'])->name('dashboard.learning.courses.show');
    Route::post('/dashboard/learning/courses/{course}/enroll', [DemoCourseController::class, 'enroll'])->middleware('throttle:20,1')->name('dashboard.learning.courses.enroll');
    Route::get('/dashboard/daily-challenge', [ScenarioController::class, 'index'])->name('dashboard.scenarios.index');
    Route::get('/dashboard/daily-challenge/{scenario:slug}', [ScenarioController::class, 'show'])->name('dashboard.scenarios.show');
    Route::get('/saved-posts', SavedPostsController::class)->name('saved-posts.index');
    Route::post('/members/{member}/follow', [MemberDirectoryController::class, 'follow'])->middleware('throttle:30,1')->whereNumber('member')->name('members.follow');
    Route::delete('/members/{member}/follow', [MemberDirectoryController::class, 'unfollow'])->whereNumber('member')->name('members.unfollow');
    Route::get('/membership', [TemporaryMembershipController::class, 'index'])->name('membership.index');
    Route::post('/membership/temporary', [TemporaryMembershipController::class, 'update'])->middleware('throttle:10,1')->name('membership.temporary');
    Route::post('/learning/courses/{course}/enroll', [DemoCourseController::class, 'enroll'])->middleware('throttle:20,1')->name('learning.courses.enroll');
    Route::post('/learning/courses/{course}/save', [DemoCourseController::class, 'save'])->middleware('throttle:30,1')->name('learning.courses.save');
    Route::delete('/learning/courses/{course}/save', [DemoCourseController::class, 'unsave'])->name('learning.courses.unsave');
    Route::get('/learning/skills-check', [LearningController::class, 'skillsCheck'])->name('learning.skills-check');
    Route::get('/learning/starting-point-result', [LearningController::class, 'startingPointResult'])->name('learning.starting-point-result');
    Route::get('/learning/{path}', [LearningController::class, 'show'])->name('learning.path');
    Route::get('/learning/{path}/modules/{module}/activities/{activity}', [LearningController::class, 'activity'])->name('learning.activity');
    Route::post('/learning/{path}/save', [LearningController::class, 'save'])->middleware('throttle:30,1')->name('learning.save');
    Route::delete('/learning/{path}/save', [LearningController::class, 'unsave'])->name('learning.unsave');
    Route::post('/learning/{path}/modules/{module}/activities/{activity}/check', [LearningController::class, 'check'])->middleware('throttle:30,1')->name('learning.check');
    Route::post('/learning/{path}/modules/{module}/activities/{activity}/complete', [LearningController::class, 'complete'])->middleware('throttle:30,1')->name('learning.complete');

    Route::post('/posts', [PostController::class, 'store'])->middleware('throttle:10,1')->name('posts.store');
    Route::post('/posts/{post}/comments', [PostInteractionController::class, 'comment'])->middleware('throttle:20,1')->name('posts.comments');
    Route::post('/posts/{post}/comments/{comment}/like', [PostInteractionController::class, 'toggleCommentLike'])->middleware('throttle:60,1')->name('comments.like');
    Route::post('/posts/{post}/reactions', [PostInteractionController::class, 'react'])->middleware('throttle:60,1')->name('posts.reactions');
    Route::delete('/posts/{post}/reactions', [PostInteractionController::class, 'unreact'])->middleware('throttle:60,1')->name('posts.reactions.remove');
    Route::post('/posts/{post}/save', [PostInteractionController::class, 'save'])->name('posts.save');
    Route::delete('/posts/{post}/save', [PostInteractionController::class, 'unsave'])->name('posts.unsave');
    Route::post('/scenarios/{scenario}/responses', [ScenarioController::class, 'respond'])->middleware('throttle:10,1')->name('scenarios.responses');
    Route::post('/scenarios/{scenario}/bookmark', [ScenarioReactionController::class, 'bookmark'])->name('scenarios.bookmark');
    Route::delete('/scenarios/{scenario}/bookmark', [ScenarioReactionController::class, 'unbookmark'])->name('scenarios.bookmark.remove');
    Route::post('/scenarios/{scenario}/reactions', [ScenarioReactionController::class, 'reactToScenario'])->middleware('throttle:60,1')->name('scenarios.reactions');
    Route::delete('/scenarios/{scenario}/reactions', [ScenarioReactionController::class, 'unreactToScenario'])->middleware('throttle:60,1')->name('scenarios.reactions.remove');
    Route::post('/scenarios/{scenario}/responses/{response}/reactions', [ScenarioReactionController::class, 'reactToResponse'])->middleware('throttle:60,1')->name('scenarios.responses.reactions');
    Route::delete('/scenarios/{scenario}/responses/{response}/reactions', [ScenarioReactionController::class, 'unreactToResponse'])->middleware('throttle:60,1')->name('scenarios.responses.reactions.remove');
});

require __DIR__.'/settings.php';
