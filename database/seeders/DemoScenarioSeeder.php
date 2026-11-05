<?php

namespace Database\Seeders;

use App\Models\Scenario;
use Illuminate\Database\Seeder;

class DemoScenarioSeeder extends Seeder
{
    public function run(): void
    {
        Scenario::updateOrCreate(['slug' => 'a-late-change-a-fixed-deadline'], [
            'title' => 'A late change. A fixed deadline. What would you do?',
            'summary' => 'Your client requests a major change two weeks before launch. Your sponsor wants to say yes. Your team says delivery is at risk.',
            'situation' => "You are managing a software implementation project. Launch is two weeks away when the client requests a major reporting feature.\n\nYour sponsor says, 'Keep the client happy.' Your technical lead says the extra work will put the launch date at risk.",
            'known_facts' => [
                'Launch date is tied to a customer commitment.',
                'The new feature is outside the approved scope.',
                'The team has no spare capacity.',
                'No impact assessment has been completed.',
            ],
            'topics' => ['Scope & change', 'Stakeholder management'],
            'difficulty' => 'Intermediate',
            'focus' => 'Change control',
            'minutes' => 10,
            'status' => 'published',
            'published_at' => '2026-10-29 09:00:00',
            'ai_generated' => false,
        ]);

        Scenario::updateOrCreate(['slug' => 'your-sponsor-bypasses-change-control'], [
            'title' => 'Your sponsor bypasses change control',
            'summary' => 'A sponsor verbally promises extra features directly to the client without consulting the team or logging a formal CR.',
            'situation' => "During an executive dinner, your executive sponsor promised the client two additional modules for the next sprint.\n\nYou only find out when the client PM emails thanking you for accommodating the additions.",
            'known_facts' => [
                'Contract specifies formal change requests with cost impact.',
                'Sprint capacity is currently 100% allocated.',
                'Client is the company’s highest value strategic account.',
            ],
            'topics' => ['Change control', 'Governance'],
            'difficulty' => 'Advanced',
            'focus' => 'Governance',
            'minutes' => 10,
            'status' => 'published',
            'published_at' => '2026-10-20 10:00:00',
            'ai_generated' => false,
        ]);

        Scenario::updateOrCreate(['slug' => 'a-key-stakeholder-stops-responding'], [
            'title' => 'A key stakeholder stops responding',
            'summary' => 'Critical sign-offs are blocked because the finance lead has gone silent ahead of a hard gateway review.',
            'situation' => "Your gateway review is scheduled for Thursday. Finance approval is required before procurement can release funds.\n\nThe finance director hasn't replied to three emails or two calendar invites over the last 6 days.",
            'known_facts' => [
                'Procurement lead time is strictly 10 business days.',
                'Delaying gateway moves the go-live by at least one month.',
                'Finance team is currently closing quarterly audited statements.',
            ],
            'topics' => ['Stakeholder management', 'Communication'],
            'difficulty' => 'Intermediate',
            'focus' => 'Stakeholder management',
            'minutes' => 5,
            'status' => 'published',
            'published_at' => '2026-10-15 11:00:00',
            'ai_generated' => false,
        ]);

        Scenario::updateOrCreate(['slug' => 'the-team-flags-an-unrealistic-deadline'], [
            'title' => 'The team flags an unrealistic deadline',
            'summary' => 'Your engineers calculate the estimated backlog requires 12 weeks, but sales promised delivery in 6 weeks.',
            'situation' => "The technical leads finished sprint estimation and conclude that the minimum feature set requires 12 weeks of high-velocity development.\n\nHowever, the commercial contract signed by sales commits to full deployment in 6 weeks.",
            'known_facts' => [
                'Penalty clause triggers at day 45 of delay.',
                'Engineers are already working at full capacity.',
                'Architecture cannot easily be modularized without refactoring core APIs.',
            ],
            'topics' => ['Estimation & risk', 'Delivery'],
            'difficulty' => 'Intermediate',
            'focus' => 'Risk management',
            'minutes' => 10,
            'status' => 'published',
            'published_at' => '2026-10-10 14:00:00',
            'ai_generated' => false,
        ]);
    }
}
