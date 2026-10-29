<?php

use App\Http\Controllers\Community\PostController;
use App\Http\Controllers\Members\MemberDirectoryController;
use App\Http\Controllers\Account\AccountFeatureController;
use App\Http\Controllers\Account\SavedPostsController;
use App\Http\Controllers\Learning\LearningController;
use App\Http\Controllers\Billing\TemporaryMembershipController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Community\PostInteractionController;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Http\Controllers\PublicSite\HomeController;
use App\Http\Controllers\Scenario\ScenarioController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/pricing', [HomeController::class, 'pricing'])->name('pricing');
Route::get('/community', [PostController::class, 'index'])->name('community.index');
Route::get('/posts/{post}', [PostController::class, 'show'])->name('posts.show');
Route::get('/scenarios/{scenario:slug}', [ScenarioController::class, 'show'])->name('scenarios.show');
Route::redirect('/join/step/1', '/register')->name('join.account');
Route::inertia('/about', 'public/About')->name('about');
Route::inertia('/terms', 'public/Terms')->name('terms');
Route::inertia('/privacy', 'public/Privacy')->name('privacy');

Route::get('/careers', fn () => \Inertia\Inertia::render('career/Jobs', ['demo' => app()->environment(['local','testing']) && config('pm-circle.demo_content_enabled')]))->name('careers.index');
Route::get('/members', [MemberDirectoryController::class, 'index'])->name('members.index');
Route::get('/members/{member}', [MemberDirectoryController::class, 'show'])->whereNumber('member')->name('members.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/join/step/2', [OnboardingController::class, 'profile'])->name('join.profile');
    Route::post('/join/step/2', [OnboardingController::class, 'saveProfile'])->middleware('throttle:10,1')->name('join.profile.save');
    Route::get('/join/step/3', [OnboardingController::class, 'plan'])->name('join.plan');
    Route::post('/join/step/3', [OnboardingController::class, 'choosePlan'])->middleware('throttle:10,1')->name('join.plan.save');
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/dashboard/features/{feature}', AccountFeatureController::class)->name('dashboard.features');
});

Route::middleware(['auth', 'verified', 'pm.onboarded'])->group(function () {
    Route::get('/saved-posts', SavedPostsController::class)->name('saved-posts.index');
    Route::post('/members/{member}/follow', [MemberDirectoryController::class, 'follow'])->middleware('throttle:30,1')->whereNumber('member')->name('members.follow');
    Route::delete('/members/{member}/follow', [MemberDirectoryController::class, 'unfollow'])->whereNumber('member')->name('members.unfollow');
    Route::get('/membership', [TemporaryMembershipController::class, 'index'])->name('membership.index');
    Route::post('/membership/temporary', [TemporaryMembershipController::class, 'update'])->middleware('throttle:10,1')->name('membership.temporary');
    Route::get('/learning', [LearningController::class, 'index'])->name('learning.index');
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
    Route::delete('/posts/{post}/reactions', [PostInteractionController::class, 'unreact'])->name('posts.reactions.remove');
    Route::post('/posts/{post}/save', [PostInteractionController::class, 'save'])->name('posts.save');
    Route::delete('/posts/{post}/save', [PostInteractionController::class, 'unsave'])->name('posts.unsave');
    Route::post('/scenarios/{scenario}/responses', [ScenarioController::class, 'respond'])->middleware('throttle:10,1')->name('scenarios.responses');
});

require __DIR__.'/settings.php';
