<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $catalog = [
            'free' => ['Free', [1 => 0], ['Community discussions and learning profile', 'Sample questions and simulations']],
            'plus' => ['Plus', [1 => 39900, 3 => 105000, 6 => 180000, 12 => 300000], ['Premium lessons and full exam practice', 'Project simulations and progress tracking', 'AI feedback with a monthly allowance']],
            'pro' => ['Pro', [1 => 69900], ['Everything in Plus', 'Advanced simulations and a higher AI allowance', 'AI resume tools and interview practice']],
        ];
        foreach ($catalog as $code => [$name, $prices, $benefits]) {
            $plan = Plan::updateOrCreate(['code' => $code], ['name' => $name, 'active' => true, 'benefits' => $benefits]);
            foreach ($prices as $months => $amountMinor) {
                $plan->prices()->updateOrCreate(['months' => $months, 'version' => 1], ['amount_minor' => $amountMinor, 'currency' => 'BDT', 'active' => true]);
            }
        }
    }
}
