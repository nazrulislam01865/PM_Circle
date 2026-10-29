<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(PlanSeeder::class);
        if (app()->environment(['local', 'testing'])) {
            $this->call(LearningDemoSeeder::class);
            $this->call([DemoScenarioSeeder::class, DemoCommunitySeeder::class, DemoDashboardSeeder::class]);
        }
    }
}
