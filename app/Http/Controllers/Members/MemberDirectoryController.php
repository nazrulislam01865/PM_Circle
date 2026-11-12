<?php

namespace App\Http\Controllers\Members;

use App\Domain\Billing\Actions\SetTemporaryMembership;
use App\Http\Controllers\Controller;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class MemberDirectoryController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:80'],
            'role' => ['nullable', 'string', 'max:120'],
            'industry' => ['nullable', 'string', 'max:120'],
            'location' => ['nullable', 'string', 'max:250'],
            'tab' => ['nullable', 'in:all,following'],
            'sort' => ['nullable', 'in:recent,name,followers'],
        ]);
        $search = trim($filters['search'] ?? '');
        $role = $filters['role'] ?? '';
        $industry = $filters['industry'] ?? '';
        $location = $filters['location'] ?? '';
        $tab = $filters['tab'] ?? 'all';
        $sort = $filters['sort'] ?? 'recent';
        $viewer = $request->user();
        $viewerId = $viewer && ! $viewer->is_admin ? $viewer->id : null;

        $query = User::query()
            ->where('users.is_admin', false)
            ->where('users.status', 'active')
            ->whereHas('profile', fn ($profile) => $profile->where('visibility', 'public')
                ->when($role !== '', fn ($profile) => $profile->where('role', $role))
                ->when($industry !== '', fn ($profile) => $profile->where('industry', $industry))
                ->when($location !== '', function ($profile) use ($location): void {
                    [$city, $country] = array_pad(explode('|', $location, 2), 2, '');
                    if ($city === '') {
                        $profile->where(fn ($query) => $query->whereNull('city')->orWhere('city', ''));
                    } else {
                        $profile->where('city', $city);
                    }
                    if ($country === '') {
                        $profile->where(fn ($query) => $query->whereNull('country')->orWhere('country', ''));
                    } else {
                        $profile->where('country', $country);
                    }
                }))
            ->when(config('pm-circle.email_verification_required'), fn ($query) => $query->whereNotNull('users.email_verified_at'))
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search): void {
                $term = '%'.mb_strtolower(addcslashes($search, '%_\\')).'%';
                $query->whereRaw('LOWER(users.name) LIKE ?', [$term])
                    ->orWhereHas('profile', fn ($profile) => $profile->where('visibility', 'public')
                        ->whereRaw('LOWER(role) LIKE ?', [$term]));
            }))
            ->when($tab === 'following', fn ($query) => $viewerId
                ? $query->whereIn('users.id', DB::table('member_follows')->where('follower_id', $viewerId)->select('followed_id'))
                : $query->whereRaw('1 = 0'))
            ->select(['users.id', 'users.name', 'users.created_at'])
            ->with(['profile' => fn ($query) => $query->select('id', 'user_id', 'role', 'headline', 'industry', 'city', 'country', 'avatar_path', 'visibility')])
            ->withCount(['posts as contributions_count' => fn ($query) => $query
                ->where('status', 'published')->where('visibility', 'public')->where('is_anonymous', false)])
            ->addSelect(['followers_count' => DB::table('member_follows')
                ->selectRaw('COUNT(*)')->whereColumn('followed_id', 'users.id')])
            ->addSelect(['subscribed_plan' => DB::table('subscriptions')
                ->join('plan_prices', 'subscriptions.plan_price_id', '=', 'plan_prices.id')
                ->join('plans', 'plan_prices.plan_id', '=', 'plans.id')
                ->select('plans.code')
                ->whereColumn('subscriptions.user_id', 'users.id')
                ->whereIn('subscriptions.status', ['active', 'cancel_at_term_end'])
                ->where('subscriptions.starts_at', '<=', now())
                ->where('subscriptions.ends_at', '>', now())
                ->orderByDesc('subscriptions.ends_at')->limit(1)]);

        if (SetTemporaryMembership::enabled()) {
            $query->addSelect(['temporary_plan' => DB::table('temporary_memberships')
                ->select('plan_code')->whereColumn('user_id', 'users.id')->limit(1)]);
        }
        if ($viewerId) {
            $query->addSelect(['viewer_follows' => DB::table('member_follows')
                ->selectRaw('1')->whereColumn('followed_id', 'users.id')
                ->where('follower_id', $viewerId)->limit(1)]);
        }

        match ($sort) {
            'name' => $query->orderBy('users.name')->orderBy('users.id'),
            'followers' => $query->orderByDesc('followers_count')->orderByDesc('users.id'),
            default => $query->orderByDesc('users.created_at')->orderByDesc('users.id'),
        };

        $members = $query->paginate(12)->withQueryString();
        $members->through(static fn (User $member): array => [
            'id' => $member->id,
            'name' => $member->name,
            'profile' => [
                'role' => $member->profile?->role,
                'headline' => $member->profile?->headline,
                'industry' => $member->profile?->industry,
                'city' => $member->profile?->city,
                'country' => $member->profile?->country,
                'avatar_path' => $member->profile?->avatar_path,
            ],
            'plan' => in_array($member->temporary_plan ?? null, ['free', 'plus', 'pro'], true)
                ? $member->temporary_plan : ($member->subscribed_plan ?? 'free'),
            'followers_count' => (int) $member->followers_count,
            'contributions_count' => (int) $member->contributions_count,
            'is_following' => (bool) ($member->viewer_follows ?? false),
        ]);

        return Inertia::render('members/Directory', [
            'members' => $members,
            'search' => $search,
            'filters' => compact('role', 'industry', 'location', 'tab', 'sort'),
            'filterOptions' => $this->filterOptions(),
        ]);
    }

    /** Bounded distinct choices, cached briefly: no per-member queries or full-table hydration. */
    private function filterOptions(): array
    {
        $getOptions = static function (): array {
            $base = Profile::query()->where('visibility', 'public')
                ->whereHas('user', fn ($query) => $query->where('is_admin', false)->where('status', 'active')
                    ->when(config('pm-circle.email_verification_required'), fn ($query) => $query->whereNotNull('email_verified_at')));

            $roles = (clone $base)->whereNotNull('role')->where('role', '<>', '')
                ->distinct()->orderBy('role')->limit(100)->pluck('role')->all();
            $industries = (clone $base)->whereNotNull('industry')->where('industry', '<>', '')
                ->distinct()->orderBy('industry')->limit(100)->pluck('industry')->all();
            $locations = (clone $base)->where(fn ($query) => $query->whereNotNull('city')->orWhereNotNull('country'))
                ->select(['city', 'country'])->distinct()->orderBy('country')->orderBy('city')->limit(150)->get()
                ->map(fn (Profile $profile) => [
                    'value' => ($profile->city ?? '').'|'.($profile->country ?? ''),
                    'label' => implode(', ', array_filter([$profile->city, $profile->country])),
                ])->values()->all();

            return ['roles' => $roles, 'industries' => $industries, 'locations' => $locations];
        };

        return app()->environment('testing') ? $getOptions() : Cache::remember('pm_circle_public_member_filter_options_v1', 60, $getOptions);
    }

    public function show(Request $request, User $member): Response
    {
        abort_unless($member->is_admin !== true && $member->status === 'active', 404);
        if (config('pm-circle.email_verification_required')) {
            abort_unless($member->email_verified_at !== null, 404);
        }
        $viewer = $request->user()?->is_admin === true ? null : $request->user();
        $isOwnProfile = $viewer?->id === $member->id;
        $profileQuery = $member->profile();
        if (! $isOwnProfile) {
            $profileQuery->where('visibility', 'public');
        }
        $profile = $profileQuery->firstOrFail(['id', 'user_id', 'role', 'headline', 'bio']);

        if ($viewer && ! $isOwnProfile && $viewer->status === 'active' && ! $viewer->is_admin) {
            // Single indexed write per viewer/day. Guest and self views are never counted.
            DB::table('member_profile_views')->insertOrIgnore([
                'profile_user_id' => $member->id,
                'viewer_id' => $viewer->id,
                'viewed_on' => now()->toDateString(),
                'created_at' => now(),
            ]);
        }

        return Inertia::render('members/Show', [
            'member' => ['id' => $member->id, 'name' => $member->name, 'profile' => $profile],
            'isOwnProfile' => $isOwnProfile,
            'following' => $viewer ? DB::table('member_follows')->where('follower_id', $viewer->id)->where('followed_id', $member->id)->exists() : false,
            'posts' => $member->posts()->where('status', 'published')->where('visibility', 'public')->where('is_anonymous', false)
                ->when($viewer, fn ($query) => $query->whereNotExists(fn ($hidden) => $hidden->selectRaw('1')
                    ->from('post_hides')->whereColumn('post_hides.post_id', 'posts.id')
                    ->where('post_hides.user_id', $viewer->id)))
                ->withCount(['comments', 'reactions'])->latest('published_at')->limit(8)->get(['id', 'author_id', 'title', 'body', 'image_path', 'topic', 'published_at', 'ai_generated']),
        ]);
    }

    public function follow(Request $request, User $member)
    {
        abort_if($request->user()->id === $member->id, 422, 'You cannot follow yourself.');
        abort_unless($member->is_admin !== true && $member->status === 'active'
            && $member->profile()->where('visibility', 'public')->exists(), 404);
        DB::table('member_follows')->insertOrIgnore([
            'follower_id' => $request->user()->id, 'followed_id' => $member->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return back();
    }

    public function unfollow(Request $request, User $member)
    {
        DB::table('member_follows')->where('follower_id', $request->user()->id)->where('followed_id', $member->id)->delete();
        return back();
    }
}
