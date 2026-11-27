<?php

namespace App\Http\Controllers\Members;

use App\Domain\Billing\Actions\SetTemporaryMembership;
use App\Http\Controllers\Controller;
use App\Domain\Community\Queries\FeedQuery;
use App\Domain\Identity\Services\MemberProfileOverview;
use App\Domain\Identity\Services\MemberProfileAccess;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use App\Domain\Identity\Services\ProfileFieldPrivacy;
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
            ->select(['users.id', 'users.name', 'users.created_at', 'users.account_preferences'])
            ->with(['profile' => fn ($query) => $query->select('id', 'user_id', 'role', 'headline', 'industry', 'city', 'country', 'avatar_path', 'visibility', 'field_visibility')])
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
            $query->addSelect(['temporary_plan' => \App\Domain\Billing\Queries\CurrentMemberPlan::activeComplimentaryGrants()
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
        $members->through(fn (User $member): array => [
            'id' => $member->id,
            'name' => $member->profile && ProfileFieldPrivacy::visible($member->profile, 'full_name', $viewer, $member->id)
                ? $member->name : 'PM Circle member',
            'profile' => [
                'role' => $member->profile && ProfileFieldPrivacy::visible($member->profile, 'current_job_title', $viewer, $member->id) ? $member->profile->role : null,
                'headline' => $member->profile && ProfileFieldPrivacy::visible($member->profile, 'professional_headline', $viewer, $member->id) ? $member->profile->headline : null,
                'industry' => $member->profile && ProfileFieldPrivacy::visible($member->profile, 'industry', $viewer, $member->id) ? $member->profile->industry : null,
                'city' => $member->profile && ProfileFieldPrivacy::visible($member->profile, 'city', $viewer, $member->id) ? $member->profile->city : null,
                'country' => $member->profile && ProfileFieldPrivacy::visible($member->profile, 'country', $viewer, $member->id) ? $member->profile->country : null,
                'avatar_path' => $member->profile && ProfileFieldPrivacy::visible($member->profile, 'profile_photo_url', $viewer, $member->id) ? $member->profile->avatar_path : null,
            ],
            'plan' => in_array($member->temporary_plan ?? null, ['free', 'plus', 'pro'], true)
                ? $member->temporary_plan : ($member->subscribed_plan ?? 'free'),
            'followers_count' => (int) $member->followers_count,
            'contributions_count' => (int) $member->contributions_count,
            'is_following' => (bool) ($member->viewer_follows ?? false),
            'can_follow' => ($member->account_preferences['follow'] ?? 'Members only') !== 'No one',
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

    public function show(Request $request, string $member, FeedQuery $feed, MemberProfileOverview $overview): Response|HttpResponse
    {
        // Resolve inside the controller so even a missing account receives the shared Inertia layout.
        $id = filter_var($member, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $member = $id === false ? null : User::query()->find($id);
        $viewer = $request->user()?->is_admin === true ? null : $request->user();
        $member?->load(['profile:id,user_id,role,headline,bio,about,field_visibility,visibility,industry,country,city,skills,avatar_path,cover_photo_path,open_to_opportunities,languages,linkedin_url,editor_details']);
        if (! MemberProfileAccess::allows($member, $viewer)) {
            abort_if($request->expectsJson(), 404);

            return Inertia::render('members/Unavailable')->toResponse($request)->setStatusCode(404);
        }
        $isOwnProfile = $viewer?->id === $member->id;
        $profile = $member->profile;
        $filters = $request->validate(['tab' => ['nullable', 'in:overview,posts'], 'cursor' => ['nullable', 'string', 'max:4096']]);
        $tab = $filters['tab'] ?? 'overview';

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
            'member' => [
                'id' => $member->id,
                'name' => ProfileFieldPrivacy::visible($profile, 'full_name', $viewer, $member->id) ? $member->name : 'PM Circle member',
                'profile' => [
                    'role' => ProfileFieldPrivacy::visible($profile, 'current_job_title', $viewer, $member->id) ? $profile->role : null,
                    'headline' => ProfileFieldPrivacy::visible($profile, 'professional_headline', $viewer, $member->id) ? $profile->headline : null,
                    'bio' => ProfileFieldPrivacy::visible($profile, 'professional_summary', $viewer, $member->id) ? $profile->bio : null,
                ],
            ],
            'isOwnProfile' => $isOwnProfile,
            'following' => $viewer ? DB::table('member_follows')->where('follower_id', $viewer->id)->where('followed_id', $member->id)->exists() : false,
            'overview' => $overview->forMember($member, $profile, $viewer, $tab === 'overview'),
            'activeTab' => $tab,
            'canFollow' => $profile->visibility === 'public' && ($member->account_preferences['follow'] ?? 'Members only') !== 'No one',
            'canInteract' => in_array('members_only', ProfileFieldPrivacy::profileAudiences($viewer), true),
            'posts' => $feed->page('all', 'All', null, $viewer, $tab === 'posts' ? ($filters['cursor'] ?? null) : null, false, $member->id),
        ]);
    }

    public function follow(Request $request, User $member)
    {
        abort_if($request->user()->id === $member->id, 422, 'You cannot follow yourself.');
        $inserted = DB::transaction(function () use ($request, $member) {
            $target = User::query()->whereKey($member->id)->lockForUpdate()->firstOrFail();
            abort_unless($target->is_admin !== true && $target->status === 'active' && $target->hasVerifiedEmail()
                && $target->profile()->where('visibility', 'public')->exists(), 404);
            abort_if(($target->account_preferences['follow'] ?? 'Members only') === 'No one', 403, 'This member is not accepting new followers.');
            return DB::table('member_follows')->insertOrIgnore([
                'follower_id' => $request->user()->id, 'followed_id' => $target->id,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }, 3);
        if ($inserted) {
            app(\App\Domain\Notifications\ActivityNotifier::class)->forFollow($request->user(), $member);
        }
        return $request->expectsJson() ? response()->json(['following' => true]) : back();
    }

    public function unfollow(Request $request, User $member)
    {
        DB::table('member_follows')->where('follower_id', $request->user()->id)->where('followed_id', $member->id)->delete();
        return $request->expectsJson() ? response()->json(['following' => false]) : back();
    }
}
