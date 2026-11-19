<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// A member may subscribe only to their own private notifications channel.
Broadcast::channel('users.{userId}', static fn (User $user, string $userId): bool =>
    ! $user->is_admin && $user->status === 'active' && $user->onboarding_step >= 3
    && $user->hasVerifiedEmail() && (string) $user->id === $userId,
);
