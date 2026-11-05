# PM Circle - staged onboarding password confirmation fix

## Root cause

`OnboardingController::saveProfile()` passes the validated payload's `password_confirmation` to `CreateNewUser`, but `SaveProfileRequest::rules()` previously declared only `password` with `confirmed`. Laravel validates the confirmation by referencing the input but does not automatically return it in `validated()` when it has no own rule. The missing validated key raised `Undefined array key "password_confirmation"` and returned HTTP 500 for staged signup.

## Change

- `app/Http/Requests/Onboarding/SaveProfileRequest.php`: add a `required|string` rule for `password_confirmation` inside the guest-only rule group.
- Keep the existing `password` confirmed rule and centralized `SignupPasswordRules::rule()` untouched.
- Guest passwords are still checked for uppercase/lowercase/numeric/special requirements and matching confirmation. The confirmation is used for validation only, not stored.
- Existing authenticated-member editing does not require a password.

## Impact

No migration, UI change, additional query, new dependency, or route change. All other source files remain unchanged.

## Verify locally

```bash
php artisan config:clear
php artisan test --filter=StagedOnboardingTest
php artisan test
```

The supplied log showed 133 tests passing and the single staged onboarding test failing. PHP lint of the patched request file was performed; the full Laravel tests must be rerun in an environment with Composer dependencies.
