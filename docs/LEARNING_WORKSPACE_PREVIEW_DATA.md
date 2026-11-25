# My Learning preview data

Use an existing active, verified, onboarded **non-admin test member** on a local or testing database. Run:

```sh
php artisan migrate
php artisan learning:seed-preview "your-test-member@example.com"
```

The command is deliberately not part of DatabaseSeeder and rejects non-local/testing environments. It creates two separately labeled, free demo courses (the existing thumbnail assets are reused), enrolls only the chosen member, and uses the real lesson progress service. Initial progress is 1/3 and 3/3, respectively; the latter receives a demo-labeled certificate through the regular issuance service. The command is safe to repeat: it preserves further progress, notes, and certificate references, and refuses conflicting course content. The sample courses also appear in the local public catalog. No real certification is implied. No video, PDF file, AI response or learner discussion is invented; those sections retain their existing behavior. Do not run against production data, and do not copy the seeded database to production.

Open the following pages while signed in as the selected member:

- `/dashboard/learning?tab=my-learning`
- `/dashboard/learning/courses/preview-agile-scrum/lessons/1`
- `/dashboard/learning/courses/preview-agile-scrum/lessons/2`
- `/dashboard/learning/certificates`

Tests: `php artisan test --filter=SeedLearningPreviewTest` (requires installed dependencies and a test database).
