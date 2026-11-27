<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Billing\Actions\SetTemporaryMembership;
use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class MembershipValidityController extends Controller
{
    public function index(Request $request): Response
    {
        $data = $request->validate([
            'member_id' => ['nullable', 'integer', 'min:1'],
            'q' => ['nullable', 'string', 'min:2', 'max:80'],
        ]);
        $memberId = $data['member_id'] ?? null;
        $search = trim($data['q'] ?? '');

        return Inertia::render('admin/MembershipValidity', [
            // Lazy evaluation keeps member-only partial visits from reloading the catalog.
            'prices' => fn () => DB::table('plan_prices as price')->join('plans as plan', 'plan.id', '=', 'price.plan_id')
                ->whereIn('plan.code', ['plus', 'pro'])
                ->whereNotExists(fn ($query) => $query->selectRaw('1')->from('plan_prices as newer')
                    ->whereColumn('newer.plan_id', 'price.plan_id')->whereColumn('newer.months', 'price.months')
                    ->whereColumn('newer.version', '>', 'price.version'))
                ->orderBy('plan.code')->orderBy('price.months')
                ->get(['plan.code', 'price.months', 'price.amount_minor', 'price.currency', 'price.active']),
            'member' => fn () => $memberId ? $this->complimentaryMembers()->where('member.id', $memberId)
                ->first(['member.id', 'member.name', 'member.email', 'grant.plan_code', 'grant.months', 'grant.starts_at', 'grant.ends_at']) : null,
            'memberId' => $memberId,
            'memberMatches' => fn () => $this->searchMembers($search),
            'search' => $search,
            'signupPlans' => fn () => Plan::query()->whereIn('code', ['free', 'plus', 'pro'])->orderByRaw("CASE code WHEN 'free' THEN 0 WHEN 'plus' THEN 1 ELSE 2 END")
                ->get(['code', 'name', 'benefits', 'active', 'signup_visible', 'signup_badge']),
            'complimentaryEnabled' => SetTemporaryMembership::enabled(),
        ]);
    }

    private function complimentaryMembers(): \Illuminate\Database\Query\Builder
    {
        return DB::table('users as member')->join('temporary_memberships as grant', 'grant.user_id', '=', 'member.id')
            ->where('member.is_admin', false)->whereIn('grant.plan_code', ['plus', 'pro']);
    }

    private function searchMembers(string $search): array
    {
        if (mb_strlen($search) < 2) {
            return [];
        }

        // Escape literal wildcard characters; never interpolate user input into SQL.
        $needle = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($search)).'%';

        return $this->complimentaryMembers()
            ->where(function ($query) use ($needle): void {
                $query->whereRaw("LOWER(member.name) LIKE ? ESCAPE '!'", [$needle])
                    ->orWhereRaw("LOWER(member.email) LIKE ? ESCAPE '!'", [$needle]);
            })
            ->orderBy('member.name')->orderBy('member.id')->limit(20)
            ->get(['member.id', 'member.name', 'member.email', 'grant.plan_code', 'grant.ends_at'])->all();
    }

    public function saveSignupPlan(Request $request, string $plan): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:40'],
            'benefits' => ['present', 'array', 'max:12'],
            'benefits.*' => ['nullable', 'string', 'max:200'],
            'signup_badge' => ['nullable', 'string', 'max:40'],
            'signup_visible' => ['required', 'boolean'],
        ]);
        // Keep Free available as the fallback registration option. Plan codes and
        // entitlements remain unchanged; hiding a paid card affects signup only.
        DB::transaction(function () use ($plan, $data): void {
            $record = Plan::query()->where('code', $plan)->lockForUpdate()->firstOrFail();
            $record->update([
                'name' => $data['name'],
                'benefits' => array_values(array_filter(array_map(fn ($value) => trim((string) $value), $data['benefits']), fn ($value) => $value !== '')),
                'signup_badge' => $data['signup_badge'] ?? null,
                'signup_visible' => $plan === 'free' || (bool) $data['signup_visible'],
            ]);
        }, 3);
        Log::notice('Signup plan card updated.', ['actor_id' => $request->user()->id, 'plan' => $plan]);

        return back()->with('status', 'Signup plan saved. Existing membership terms are unchanged.');
    }

    public function saveDuration(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'plan' => ['required', Rule::in(['plus', 'pro'])],
            'months' => ['required', 'integer', 'min:1', 'max:60'],
            // Existing payment gateway accepts BDT minor units up to this ceiling.
            'amount_minor' => ['required', 'integer', 'min:1', 'max:100000000'],
            'active' => ['required', 'boolean'],
        ]);
        DB::transaction(function () use ($data): void {
            $plan = Plan::query()->where('code', $data['plan'])->lockForUpdate()->firstOrFail();
            $prices = $plan->prices()->where('months', $data['months']);
            $latest = (clone $prices)->orderByDesc('version')->first();
            if ($latest && (int) $latest->amount_minor === (int) $data['amount_minor'] && $latest->currency === 'BDT') {
                (clone $prices)->where('id', '!=', $latest->id)->where('active', true)->update(['active' => false]);
                $latest->update(['active' => (bool) $data['active']]);
            } else {
                (clone $prices)->where('active', true)->update(['active' => false]);
                $plan->prices()->create([
                    'months' => $data['months'], 'amount_minor' => $data['amount_minor'], 'currency' => 'BDT',
                    'version' => (int) ($latest?->version ?? 0) + 1, 'active' => (bool) $data['active'],
                ]);
            }
        }, 3);
        Log::notice('Membership duration catalog updated.', ['actor_id' => $request->user()->id, 'plan' => $data['plan'], 'months' => $data['months'], 'active' => $data['active']]);

        return back()->with('status', 'Signup duration saved. Existing membership terms are unchanged.');
    }

    public function updateGrant(Request $request, int $member): RedirectResponse
    {
        $data = $request->validate([
            'months' => ['required', 'integer', 'min:1', 'max:60'],
            'restart' => ['required', 'boolean'],
        ]);
        $term = DB::transaction(function () use ($member, $data): array {
            User::query()->whereKey($member)->where('is_admin', false)->lockForUpdate()->firstOrFail();
            $grant = DB::table('temporary_memberships')->where('user_id', $member)->whereIn('plan_code', ['plus', 'pro'])->first();
            abort_unless($grant, 404);
            if (! $grant->starts_at && ! $data['restart']) {
                throw ValidationException::withMessages(['restart' => 'Confirm a new activation date for this legacy grant.']);
            }
            $start = $data['restart'] ? now() : Carbon::parse($grant->starts_at);
            $end = $start->copy()->addMonthsNoOverflow((int) $data['months']);
            DB::table('temporary_memberships')->where('user_id', $member)->update([
                'months' => $data['months'], 'starts_at' => $start, 'ends_at' => $end, 'updated_at' => now(),
            ]);
            return ['previous_end' => $grant->ends_at, 'ends_at' => $end->toDateTimeString()];
        }, 3);
        Log::notice('Complimentary membership validity updated.', ['actor_id' => $request->user()->id, 'member_id' => $member, 'months' => $data['months'], ...$term]);

        return back()->with('status', 'Member validity updated.');
    }
}
