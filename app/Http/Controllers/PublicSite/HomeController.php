<?php

namespace App\Http\Controllers\PublicSite;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Models\Post;
use App\Models\Scenario;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(): Response
    {
        $scenario = Scenario::query()->where('status', 'published')->latest('published_at')->first();

        return Inertia::render('public/Home', [
            'scenario' => $scenario,
            'scenarioResponses' => $scenario ? $scenario->responses()->with('user:id,name')->oldest()->limit(2)->get() : [],
            'posts' => Post::query()->where('status', 'published')->where('visibility', 'public')
                ->when(app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled'), fn ($q) => $q->whereNull('title'))
                ->with(['author:id,name', 'author.profile' => fn ($q) => $q->where('visibility', 'public')->select('id','user_id','role')])->withCount(['comments', 'reactions'])->latest('published_at')->limit(3)->get(),
            'members' => User::query()->where('status', 'active')->when(config('pm-circle.email_verification_required'), fn ($q) => $q->whereNotNull('email_verified_at'))->whereHas('profile', fn ($q) => $q->where('visibility', 'public'))->with('profile:id,user_id,role')->when(app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled'), fn ($q) => $q->whereIn('name', ['Sara Ahmed', 'Daniel Chen', 'Meera Das']))
                ->latest('id')->limit(3)->get(['id', 'name']),
            'showDemoStatistics' => app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled'),
            'counts' => [
                'members' => User::query()->where('status', 'active')->when(config('pm-circle.email_verification_required'), fn ($q) => $q->whereNotNull('email_verified_at'))->count(),
                'discussions' => Post::query()->where('status', 'published')->where('visibility', 'public')->count(),
                'scenarios' => Scenario::query()->where('status', 'published')->count(),
            ],
        ]);
    }

    public function pricing(OnboardingController $onboarding): Response
    {
        return Inertia::render('public/Pricing', ['plans' => $onboarding->catalog()]);
    }
}
