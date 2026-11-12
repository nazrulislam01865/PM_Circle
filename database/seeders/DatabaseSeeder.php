<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([PlanSeeder::class, HomePageContentSeeder::class, HomepageMasterDataSeeder::class, SignupMasterDataSeeder::class]);
        if (app()->environment(['local', 'testing'])) {
            $this->call([LearningDemoSeeder::class, PmpExamQuestionSeeder::class]);
            $this->call([DemoScenarioSeeder::class, DemoProfileAndDiscussionsSeeder::class, DemoHomePageSeeder::class]);
        }
    }
}
