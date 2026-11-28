<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $catalog = [
            'free' => ['Free', [1 => 0], ['Community, professional profile and résumé builder', 'Free courses and sample exam questions']],
            'plus' => ['Plus', [1 => 39900, 3 => 105000, 6 => 180000, 12 => 300000], ['Free and Plus courses, standard exam practice', 'Anonymous posting, badges and insights', 'AI résumé section suggestions and 5 or 10 interview questions']],
            'pro' => ['Pro', [1 => 69900], ['Everything in Plus', 'Pro courses and advanced exam practice', 'Advanced résumé analysis and up to 20 interview questions']],
        ];
        foreach ($catalog as $code => [$name, $prices, $benefits]) {
            // Only fill missing catalog rows. Never reset administrator-managed
            // prices, visibility, benefits, or active states during a repair.
            $plan = Plan::firstOrCreate(['code' => $code], ['name' => $name, 'active' => true, 'benefits' => $benefits,
                'signup_badge' => match ($code) { 'plus' => 'Recommended', 'pro' => 'Suggested plan', default => null }]);
            foreach ($prices as $months => $amountMinor) {
                $plan->prices()->firstOrCreate(['months' => $months, 'version' => 1], ['amount_minor' => $amountMinor, 'currency' => 'BDT', 'active' => true]);
            }
        }
    }
}
