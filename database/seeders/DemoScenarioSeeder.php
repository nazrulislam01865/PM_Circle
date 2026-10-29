<?php

namespace Database\Seeders;

use App\Models\Scenario;
use Illuminate\Database\Seeder;

class DemoScenarioSeeder extends Seeder
{
    public function run(): void
    {
        // Editorial scenario only; never fabricate human participation, AI scores or user counts.
        Scenario::updateOrCreate(['slug' => 'a-late-change-a-fixed-deadline'], [
            'title' => 'A late change. A fixed deadline. What would you do?',
            'summary' => 'Your client requests a major change two weeks before launch. Your sponsor wants to say yes. Your team says delivery is at risk.',
            'situation' => "You are managing a software implementation project. Launch is two weeks away when the client requests a major reporting feature.\n\nYour sponsor says, ‘Keep the client happy.’ Your technical lead says the extra work will put the launch date at risk.",
            'known_facts' => ['Launch date is tied to a customer commitment.', 'The new feature is outside the approved scope.', 'The team has no spare capacity.', 'No impact assessment has been completed.'],
            'topics' => ['Scope & change', 'Stakeholder management'],
            'difficulty' => 'Intermediate', 'focus' => 'Change control', 'minutes' => 10,
            'status' => 'published', 'published_at' => now(), 'ai_generated' => false,
        ]);
    }
}
