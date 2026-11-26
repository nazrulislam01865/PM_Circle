<?php

use App\Http\Controllers\Auth\EmailVerificationCodeController;
use App\Http\Controllers\Community\PostController;
use App\Http\Controllers\Community\PostManagementController;
use App\Http\Controllers\Community\PostPollController;
use App\Http\Controllers\Admin\PostModerationController;
use App\Http\Controllers\Members\MemberDirectoryController;
use App\Http\Controllers\Account\AccountFeatureController;
use App\Http\Controllers\Account\SavedPostsController;
use App\Http\Controllers\Learning\LearningController;
use App\Http\Controllers\Learning\DemoCourseController;
use App\Http\Controllers\Exam\PmpExamController;
use App\Http\Controllers\Interview\InterviewController;
use App\Http\Controllers\Billing\TemporaryMembershipController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Community\PostInteractionController;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Http\Controllers\Settings\ProfileController as SettingsProfileController;
use App\Http\Controllers\PublicSite\HomeController;
use App\Http\Controllers\PublicSite\EventPreviewController;
use App\Http\Controllers\Admin\CommunityEventController;
use App\Http\Controllers\PublicSite\ContactController;
use App\Http\Controllers\Admin\HomepageController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\SiteFooterController;
use App\Http\Controllers\Admin\ReactionIconController;
use App\Http\Controllers\Admin\ProfileRewardSettingsController;
use App\Http\Controllers\Admin\PmpPublicPageController as AdminPmpPublicPageController;
use App\Http\Controllers\Admin\PmpExamBankController;
use App\Http\Controllers\Admin\InterviewCatalogController;
use App\Http\Controllers\Admin\LearningCourseController;
use App\Http\Controllers\Admin\LearningCourseContentController;
use App\Http\Controllers\Learning\CoursePracticeController;
use App\Http\Controllers\Learning\CourseResourceController;
use App\Http\Controllers\PublicSite\PmpPublicPageController;
use App\Http\Controllers\Admin\MasterDataController;
use App\Http\Controllers\Scenario\ScenarioController;
use App\Http\Controllers\Scenario\ScenarioReactionController;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Laravel\Fortify\Http\Controllers\AuthenticatedSessionController;
use Illuminate\Support\Facades\Route;

// Admin credentials are accepted only by this separate Fortify login endpoint.
// It uses Fortify's existing throttling, session regeneration, and 2FA pipeline.
Route::middleware('guest:web')->group(function (): void {
    Route::get('/admin/login', fn () => Inertia::render('auth/admin-login'))->name('admin.login');
    Route::post('/admin/login', [AuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:login')->name('admin.login.store');
});
Route::post('/admin/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware(['auth', 'pm.admin'])->name('admin.logout');

// Administration is isolated from public/member areas and authorized on every request.
Route::middleware(['auth', 'pm.admin', 'verified'])->prefix('admin')->name('admin.')->group(function (): void {
    Route::get('/', AdminDashboardController::class)->name('dashboard');
    Route::get('/events', [CommunityEventController::class, 'index'])->name('events.index');
    Route::get('/events/create', [CommunityEventController::class, 'create'])->name('events.create');
    Route::get('/events/settings', [CommunityEventController::class, 'settings'])->name('events.settings');
    Route::put('/events/settings', [CommunityEventController::class, 'saveSettings'])->middleware('throttle:10,1')->name('events.settings.update');
    Route::post('/events', [CommunityEventController::class, 'store'])->middleware('throttle:10,1')->name('events.store');
    Route::get('/events/{event}/edit', [CommunityEventController::class, 'edit'])->whereNumber('event')->name('events.edit');
    Route::post('/events/{event}', [CommunityEventController::class, 'update'])->whereNumber('event')->middleware('throttle:15,1')->name('events.update');
    Route::patch('/events/{event}/status', [CommunityEventController::class, 'status'])->whereNumber('event')->middleware('throttle:20,1')->name('events.status');
    Route::get('/events/{event}/participants', [CommunityEventController::class, 'participants'])->whereNumber('event')->name('events.participants');
    Route::patch('/events/{event}/comments/{comment}', [CommunityEventController::class, 'moderate'])->whereNumber(['event', 'comment'])->middleware('throttle:30,1')->name('events.comments.moderate');
    Route::get('/support-requests', [\App\Http\Controllers\Account\SupportController::class, 'adminIndex'])->name('support.index');
    Route::get('/support-requests/{ticket}', [\App\Http\Controllers\Account\SupportController::class, 'adminShow'])->whereNumber('ticket')->name('support.show');
    Route::post('/support-requests/{ticket}', [\App\Http\Controllers\Account\SupportController::class, 'reply'])->whereNumber('ticket')->middleware('throttle:30,1')->name('support.reply');
    Route::get('/support-requests/{ticket}/screenshot', [\App\Http\Controllers\Account\SupportController::class, 'screenshot'])->whereNumber('ticket')->name('support.screenshot');

    Route::get('/post-reports', [PostModerationController::class, 'index'])->name('post-reports.index');
    Route::get('/reaction-icons', [ReactionIconController::class, 'index'])->name('reaction-icons.index');
    Route::post('/reaction-icons', [ReactionIconController::class, 'create'])->middleware('throttle:10,1')->name('reaction-icons.create');
    Route::patch('/reaction-icons/{type}', [ReactionIconController::class, 'update'])->middleware('throttle:20,1')->name('reaction-icons.update');
    Route::post('/reaction-icons/{type}', [ReactionIconController::class, 'upload'])->middleware('throttle:20,1')->name('reaction-icons.upload');
    Route::delete('/reaction-icons/{type}', [ReactionIconController::class, 'restore'])->middleware('throttle:20,1')->name('reaction-icons.restore');
    Route::post('/post-reviews/{post}', [PostModerationController::class, 'reviewPost'])->middleware('throttle:30,1')->name('post-reviews.update');
    Route::get('/post-reviews/{post}/media', [PostModerationController::class, 'reviewPostMedia'])->middleware('throttle:60,1')->name('post-reviews.media');
    Route::post('/comment-reviews/{comment}', [PostModerationController::class, 'reviewComment'])->middleware('throttle:30,1')->name('comment-reviews.update');
    Route::get('/comment-reviews/{comment}/media', [PostModerationController::class, 'reviewCommentMedia'])->middleware('throttle:60,1')->name('comment-reviews.media');
    Route::patch('/post-reports/{report}', [PostModerationController::class, 'update'])->middleware('throttle:30,1')->whereNumber('report')->name('post-reports.update');
    Route::get('/profile-rewards', [ProfileRewardSettingsController::class, 'edit'])->name('profile-rewards.edit');
    Route::put('/profile-rewards', [ProfileRewardSettingsController::class, 'update'])->middleware('throttle:10,1')->name('profile-rewards.update');
    Route::get('/legal/{document}', [\App\Http\Controllers\Admin\LegalPageController::class, 'edit'])->whereIn('document', ['terms', 'privacy'])->name('legal.edit');
    Route::put('/legal/{document}', [\App\Http\Controllers\Admin\LegalPageController::class, 'update'])->whereIn('document', ['terms', 'privacy'])->middleware('throttle:20,1')->name('legal.update');
    Route::post('/legal/{document}/publish', [\App\Http\Controllers\Admin\LegalPageController::class, 'publish'])->whereIn('document', ['terms', 'privacy'])->middleware('throttle:5,1')->name('legal.publish');
    Route::get('/homepage', [HomepageController::class, 'edit'])->name('homepage.edit');
    Route::get('/footer', [SiteFooterController::class, 'edit'])->name('footer.edit');
    Route::put('/footer', [SiteFooterController::class, 'update'])->middleware('throttle:20,1')->name('footer.update');
    Route::get('/interview-preparation', [InterviewCatalogController::class, 'index'])->name('interview-catalog.index');
    Route::post('/interview-preparation/options', [InterviewCatalogController::class, 'createOption'])->middleware('throttle:20,1')->name('interview-catalog.options.store');
    Route::patch('/interview-preparation/options/{option}', [InterviewCatalogController::class, 'updateOption'])->middleware('throttle:30,1')->whereNumber('option')->name('interview-catalog.options.update');
    Route::post('/interview-preparation/sets', [InterviewCatalogController::class, 'createSet'])->middleware('throttle:20,1')->name('interview-catalog.sets.store');
    Route::patch('/interview-preparation/sets/{set}', [InterviewCatalogController::class, 'updateSet'])->middleware('throttle:30,1')->whereNumber('set')->name('interview-catalog.sets.update');
    Route::post('/interview-preparation/questions', [InterviewCatalogController::class, 'createQuestion'])->middleware('throttle:30,1')->name('interview-catalog.questions.store');
    Route::patch('/interview-preparation/questions/{question}', [InterviewCatalogController::class, 'updateQuestion'])->middleware('throttle:30,1')->whereNumber('question')->name('interview-catalog.questions.update');
    Route::delete('/interview-preparation/options/{option}', [InterviewCatalogController::class, 'deleteOption'])->middleware('throttle:15,1')->whereNumber('option')->name('interview-catalog.options.destroy');
    Route::delete('/interview-preparation/sets/{set}', [InterviewCatalogController::class, 'deleteSet'])->middleware('throttle:15,1')->whereNumber('set')->name('interview-catalog.sets.destroy');
    Route::delete('/interview-preparation/questions/{question}', [InterviewCatalogController::class, 'deleteQuestion'])->middleware('throttle:15,1')->whereNumber('question')->name('interview-catalog.questions.destroy');
    Route::post('/interview-preparation/questions/import', [InterviewCatalogController::class, 'import'])->middleware('throttle:5,1')->name('interview-catalog.questions.import');
    Route::get('/interview-preparation/questions/template', [InterviewCatalogController::class, 'template'])->name('interview-catalog.questions.template');
    Route::put('/interview-preparation/settings', [InterviewCatalogController::class, 'updateSettings'])->middleware('throttle:20,1')->name('interview-catalog.settings.update');
    Route::get('/learning/courses', [LearningCourseController::class, 'index'])->name('learning-courses.index');
    Route::get('/learning/courses/create', [LearningCourseController::class, 'create'])->name('learning-courses.create');
    Route::post('/learning/courses', [LearningCourseController::class, 'store'])->middleware('throttle:15,1')->name('learning-courses.store');
    Route::get('/learning/courses/{course}/edit', [LearningCourseController::class, 'edit'])->whereNumber('course')->name('learning-courses.edit');
    Route::put('/learning/courses/{course}', [LearningCourseController::class, 'update'])->middleware('throttle:20,1')->whereNumber('course')->name('learning-courses.update');
    Route::patch('/learning/courses/{course}/publish', [LearningCourseController::class, 'toggle'])->middleware('throttle:20,1')->whereNumber('course')->name('learning-courses.publish');
    Route::get('/learning/courses/questions/lesson-template', [LearningCourseContentController::class, 'lessonQuestionTemplate'])->name('learning-courses.questions.lesson-template');
    Route::get('/learning/courses/catalog-settings', [\App\Http\Controllers\Admin\LearningCatalogSettingsController::class, 'edit'])->name('learning-courses.catalog-settings');
    Route::put('/learning/courses/catalog-settings', [\App\Http\Controllers\Admin\LearningCatalogSettingsController::class, 'update'])->middleware('throttle:20,1')->name('learning-courses.catalog-settings.update');
    Route::get('/learning/courses/questions/template', [LearningCourseContentController::class, 'template'])->name('learning-courses.questions.template');
    Route::get('/learning/courses/{course}/reviews', [\App\Http\Controllers\Admin\LearningCourseReviewController::class, 'index'])->whereNumber('course')->name('learning-courses.reviews');
    Route::patch('/learning/courses/{course}/reviews/{review}', [\App\Http\Controllers\Admin\LearningCourseReviewController::class, 'update'])->middleware('throttle:30,1')->whereNumber(['course', 'review'])->name('learning-courses.reviews.update');
    Route::get('/learning/courses/{course}/content', [LearningCourseContentController::class, 'index'])->whereNumber('course')->name('learning-courses.content');
    Route::put('/learning/courses/{course}/practice-settings', [LearningCourseContentController::class, 'settings'])->middleware('throttle:20,1')->whereNumber('course')->name('learning-courses.practice-settings');
    Route::post('/learning/courses/{course}/questions', [LearningCourseContentController::class, 'question'])->middleware('throttle:30,1')->whereNumber('course')->name('learning-courses.questions.store');
    Route::put('/learning/courses/{course}/questions/{question}', [LearningCourseContentController::class, 'updateQuestion'])->middleware('throttle:30,1')->whereNumber(['course', 'question'])->name('learning-courses.questions.update');
    Route::patch('/learning/courses/{course}/questions/{question}/status', [LearningCourseContentController::class, 'questionStatus'])->middleware('throttle:30,1')->whereNumber(['course', 'question'])->name('learning-courses.questions.status');
    Route::post('/learning/courses/{course}/questions/import', [LearningCourseContentController::class, 'import'])->middleware('throttle:5,1')->whereNumber('course')->name('learning-courses.questions.import');
    Route::post('/learning/courses/{course}/resources', [LearningCourseContentController::class, 'resource'])->middleware('throttle:15,1')->whereNumber('course')->name('learning-courses.resources.store');
    Route::put('/learning/courses/{course}/resources/{resource}', [LearningCourseContentController::class, 'updateResource'])->middleware('throttle:20,1')->whereNumber(['course', 'resource'])->name('learning-courses.resources.update');
    Route::patch('/learning/courses/{course}/resources/{resource}/status', [LearningCourseContentController::class, 'resourceStatus'])->middleware('throttle:20,1')->whereNumber(['course', 'resource'])->name('learning-courses.resources.status');
    Route::get('/exam-simulator/pmp/questions', [PmpExamBankController::class, 'index'])->name('pmp-questions.index');
    Route::get('/exam-simulator/pmp/questions/sample-options', [PmpExamBankController::class, 'sampleOptions'])->middleware('throttle:60,1')->name('pmp-questions.sample-options');
    Route::put('/exam-simulator/pmp/settings', [PmpExamBankController::class, 'updateSettings'])->middleware('throttle:20,1')->name('pmp-questions.settings');
    Route::post('/exam-simulator/pmp/questions', [PmpExamBankController::class, 'store'])->middleware('throttle:30,1')->name('pmp-questions.store');
    Route::put('/exam-simulator/pmp/questions/{question}', [PmpExamBankController::class, 'update'])->middleware('throttle:30,1')->whereNumber('question')->name('pmp-questions.update');
    Route::patch('/exam-simulator/pmp/questions/{question}/status', [PmpExamBankController::class, 'toggle'])->middleware('throttle:30,1')->whereNumber('question')->name('pmp-questions.status');
    Route::post('/exam-simulator/pmp/questions/activate-approved', [PmpExamBankController::class, 'activateApproved'])->middleware('throttle:5,1')->name('pmp-questions.activate-approved');
    Route::post('/exam-simulator/pmp/questions/import', [PmpExamBankController::class, 'import'])->middleware('throttle:5,1')->name('pmp-questions.import');
    Route::get('/exam-simulator/pmp/questions/template', [PmpExamBankController::class, 'template'])->name('pmp-questions.template');
    Route::get('/exam-simulator/pmp', [AdminPmpPublicPageController::class, 'edit'])->name('pmp-public.edit');
    Route::put('/exam-simulator/pmp', [AdminPmpPublicPageController::class, 'update'])->middleware('throttle:20,1')->name('pmp-public.update');
    Route::put('/homepage', [HomepageController::class, 'update'])->middleware('throttle:20,1')->name('homepage.update');
    Route::post('/homepage/images', [HomepageController::class, 'upload'])->middleware('throttle:20,1')->name('homepage.upload');
    Route::get('/navigation', [MasterDataController::class, 'navigationIndex'])->name('navigation.index');
    Route::post('/navigation', [MasterDataController::class, 'store'])->middleware('throttle:20,1')->name('navigation.store');
    Route::patch('/navigation/{masterDataOption}', [MasterDataController::class, 'update'])->middleware('throttle:30,1')->name('navigation.update');
    Route::get('/master-data', [MasterDataController::class, 'index'])->name('master-data.index');
    Route::post('/master-data', [MasterDataController::class, 'store'])->middleware('throttle:20,1')->name('master-data.store');
    Route::patch('/master-data/{masterDataOption}', [MasterDataController::class, 'update'])->middleware('throttle:30,1')->name('master-data.update');
});

Route::get('/', [HomeController::class, 'index'])->name('home');
// Public, browser-only career exploration; requires no account, API or database records.
Route::inertia('/discover-pm', 'public/DiscoverPm')->name('discover-pm.index');
// Public, static PM Trends prototype; no database query or new content table.
Route::inertia('/pm-trends', 'trends/Index')->name('pm-trends.index');
Route::get('/pm-trends/{slug}', fn (string $slug) => \Inertia\Inertia::render('trends/Show', ['slug' => $slug]))
    ->where('slug', '[a-z0-9-]+')->name('pm-trends.show');
Route::get('/pricing', [HomeController::class, 'pricing'])->name('pricing');
Route::get('/community', [PostController::class, 'index'])->name('community.index');
Route::get('/community/feed-page', [PostController::class, 'feedPage'])->middleware('throttle:90,1')->name('community.feed-page');
Route::get('/learning', [LearningController::class, 'index'])->name('learning.index');
Route::get('/learning/courses/{course}', [DemoCourseController::class, 'show'])->name('learning.courses.show');
Route::get('/learning/my-learning', [\App\Http\Controllers\Learning\CourseLearningController::class, 'index'])->name('learning.my-learning');
Route::get('/learning/certificates', [\App\Http\Controllers\Learning\CourseLearningController::class, 'certificates'])->name('learning.certificates');
Route::get('/learning/courses/{course}/lessons/{lesson}', [\App\Http\Controllers\Learning\CourseLearningController::class, 'show'])->whereNumber('lesson')->name('learning.courses.lesson');
Route::get('/profile-media/{kind}/{filename}', [SettingsProfileController::class, 'showProfileImage'])
    ->where(['kind' => 'avatar|cover', 'filename' => '[a-zA-Z0-9._-]+'])->name('profile-media.show');
Route::get('/post-media/{filename}', [PostController::class, 'media'])->where('filename', '[a-zA-Z0-9._-]+')->name('posts.media');
Route::get('/posts/{post}/check-media/{filename}', [PostController::class, 'checkMedia'])->middleware(['auth', 'pm.member'])->where('filename', '[a-zA-Z0-9._-]+')->name('posts.check-media');
Route::get('/posts/{post}/media/{filename}', [PostController::class, 'privateMedia'])->where('filename', '[a-zA-Z0-9._-]+')->name('posts.private-media');
// Exact private review endpoint must precede the public /posts/{post} binding.
Route::get('/posts/check-feed', [PostManagementController::class, 'checkFeed'])
    ->middleware(['auth', 'pm.member', 'verified', 'pm.onboarded', 'throttle:30,1'])->name('posts.check-feed');
Route::get('/posts/{post}', [PostController::class, 'show'])->name('posts.show');
Route::get('/posts/{post}/reactions/users', [PostInteractionController::class, 'reactionUsers'])->middleware('throttle:60,1')->name('posts.reactions.users');
Route::get('/posts/{post}/comments/preview', [PostInteractionController::class, 'previewComments'])->middleware('throttle:60,1')->name('posts.comments.preview');
Route::get('/posts/{post}/comments/{comment}/check-status', [PostInteractionController::class, 'commentCheckStatus'])->middleware(['auth', 'pm.member', 'throttle:60,1'])->name('posts.comments.check-status');
Route::post('/posts/{post}/comments/{comment}/recheck', [PostInteractionController::class, 'recheckComment'])->middleware(['auth', 'pm.member', 'verified', 'pm.onboarded', 'throttle:6,1'])->name('posts.comments.recheck');
Route::get('/posts/{post}/comments/{comment}/replies', [PostInteractionController::class, 'replies'])->middleware('throttle:60,1')->name('posts.comments.replies');
Route::get('/posts/{post}/comments/{comment}/media/{filename}', [PostInteractionController::class, 'commentMedia'])
    ->where('filename', '[a-zA-Z0-9._-]+')->middleware('throttle:120,1')->name('posts.comments.media');
Route::get('/daily-challenge', [ScenarioController::class, 'index'])->name('scenarios.index');
Route::get('/scenarios/{scenario:slug}', [ScenarioController::class, 'show'])->name('scenarios.show');
Route::redirect('/join/step/1', '/register')->name('join.account');
Route::post('/join/email', [OnboardingController::class, 'beginRegistration'])->middleware('throttle:15,1')->name('join.email');
Route::get('/join/step/2', [OnboardingController::class, 'profile'])->middleware('pm.member:true')->name('join.profile');
Route::post('/join/step/2', [OnboardingController::class, 'saveProfile'])->middleware(['pm.member:true', 'throttle:10,1'])->name('join.profile.save');
Route::post('/api/auth/send-verification-code', [EmailVerificationCodeController::class, 'sendCode'])->middleware(['pm.member:true', 'throttle:15,1']);
Route::post('/api/auth/verify-code', [EmailVerificationCodeController::class, 'verifyCode'])->middleware(['pm.member:true', 'throttle:30,1']);
Route::inertia('/about', 'public/About')->name('about');
Route::get('/terms', [\App\Http\Controllers\PublicSite\LegalPageController::class, 'terms'])->name('terms');
Route::get('/privacy', [\App\Http\Controllers\PublicSite\LegalPageController::class, 'privacy'])->name('privacy');
// Static public support destinations for the PMP footer; no APIs or database queries.
Route::get('/help-center', [\App\Http\Controllers\Account\SupportController::class, 'entry'])->name('help-center');
Route::get('/contact', [ContactController::class, 'index'])->name('contact');
Route::post('/contact', [ContactController::class, 'submit'])->middleware('throttle:5,10')->name('contact.submit');
Route::get('/contact/confirm/{token}', [ContactController::class, 'confirm'])
    ->middleware(['signed', 'throttle:10,1'])->where('token', '[A-Za-z0-9]{64}')->name('contact.confirm');
Route::inertia('/refund-policy', 'public/PolicyNotice')->name('refund-policy');
// Static public resume preview; no AI request or resume data access.
Route::inertia('/ai-resume-assistant', 'public/AiResumeAssistant')->name('ai-resume-assistant');

// Published event catalog and server-side registration/discussion.
Route::get('/events', [EventPreviewController::class, 'index'])->name('events.index');
Route::middleware(['auth', 'pm.member', 'verified', 'pm.onboarded'])->group(function (): void {
    Route::get('/events/create', [EventPreviewController::class, 'create'])->name('events.create');
    Route::post('/events', [EventPreviewController::class, 'store'])->middleware('throttle:5,1')->name('events.store');
});
Route::get('/events/{slug}', [EventPreviewController::class, 'show'])->where('slug', '[a-z0-9-]+')->name('events.show');
Route::post('/events/{slug}/register', [EventPreviewController::class, 'register'])->where('slug', '[a-z0-9-]+')->middleware('throttle:5,1')->name('events.register');
Route::post('/events/{slug}/comments', [EventPreviewController::class, 'comment'])->where('slug', '[a-z0-9-]+')->middleware('throttle:5,1')->name('events.comments.store');

// Career job listing and detail routes are temporarily disabled. Existing data and controller are retained.
Route::get('/members', [MemberDirectoryController::class, 'index'])->name('members.index');
Route::get('/members/{member}', [MemberDirectoryController::class, 'show'])->whereNumber('member')->name('members.show');

// The approved catalog is the public exam simulator page, including the existing PMP URL.
// Browsing needs no question-bank query or entitlement check.
Route::inertia('/simulators', 'exam/Browse')->name('simulators.browse');
Route::redirect('/exam-simulator', '/exam-simulator/pmp')->name('simulators.catalog');
Route::inertia('/exam-simulator/pmp', 'exam/Browse')->name('exams.pmp.catalog');

// Keep the administrator-configured PMP samples and legacy exam landing accessible
// from the catalog's PMP detail actions. Signed-in members continue to be redirected
// to their authorized exam flow from this dedicated details page.
Route::get('/exam-simulator/pmp/details', PmpPublicPageController::class)->name('exams.pmp.public');
// Public status pages only; actual simulator APIs remain member/entitlement protected.
Route::inertia('/simulators/project', 'public/ComingSoon', ['title' => 'Project Simulator'])->name('simulators.project.public');
Route::get('/simulators/scrum', [\App\Http\Controllers\Exam\ScrumSimulatorController::class, 'preview'])->name('simulators.scrum.public');
// Preview cards have accurate destinations without creating additional data queries.
Route::inertia('/simulators/business-analysis', 'public/ComingSoon', ['title' => 'Business Analysis Exam Simulator'])->name('simulators.business-analysis.public');
Route::inertia('/simulators/capm', 'public/ComingSoon', ['title' => 'CAPM Exam Simulator'])->name('simulators.capm.public');
Route::inertia('/simulators/pmi-acp', 'public/ComingSoon', ['title' => 'PMI-ACP Exam Simulator'])->name('simulators.pmi-acp.public');

Route::middleware(['auth', 'pm.member', 'verified'])->group(function () {
    Route::get('/join/step/3', [OnboardingController::class, 'plan'])->name('join.plan');
    Route::post('/join/step/3', [OnboardingController::class, 'choosePlan'])->middleware('throttle:10,1')->name('join.plan.save');
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/dashboard/features/{feature}', AccountFeatureController::class)->name('dashboard.features');
});

// Authenticated, member-scoped notification feed and read-state operations.
Route::middleware(['auth', 'pm.member', 'verified', 'pm.onboarded', 'throttle:60,1'])
    ->prefix('notifications')->name('notifications.')->group(function (): void {
        $controller = \App\Http\Controllers\Account\NotificationController::class;
        Route::get('/feed', [$controller, 'index'])->name('feed');
        Route::post('/read-all', [$controller, 'readAll'])->name('read-all');
        Route::post('/{notification}/read', [$controller, 'read'])->whereUuid('notification')->name('read');
    });

Route::middleware(['auth', 'pm.member', 'verified', 'pm.onboarded'])->group(function () {
    Route::get('/interview-preparation', [InterviewController::class, 'index'])->name('interview.index');
    Route::post('/interview-preparation/preview', [InterviewController::class, 'preview'])->middleware('throttle:10,1')->block(15, 10)->name('interview.preview');
    Route::post('/interview-preparation/jd-text', [InterviewController::class, 'jdText'])->middleware('throttle:10,1')->name('interview.jd-text');
    Route::post('/interview-preparation/start', [InterviewController::class, 'start'])->middleware('throttle:10,1')->block(15, 10)->name('interview.start');
    Route::get('/interview-preparation/sessions/{session}', [InterviewController::class, 'practice'])->whereNumber('session')->name('interview.practice');
    Route::post('/interview-preparation/sessions/{session}/answer', [InterviewController::class, 'submit'])->middleware('throttle:15,1')->whereNumber('session')->name('interview.answer');
    Route::get('/interview-preparation/sessions/{session}/answers/{position}', [InterviewController::class, 'answerStatus'])->middleware('throttle:60,1')->whereNumber('session')->whereNumber('position')->name('interview.answer.status');
    Route::delete('/interview-preparation/sessions/{session}/answers/{position}', [InterviewController::class, 'retry'])->middleware('throttle:15,1')->whereNumber('session')->whereNumber('position')->name('interview.answer.retry');
    Route::post('/interview-preparation/sessions/{session}/finish', [InterviewController::class, 'finish'])->middleware('throttle:10,1')->whereNumber('session')->name('interview.finish');
    Route::get('/interview-preparation/results', [InterviewController::class, 'results'])->name('interview.results');
    Route::get('/interview-preparation/results/{session}', [InterviewController::class, 'results'])->whereNumber('session')->name('interview.results.show');

    Route::get('/exams/scrum', \App\Http\Controllers\Exam\ScrumSimulatorController::class)->name('exams.scrum.index');
    Route::get('/exams/pmp/enter', [PmpExamController::class, 'entry'])->name('exams.pmp.entry');
    Route::get('/exams/pmp', [PmpExamController::class, 'index'])->name('exams.pmp.index');
    Route::get('/exams/pmp/ai-usage', \App\Http\Controllers\Exam\PmpAiUsageController::class)
        ->middleware('throttle:30,1')->name('exams.pmp.ai-usage');
    Route::get('/exams/pmp/history', [PmpExamController::class, 'history'])->middleware('throttle:30,1')->name('exams.pmp.history');
    Route::put('/exams/pmp/target-date', [PmpExamController::class, 'updateTargetDate'])->middleware('throttle:20,1')->name('exams.pmp.target-date');
    Route::get('/exams/pmp/start-options', [PmpExamController::class, 'startOptions'])->middleware('throttle:30,1')->name('exams.pmp.start-options');
    Route::post('/exams/pmp/start', [PmpExamController::class, 'start'])->middleware('throttle:pmp-exam-start')->name('exams.pmp.start');
    Route::get('/exams/pmp/attempts/{attempt}', [PmpExamController::class, 'take'])->whereNumber('attempt')->name('exams.pmp.take');
    Route::put('/exams/pmp/attempts/{attempt}/answer', [PmpExamController::class, 'answer'])->middleware('throttle:120,1')->whereNumber('attempt')->name('exams.pmp.answer');
    Route::post('/exams/pmp/attempts/{attempt}/submit', [PmpExamController::class, 'submit'])->middleware('throttle:pmp-exam-submit')->whereNumber('attempt')->name('exams.pmp.submit');
    Route::get('/exams/pmp/attempts/{attempt}/result', [PmpExamController::class, 'result'])->whereNumber('attempt')->name('exams.pmp.result');
    Route::get('/exams/pmp/attempts/{attempt}/review', [PmpExamController::class, 'review'])->whereNumber('attempt')->name('exams.pmp.review');
    Route::get('/exams/pmp/attempts/{attempt}/questions/{question}/ai-chat',
        [\App\Http\Controllers\Exam\PmpQuestionChatController::class, 'show'])
        ->middleware('throttle:30,1')->whereNumber('attempt')->whereNumber('question')->name('exams.pmp.ai-chat');
    Route::post('/exams/pmp/attempts/{attempt}/questions/{question}/ai-help', [PmpExamController::class, 'aiHelp'])
        ->middleware('throttle:5,1')->whereNumber('attempt')->whereNumber('question')->name('exams.pmp.ai-help');
    // Member workspace aliases reuse the public page queries and React components.
    // The public routes remain available to visitors and members.
    Route::get('/dashboard/learning', [LearningController::class, 'index'])->name('dashboard.learning.index');
    Route::get('/dashboard/learning/courses/{course}', [DemoCourseController::class, 'show'])->name('dashboard.learning.courses.show');
    Route::get('/dashboard/learning/my-learning', [\App\Http\Controllers\Learning\CourseLearningController::class, 'index'])->name('dashboard.learning.my-learning');
    Route::get('/dashboard/learning/certificates', [\App\Http\Controllers\Learning\CourseLearningController::class, 'certificates'])->name('dashboard.learning.certificates');
    Route::get('/dashboard/learning/courses/{course}/lessons/{lesson}', [\App\Http\Controllers\Learning\CourseLearningController::class, 'show'])->whereNumber('lesson')->name('dashboard.learning.courses.lesson');
    Route::get('/learning/certificates/{reference}', [\App\Http\Controllers\Learning\CourseLearningController::class, 'certificate'])->whereUuid('reference')->name('learning.certificate.show');
    Route::get('/dashboard/learning/certificates/{reference}', [\App\Http\Controllers\Learning\CourseLearningController::class, 'certificate'])->whereUuid('reference')->name('dashboard.learning.certificate.show');
    Route::post('/learning/courses/{course}/lessons/{lesson}/complete', [\App\Http\Controllers\Learning\CourseLearningController::class, 'complete'])->whereNumber('lesson')->middleware('throttle:course-lesson-write')->name('learning.courses.lesson.complete');
    Route::post('/learning/courses/{course}/lessons/{lesson}/notes', [\App\Http\Controllers\Learning\CourseLearningController::class, 'notes'])->whereNumber('lesson')->middleware('throttle:course-lesson-write')->name('learning.courses.lesson.notes');
    Route::post('/learning/courses/{course}/lessons/{lesson}/check', [\App\Http\Controllers\Learning\CourseLearningController::class, 'check'])->whereNumber('lesson')->middleware('throttle:course-lesson-write')->name('learning.courses.lesson.check');
    Route::post('/dashboard/learning/courses/{course}/enroll', [DemoCourseController::class, 'enroll'])->middleware('throttle:20,1')->name('dashboard.learning.courses.enroll');
    Route::get('/dashboard/daily-challenge', [ScenarioController::class, 'index'])->name('dashboard.scenarios.index');
    Route::get('/dashboard/daily-challenge/{scenario:slug}', [ScenarioController::class, 'show'])->name('dashboard.scenarios.show');
    Route::get('/activity-log', [\App\Http\Controllers\Account\ActivityLogController::class, 'index'])->name('activity-log.index');
    Route::get('/activity-log/entries', [\App\Http\Controllers\Account\ActivityLogController::class, 'entries'])->middleware('throttle:30,1')->name('activity-log.entries');
    Route::delete('/activity-log/history', [\App\Http\Controllers\Account\ActivityLogController::class, 'clear'])->middleware('throttle:5,1')->name('activity-log.clear');
    Route::get('/saved-posts', SavedPostsController::class)->name('saved-posts.index');
    Route::post('/members/{member}/follow', [MemberDirectoryController::class, 'follow'])->middleware('throttle:30,1')->whereNumber('member')->name('members.follow');
    Route::delete('/members/{member}/follow', [MemberDirectoryController::class, 'unfollow'])->whereNumber('member')->name('members.unfollow');
    Route::get('/membership', [TemporaryMembershipController::class, 'index'])->name('membership.index');
    Route::get('/dashboard/resume-assistant', \App\Http\Controllers\Account\ResumeAssistantController::class)->name('member.resume-assistant');
    Route::post('/dashboard/resume-assistant/export', [\App\Http\Controllers\Account\ResumeAssistantController::class, 'export'])->middleware('throttle:resume-assistant-export')->name('member.resume-assistant.export');
    Route::post('/dashboard/resume-assistant/extract', [\App\Http\Controllers\Account\ResumeAssistantController::class, 'extract'])->middleware('throttle:resume-assistant-extract')->name('member.resume-assistant.extract');
    Route::post('/dashboard/resume-assistant', [\App\Http\Controllers\Account\ResumeAssistantController::class, 'save'])->middleware('throttle:15,1')->name('member.resume-assistant.save');
    Route::get('/help-center/guides', [\App\Http\Controllers\Account\SupportController::class, 'guides'])->name('support.guides');
    Route::get('/help-center/contact', [\App\Http\Controllers\Account\SupportController::class, 'create'])->name('support.create');
    Route::post('/help-center/requests', [\App\Http\Controllers\Account\SupportController::class, 'store'])->middleware('throttle:support-submit')->name('support.store');
    Route::get('/help-center/requests', [\App\Http\Controllers\Account\SupportController::class, 'index'])->name('support.index');
    Route::get('/help-center/requests/{ticket}', [\App\Http\Controllers\Account\SupportController::class, 'show'])->whereNumber('ticket')->name('support.show');
    Route::get('/help-center/requests/{ticket}/screenshot', [\App\Http\Controllers\Account\SupportController::class, 'screenshot'])->whereNumber('ticket')->name('support.screenshot');

    Route::post('/membership/temporary', [TemporaryMembershipController::class, 'update'])->middleware('throttle:membership-switch')->name('membership.temporary');
    Route::post('/learning/courses/{course}/enroll', [DemoCourseController::class, 'enroll'])->middleware('throttle:20,1')->name('learning.courses.enroll');
    Route::post('/learning/courses/{course}/save', [DemoCourseController::class, 'save'])->middleware('throttle:30,1')->name('learning.courses.save');
    Route::delete('/learning/courses/{course}/save', [DemoCourseController::class, 'unsave'])->name('learning.courses.unsave');
    Route::post('/learning/courses/{course}/practice/start', [CoursePracticeController::class, 'start'])->middleware('throttle:10,1')->name('learning.courses.practice.start');
    Route::get('/learning/courses/{course}/practice/{attempt}', [CoursePracticeController::class, 'take'])->whereNumber('attempt')->name('learning.courses.practice.take');
    Route::put('/learning/courses/{course}/practice/{attempt}/answer', [CoursePracticeController::class, 'answer'])->middleware('throttle:120,1')->whereNumber('attempt')->name('learning.courses.practice.answer');
    Route::post('/learning/courses/{course}/practice/{attempt}/submit', [CoursePracticeController::class, 'submit'])->middleware('throttle:15,1')->whereNumber('attempt')->name('learning.courses.practice.submit');
    Route::get('/learning/courses/{course}/practice/{attempt}/result', [CoursePracticeController::class, 'result'])->whereNumber('attempt')->name('learning.courses.practice.result');
    Route::post('/learning/courses/{course}/reviews', [\App\Http\Controllers\Learning\CourseReviewController::class, 'store'])->middleware('throttle:5,1')->name('learning.courses.reviews.store');
    Route::get('/learning/courses/{course}/resources/{resource}', [CourseResourceController::class, 'open'])->middleware('throttle:40,1')->whereNumber('resource')->name('learning.courses.resources.open');
    Route::get('/learning/skills-check', [LearningController::class, 'skillsCheck'])->name('learning.skills-check');
    Route::get('/learning/starting-point-result', [LearningController::class, 'startingPointResult'])->name('learning.starting-point-result');
    Route::get('/learning/{path}', [LearningController::class, 'show'])->name('learning.path');
    Route::get('/learning/{path}/modules/{module}/activities/{activity}', [LearningController::class, 'activity'])->name('learning.activity');
    Route::post('/learning/{path}/save', [LearningController::class, 'save'])->middleware('throttle:30,1')->name('learning.save');
    Route::delete('/learning/{path}/save', [LearningController::class, 'unsave'])->name('learning.unsave');
    Route::post('/learning/{path}/modules/{module}/activities/{activity}/check', [LearningController::class, 'check'])->middleware('throttle:30,1')->name('learning.check');
    Route::post('/learning/{path}/modules/{module}/activities/{activity}/complete', [LearningController::class, 'complete'])->middleware('throttle:30,1')->name('learning.complete');

    Route::post('/posts/{post}/recheck', [PostManagementController::class, 'recheck'])->middleware('throttle:5,1')->name('posts.recheck');
    Route::post('/posts/{post}/repost', [PostManagementController::class, 'repost'])->middleware('throttle:10,1')->name('posts.repost');
    Route::post('/posts', [PostController::class, 'store'])->middleware('throttle:10,1')->name('posts.store');
    Route::patch('/posts/{post}', [PostManagementController::class, 'update'])->middleware('throttle:20,1')->name('posts.update');
    Route::delete('/posts/{post}', [PostManagementController::class, 'destroy'])->middleware('throttle:20,1')->name('posts.destroy');
    Route::post('/posts/{post}/mute', [PostManagementController::class, 'mute'])->middleware('throttle:30,1')->name('posts.mute');
    Route::post('/posts/{post}/hide', [PostManagementController::class, 'hide'])->middleware('throttle:30,1')->name('posts.hide');
    Route::delete('/posts/{post}/hide', [PostManagementController::class, 'unhide'])->middleware('throttle:30,1')->name('posts.unhide');
    Route::post('/posts/{post}/report', [PostManagementController::class, 'report'])->middleware('throttle:10,1')->name('posts.report');
    Route::post('/posts/{post}/poll-votes', [PostPollController::class, 'vote'])->middleware('throttle:30,1')->name('posts.poll-vote');
    Route::post('/posts/{post}/comments', [PostInteractionController::class, 'comment'])->middleware('throttle:20,1')->name('posts.comments');
    Route::post('/posts/{post}/comments/{comment}/like', [PostInteractionController::class, 'toggleCommentLike'])->middleware('throttle:60,1')->name('comments.like');
    Route::post('/posts/{post}/comments/{comment}/reactions', [PostInteractionController::class, 'reactToComment'])->middleware('throttle:60,1')->name('comments.reactions');
    Route::delete('/posts/{post}/comments/{comment}/reactions', [PostInteractionController::class, 'unreactToComment'])->middleware('throttle:60,1')->name('comments.reactions.remove');
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

// Standalone authenticated JSON contracts for background AI interactions. No public API mirror.
Route::middleware(['auth', 'pm.member', 'verified', 'pm.onboarded', 'throttle:60,1'])
    ->prefix('ai')->name('ai.')->group(function (): void {
        Route::get('/features', [\App\Http\Controllers\AI\AiRequestController::class, 'features'])->name('features');
        Route::get('/wallet', [\App\Http\Controllers\AI\AiWalletController::class, 'show'])->name('wallet');
        Route::get('/wallet/ledger', [\App\Http\Controllers\AI\AiWalletController::class, 'ledger'])->name('ledger');
        Route::get('/limits', [\App\Http\Controllers\AI\AiWalletController::class, 'limits'])->name('limits');
        Route::get('/usage', [\App\Http\Controllers\AI\AiRequestController::class, 'history'])->name('usage');
        Route::post('/requests', [\App\Http\Controllers\AI\AiRequestController::class, 'store'])
            ->middleware('throttle:6,1')->name('requests.store');
        Route::get('/requests/{uuid}', [\App\Http\Controllers\AI\AiRequestController::class, 'show'])
            ->whereUuid('uuid')->name('requests.show');
        Route::get('/conversations', [\App\Http\Controllers\AI\AiConversationController::class, 'index'])->name('conversations.index');
        Route::get('/conversations/{conversation}', [\App\Http\Controllers\AI\AiConversationController::class, 'show'])
            ->whereNumber('conversation')->name('conversations.show');
        Route::post('/conversations/{conversation}/messages', [\App\Http\Controllers\AI\AiConversationController::class, 'message'])
            ->whereNumber('conversation')->middleware('throttle:6,1')->name('conversations.messages');
        Route::get('/resume-drafts', [\App\Http\Controllers\AI\AiResumeDraftController::class, 'index'])
            ->name('resume-drafts.index');
        Route::post('/resume-drafts/{draft}/approve', [\App\Http\Controllers\AI\AiResumeDraftController::class, 'approve'])
            ->whereNumber('draft')->name('resume-drafts.approve');
        Route::delete('/resume-drafts/{draft}', [\App\Http\Controllers\AI\AiResumeDraftController::class, 'discard'])
            ->whereNumber('draft')->name('resume-drafts.discard');
        Route::post('/resumes/{resume}/revoke-consent', [\App\Http\Controllers\AI\AiResumeDraftController::class, 'revokeConsent'])
            ->whereNumber('resume')->name('resumes.revoke-consent');
        Route::delete('/conversations/{conversation}', [\App\Http\Controllers\AI\AiConversationController::class, 'destroy'])
            ->whereNumber('conversation')->name('conversations.destroy');
    });

Route::middleware(['auth', 'pm.admin', 'verified', 'throttle:60,1'])
    ->prefix('admin/ai')->name('admin.ai.')->group(function (): void {
        $management = \App\Http\Controllers\Admin\AI\AiManagementController::class;
        $limits = \App\Http\Controllers\Admin\AI\AiQuotaAdminController::class;
        $editorial = \App\Http\Controllers\Admin\AI\AiEditorialController::class;
        $credits = \App\Http\Controllers\Admin\AI\AiCreditAdminController::class;
        Route::get('/', [$management, 'index'])->name('index');
        $workspace = \App\Http\Controllers\Admin\AI\AiWorkspaceController::class;
        Route::redirect('/workspace', '/admin/ai/workspace/overview')->name('workspace');
        Route::get('/workspace/{section}', [$workspace, 'index'])->whereIn('section', \App\Http\Controllers\Admin\AI\AiWorkspaceController::PAGES)->name('workspace.section');
        Route::post('/workspace/providers', [$workspace, 'saveProvider'])->name('workspace.providers.create');
        Route::put('/workspace/providers/{id}', [$workspace, 'saveProvider'])->whereNumber('id')->name('workspace.providers.update');
        Route::post('/workspace/credentials', [$workspace, 'saveKey'])->name('workspace.credentials.create');
        Route::put('/workspace/credentials/{id}', [$workspace, 'saveKey'])->whereNumber('id')->name('workspace.credentials.update');
        Route::post('/workspace/credentials/activate', [$workspace, 'activateKey'])->name('workspace.credentials.activate');
        Route::post('/workspace/environment/{slot}/rotate', [$workspace, 'rotateEnvironment'])->withoutMiddleware('throttle:60,1')->middleware('throttle:admin-ai-workspace-test')->name('workspace.environment.rotate');
        Route::post('/workspace/environment/{slot}/test', [$workspace, 'testEnvironment'])->withoutMiddleware('throttle:60,1')->middleware('throttle:admin-ai-workspace-test')->name('workspace.environment.test');
        Route::post('/workspace/credentials/{id}/test', [$workspace, 'testKey'])->whereNumber('id')->withoutMiddleware('throttle:60,1')->middleware('throttle:admin-ai-workspace-test')->name('workspace.credentials.test');
        Route::post('/workspace/credentials/{id}/rotate', [$workspace, 'rotateKey'])->whereNumber('id')->withoutMiddleware('throttle:60,1')->middleware('throttle:admin-ai-workspace-test')->name('workspace.credentials.rotate');
        Route::post('/workspace/models', [$workspace, 'saveModel'])->name('workspace.models.create');
        Route::put('/workspace/models/{id}', [$workspace, 'saveModel'])->whereNumber('id')->name('workspace.models.update');
        Route::get('/workspace/connection/{feature}', [$workspace, 'connectionOptions'])->name('workspace.connection.options');
        Route::put('/workspace/connection/{feature}', [$workspace, 'saveConnectionPrimary'])->name('workspace.connection.save');
        Route::put('/workspace/features/{feature}', [$workspace, 'saveFeatureRoute'])->name('workspace.features.save');
        Route::put('/workspace/budget', [$workspace, 'saveBudget'])->name('workspace.budget.save');

        Route::get('/usage', [$management, 'usage'])->name('usage');
        Route::put('/features', [$management, 'saveFeature'])->name('features.save');
        Route::post('/prompts', [$management, 'publishPrompt'])->name('prompts.publish');
        Route::post('/model-prices', [$management, 'publishPrice'])->name('model-prices.publish');
        $dashboard = \App\Http\Controllers\Admin\AI\AiUsageDashboardController::class;
        Route::get('/usage-management', [$dashboard, 'index'])->name('usage-management');
        Route::get('/usage-management/members', [$dashboard, 'members'])
            ->middleware('throttle:20,1')->name('usage-management.members');
        Route::get('/usage-management/members/{user}', [$dashboard, 'member'])
            ->whereNumber('user')->middleware('throttle:20,1')->name('usage-management.member');
        Route::get('/chat-limits', [$limits, 'index'])->name('chat-limits');
        Route::get('/chat-limits/preview', [$limits, 'preview'])->name('chat-limits.preview');
        Route::post('/chat-limits/policies', [$limits, 'publishPolicy'])->name('chat-limits.policies');
        Route::post('/chat-limits/overrides', [$limits, 'override'])->name('chat-limits.overrides');
        Route::post('/chat-limits/overrides/{override}/revoke', [$limits, 'revokeOverride'])
            ->whereNumber('override')->name('chat-limits.overrides.revoke');
        Route::post('/allowances', [$limits, 'publishAllowance'])->name('allowances');
        $trends = \App\Http\Controllers\Admin\AI\CareerTrendSettingsController::class;
        Route::get('/career-trends', [$trends, 'index'])->name('career-trends.index');
        Route::put('/career-trends', [$trends, 'update'])->name('career-trends.update');
        Route::post('/career-trends/connection-test', [$trends, 'testConnection'])
            ->withoutMiddleware('throttle:60,1')->middleware('throttle:admin-ai-diagnostic')->name('career-trends.connection-test');
        Route::get('/career-trends/connection-test/{uuid}', [$trends, 'connectionTestStatus'])
            ->whereUuid('uuid')->withoutMiddleware('throttle:60,1')->middleware('throttle:admin-ai-diagnostic-status')->name('career-trends.connection-test.status');
        $featureSettings = \App\Http\Controllers\Admin\AI\FeatureSettingsController::class;
        Route::get('/pmp-settings', [$featureSettings, 'pmp'])->name('pmp-settings.index');
        Route::put('/pmp-settings', [$featureSettings, 'updatePmp'])->name('pmp-settings.update');
        Route::get('/feed-moderation', [$featureSettings, 'feed'])->name('feed-moderation.index');
        Route::put('/feed-moderation', [$featureSettings, 'updateFeed'])->name('feed-moderation.update');
        Route::post('/feed-moderation/test', [$featureSettings, 'testModeration'])->withoutMiddleware('throttle:60,1')->middleware('throttle:admin-ai-diagnostic')->name('feed-moderation.test');
        Route::post('/feature-connection/{feature}', [$featureSettings, 'connection'])
            ->whereIn('feature', ['daily-challenge', 'daily-challenge-review', 'pmp', 'feed-moderation', 'resume_analyze', 'resume_rewrite', 'interview_answer_review'])->withoutMiddleware('throttle:60,1')->middleware('throttle:admin-ai-diagnostic')->name('feature-connection');
        Route::get('/feature-connection/{feature}/{uuid}', [$featureSettings, 'connectionStatus'])
            ->whereIn('feature', ['daily-challenge', 'daily-challenge-review', 'pmp', 'resume_analyze', 'resume_rewrite', 'interview_answer_review'])->whereUuid('uuid')->withoutMiddleware('throttle:60,1')->middleware('throttle:admin-ai-diagnostic-status')->name('feature-connection.status');
        $daily = \App\Http\Controllers\Admin\DailyChallenge\DailyChallengeController::class;
        Route::get('/daily-challenge', [$daily, 'index'])->name('daily-challenge.index');
        Route::put('/daily-challenge', [$daily, 'update'])->name('daily-challenge.update');
        Route::post('/daily-challenge/generate', [$daily, 'generate'])
            ->middleware('throttle:5,1')->name('daily-challenge.generate');
        Route::post('/daily-challenge/drafts/{draft}/publish', [$daily, 'publishDraft'])
            ->whereNumber('draft')->middleware('throttle:5,1')->name('daily-challenge.drafts.publish');
        Route::put('/daily-challenge/{scenario}/expires', [$daily, 'expire'])
            ->whereNumber('scenario')->name('daily-challenge.expires');
        Route::get('/editorial', [$editorial, 'index'])->name('editorial');
        Route::post('/editorial/scenarios', [$editorial, 'generateScenario'])->name('editorial.scenarios');
        Route::post('/editorial/trends', [$editorial, 'generateTrend'])->name('editorial.trends');
        Route::post('/editorial/trend-sources', [$editorial, 'verifyTrendSource'])->name('editorial.sources');
        Route::post('/editorial/scenarios/{scenario}/rubrics', [$editorial, 'publishRubric'])
            ->whereNumber('scenario')->name('editorial.rubric');
        Route::get('/editorial/{draft}', [$editorial, 'show'])->whereNumber('draft')->name('editorial.show');
        Route::patch('/editorial/{draft}', [$editorial, 'edit'])->whereNumber('draft')->name('editorial.edit');
        Route::post('/editorial/{draft}/approve', [$editorial, 'approve'])->whereNumber('draft')->name('editorial.approve');
        Route::post('/editorial/{draft}/publish', [$editorial, 'publish'])->whereNumber('draft')->name('editorial.publish');
        Route::get('/packages', [$credits, 'packages'])->name('packages');
        Route::post('/packages', [$credits, 'publishPackage'])->name('packages.publish');
        Route::post('/packages/{package}/disable', [$credits, 'disablePackage'])
            ->whereNumber('package')->name('packages.disable');
        Route::post('/credits/grants', [$credits, 'grant'])->name('credits.grant');
        Route::get('/credits/reconciliation', [$credits, 'reconcile'])->name('credits.reconcile');
        Route::post('/requests/{uuid}/refund-unknown', [$credits, 'resolveUnknown'])
            ->whereUuid('uuid')->name('requests.refund-unknown');
    });

Route::middleware(['auth', 'pm.member', 'verified', 'pm.onboarded'])
    ->prefix('billing')->name('billing.')->group(function (): void {
        $controller = \App\Http\Controllers\Billing\AiCreditCheckoutController::class;
        // Server-calculated membership amounts only; clients cannot submit amounts or payment status.
        Route::post('/membership-checkout',
            [\App\Http\Controllers\Billing\PaymentCheckoutController::class, 'membership'])
            ->middleware('throttle:6,1')->name('membership.checkout');
        Route::get('/orders/{uuid}',
            [\App\Http\Controllers\Billing\PaymentCheckoutController::class, 'show'])
            ->middleware('throttle:60,1')->whereUuid('uuid')->name('orders.show');
        Route::get('/ai-packages', [$controller, 'packages'])->middleware('throttle:30,1')->name('ai.packages');
        Route::post('/ai-checkout', [$controller, 'checkout'])->middleware('throttle:6,1')->name('ai.checkout');
        Route::get('/ai-orders/{uuid}', [$controller, 'order'])->middleware('throttle:60,1')->whereUuid('uuid')->name('ai.orders');
    });
// One shared endpoint for membership and AI events. A verified provider adapter is mandatory; default rejects.
Route::post('/webhooks/payments/{provider}',
    [\App\Http\Controllers\Billing\AiCreditCheckoutController::class, 'webhook'])
    ->middleware('throttle:30,1')->where('provider', 'bkash|nagad')
    ->name('webhooks.ai-payments');
