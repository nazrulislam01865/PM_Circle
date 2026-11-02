<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class EmailVerificationCodeController extends Controller
{
    public function sendCode(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first('email'),
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = mb_strtolower(trim($request->input('email')));

        if (User::where('email', $email)->exists()) {
            return response()->json([
                'message' => 'This email is already registered. Please log in.',
                'errors' => ['email' => ['This email is already registered. Please log in.']],
            ], 422);
        }

        // Generate 6-digit code
        $code = (string) random_int(100000, 999999);
        Cache::put("email_verification:{$email}", $code, now()->addMinutes(15));

        Log::info("Verification code for {$email}: {$code} (local dev accept: 123456 as well)");

        return response()->json([
            'message' => 'Verification code sent to your email.',
            'dev_code' => app()->environment(['local', 'testing']) ? $code : null,
        ]);
    }

    public function verifyCode(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email'],
            'code' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Please provide a valid 6-digit verification code.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = mb_strtolower(trim($request->input('email')));
        $enteredCode = trim($request->input('code'));
        $cachedCode = Cache::get("email_verification:{$email}");

        // In local development, accept 123456 or the generated code
        $isLocalDevMatch = app()->environment(['local', 'testing']) && $enteredCode === '123456';
        $isCachedMatch = $cachedCode && $cachedCode === $enteredCode;

        if (! $isLocalDevMatch && ! $isCachedMatch) {
            return response()->json([
                'message' => 'Incorrect code. Please try again.',
                'errors' => ['code' => ['Incorrect code. Please try again.']],
            ], 422);
        }

        // Cache verification token for 30 minutes
        Cache::put("email_verified:{$email}", true, now()->addMinutes(30));
        $request->session()->put("email_verified:{$email}", true);

        return response()->json([
            'verified' => true,
            'message' => 'Email verified successfully.',
        ]);
    }
}

