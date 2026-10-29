<?php

namespace Tests\Feature\Billing;

use App\Models\PlanPrice;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class PricingPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_pricing_page_receives_the_three_active_database_plans(): void
    {
        $this->seed(PlanSeeder::class);

        $this->get(route('pricing'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('public/Pricing')
            ->has('plans', 3)
            ->where('plans.0.code', 'free')
            ->where('plans.0.prices.0.amount_minor', 0)
            ->where('plans.1.code', 'plus')
            ->has('plans.1.prices', 4)
            ->where('plans.1.prices.0.amount_minor', 39900)
            ->where('plans.2.code', 'pro')
            ->where('plans.2.prices.0.amount_minor', 69900)
            ->etc());
    }

    public function test_pricing_page_uses_updated_catalog_amounts_instead_of_hard_coded_values(): void
    {
        $this->seed(PlanSeeder::class);
        PlanPrice::query()->whereHas('plan', fn ($query) => $query->where('code', 'plus'))
            ->where('months', 1)->update(['amount_minor' => 45900]);

        $this->get(route('pricing'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('public/Pricing')
            ->where('plans.1.prices.0.amount_minor', 45900)
            ->etc());
    }
}
