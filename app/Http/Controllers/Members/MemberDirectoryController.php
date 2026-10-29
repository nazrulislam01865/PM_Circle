<?php

namespace App\Http\Controllers\Members;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class MemberDirectoryController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        abort_if(mb_strlen($search) > 80, 422, 'Search is too long.');

        $members = User::query()
            ->where('status', 'active')
            ->whereHas('profile', fn ($query) => $query->where('visibility', 'public'))
            ->when(config('pm-circle.email_verification_required'), fn ($query) => $query->whereNotNull('email_verified_at'))
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(name) LIKE ?', ['%'.mb_strtolower(addcslashes($search, '%_\\')).'%'])
                    ->orWhereHas('profile', fn ($profile) => $profile->whereRaw('LOWER(role) LIKE ?', ['%'.mb_strtolower(addcslashes($search, '%_\\')).'%']));
            }))
            ->with(['profile' => fn ($query) => $query->select('id', 'user_id', 'role', 'headline', 'bio', 'visibility')])
            ->select('id', 'name')
            ->orderBy('name')->paginate(12)->withQueryString();

        return Inertia::render('members/Directory', ['members' => $members, 'search' => $search]);
    }

    public function show(Request $request, User $member): Response
    {
        abort_unless($member->status === 'active', 404);
        if (config('pm-circle.email_verification_required')) {
            abort_unless($member->email_verified_at !== null, 404);
        }
        $profile = $member->profile()->where('visibility', 'public')->firstOrFail(['id', 'user_id', 'role', 'headline', 'bio']);
        $viewer = $request->user();

        return Inertia::render('members/Show', [
            'member' => ['id' => $member->id, 'name' => $member->name, 'profile' => $profile],
            'isOwnProfile' => $viewer?->id === $member->id,
            'following' => $viewer ? DB::table('member_follows')->where('follower_id', $viewer->id)->where('followed_id', $member->id)->exists() : false,
            'posts' => $member->posts()->where('status', 'published')->where('visibility', 'public')
                ->withCount(['comments', 'reactions'])->latest('published_at')->limit(8)->get(['id', 'author_id', 'title', 'body', 'topic', 'published_at', 'ai_generated']),
        ]);
    }

    public function follow(Request $request, User $member)
    {
        abort_if($request->user()->id === $member->id, 422, 'You cannot follow yourself.');
        abort_unless($member->status === 'active' && $member->profile()->where('visibility', 'public')->exists(), 404);
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
