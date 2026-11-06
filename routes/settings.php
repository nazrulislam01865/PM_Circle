<?php

use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\ProfileEntryController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('settings/profile/experiences', [ProfileController::class, 'saveExperience'])->name('profile.experiences.save');
    Route::post('settings/profile/projects', [ProfileEntryController::class, 'saveProject'])->name('profile.projects.save');
    Route::delete('settings/profile/projects/{project}', [ProfileEntryController::class, 'deleteProject'])->name('profile.projects.delete');
    Route::post('settings/profile/educations', [ProfileEntryController::class, 'saveEducation'])->name('profile.educations.save');
    Route::delete('settings/profile/educations/{education}', [ProfileEntryController::class, 'deleteEducation'])->name('profile.educations.delete');
    Route::post('settings/profile/certifications', [ProfileEntryController::class, 'saveCertification'])->name('profile.certifications.save');
    Route::delete('settings/profile/certifications/{certification}', [ProfileEntryController::class, 'deleteCertification'])->name('profile.certifications.delete');
    Route::delete('settings/profile/experiences/{experience}', [ProfileController::class, 'deleteExperience'])->name('profile.experiences.delete');
    Route::post('settings/profile/cover', [ProfileController::class, 'uploadCover'])->name('profile.cover.upload');
    Route::post('settings/profile/avatar', [ProfileController::class, 'uploadAvatar'])->name('profile.avatar.upload');
    Route::delete('settings/profile/avatar', [ProfileController::class, 'removeAvatar'])->name('profile.avatar.delete');
    Route::post('settings/profile/resume', [ProfileController::class, 'uploadResume'])->name('profile.resume.upload');
    Route::get('settings/profile/resume/export', [ProfileController::class, 'exportResume'])->name('profile.resume.export');
    Route::get('settings/profile/resume/{resume}/preview', [ProfileController::class, 'previewResume'])->name('profile.resume.preview');
    Route::delete('settings/profile/resume/{resume}', [ProfileController::class, 'removeResume'])->name('profile.resume.remove');
    Route::get('settings/profile/resume/{resume?}', [ProfileController::class, 'downloadResume'])->name('profile.resume.download');
    Route::post('settings/profile/import/start', [ProfileController::class, 'startImport'])->name('profile.import.start');
    Route::get('settings/profile/import/{import}/status', [ProfileController::class, 'importStatus'])->name('profile.import.status');
    Route::post('settings/profile/import/{import}/retry', [ProfileController::class, 'retryImport'])
        ->middleware('throttle:3,10')->name('profile.import.retry');
    Route::post('settings/profile/import/apply', [ProfileController::class, 'applyImport'])->name('profile.import.apply');
    Route::post('settings/profile/import/cancel', [ProfileController::class, 'cancelImport'])->name('profile.import.cancel');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])
        ->middleware(RequirePassword::class)
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');
});

Route::get('.well-known/passkey-endpoints', function () {
    return response()->json([
        'enroll' => route('security.edit'),
        'manage' => route('security.edit'),
    ]);
})->name('well-known.passkeys');
