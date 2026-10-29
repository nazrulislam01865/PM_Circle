<?php

namespace App\Domain\Identity\Actions;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CompleteProfessionalProfile
{
    /** @param array<string, mixed> $data */
    public function execute(User $user, array $data, ?string $newResume): void
    {
        $oldResume = $user->profile?->resume_path;
        try {
            DB::transaction(function () use ($user, $data, $newResume): void {
                $user->profile()->updateOrCreate(['user_id' => $user->id], [
                    'role' => $data['role'] ?? null,
                    'years_experience' => $data['years_experience'] ?? null,
                    ...($newResume ? ['resume_path' => $newResume, 'resume_scan_status' => 'pending_scan'] : []),
                ]);
                $user->certifications()->delete();
                foreach ($data['certifications'] ?? [] as $certification) {
                    $user->certifications()->create($certification);
                }
                $user->update(['onboarding_step' => 2]);
            });
        } catch (\Throwable $exception) {
            if ($newResume) Storage::disk('local')->delete($newResume);
            throw $exception;
        }
        if ($newResume && $oldResume) Storage::disk('local')->delete($oldResume);
    }
}
