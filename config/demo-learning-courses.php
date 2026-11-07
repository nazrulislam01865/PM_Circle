<?php

/**
 * Demonstration catalog, deliberately independent of the live learning paths.
 * Edit or replace these entries when the real course publishing workflow exists.
 * "paid" is an access label, not a charge: Plus and Pro members enroll for free.
 */
return [
    'courses' => [
        ['slug' => 'pmp-exam-preparation', 'title' => 'PMP Exam Preparation (Complete Course)', 'summary' => 'Explore project delivery, people, processes and business environment topics.', 'category' => 'Project Management', 'level' => 'Intermediate', 'minutes' => 2100, 'thumbnail' => 1, 'accessTier' => 'paid',
            'overview' => 'An exam-focused study outline for project professionals preparing for the PMP certification. Explore people, process, and business environment domains using practical examples and scenario-based thinking.',
            'objectives' => [
                'Understand the PMP exam structure and key domains',
                'Apply project management concepts to real scenarios',
                'Compare Agile, Hybrid, and predictive approaches',
                'Evaluate stakeholder and project delivery decisions',
                'Strengthen your exam preparation strategy',
            ],
            // Public syllabus headings; actual study-note bodies remain enrollment-gated.
            'outline' => [
                ['title' => 'Course Introduction', 'topics' => ['Exam structure and approach', 'Understanding the study outline', 'Planning your preparation', 'How to use the sample study notes']],
                ['title' => 'Foundations of Project Management', 'topics' => ['Project value and outcomes', 'Project delivery approaches', 'Roles and responsibilities']],
                ['title' => 'People (Domain 1)', 'topics' => ['Leadership and collaboration', 'Stakeholder engagement', 'Resolving conflict', 'Communication decisions']],
                ['title' => 'Process (Domain 2)', 'topics' => ['Planning and delivery', 'Risk and change management', 'Quality and resource decisions', 'Monitoring project performance']],
                ['title' => 'Business Environment (Domain 3)', 'topics' => ['Compliance and governance', 'Realizing business value', 'Organizational change']],
                ['title' => 'Agile & Hybrid Approaches', 'topics' => ['Adaptive planning', 'Scrum collaboration', 'Selecting an appropriate approach']],
                ['title' => 'Exam Preparation & Scenario Thinking', 'topics' => ['Reading situational questions', 'Evaluating answer choices', 'Developing an exam study strategy']],
            ],
            'lessons' => [
            ['title' => 'Project management foundations', 'body' => 'Review the project lifecycle, business value and key responsibilities of a project manager. Compare predictive, agile and hybrid approaches in a sample project.'],
            ['title' => 'Stakeholder scenarios', 'body' => 'Identify stakeholders, evaluate their needs and practice documenting communication expectations. Consider how you would respond when expectations conflict.'],
        ]],
        ['slug' => 'agile-scrum-fundamentals', 'title' => 'Agile & Scrum Fundamentals', 'summary' => 'Understand agile thinking, Scrum events, and collaborative delivery.', 'category' => 'Agile & Scrum', 'level' => 'Beginner', 'minutes' => 390, 'thumbnail' => 2, 'accessTier' => 'free', 'lessons' => [
            ['title' => 'Agile values and principles', 'body' => 'Explore iterative delivery, feedback loops and the importance of adapting to change.'],
            ['title' => 'Scrum team and events', 'body' => 'Learn the responsibilities of a product owner, Scrum master and developers and the purpose of sprint events.'],
        ]],
        ['slug' => 'stakeholder-management', 'title' => 'Stakeholder Management for Project Success', 'summary' => 'Practice stakeholder mapping, alignment and communication planning.', 'category' => 'Stakeholder & Communication', 'level' => 'Intermediate', 'minutes' => 210, 'thumbnail' => 3, 'accessTier' => 'paid', 'lessons' => [
            ['title' => 'Stakeholder analysis', 'body' => 'Create a power–interest map and tailor engagement methods to different stakeholder groups.'],
            ['title' => 'Communication plans', 'body' => 'Build a simple communication matrix to define audience, channel, owner and cadence.'],
        ]],
        ['slug' => 'risk-management-projects', 'title' => 'Risk Management in Projects', 'summary' => 'Identify, assess, prioritize, and respond to project uncertainty.', 'category' => 'Risk & Change', 'level' => 'Intermediate', 'minutes' => 240, 'thumbnail' => 4, 'accessTier' => 'free', 'lessons' => [
            ['title' => 'Identify and assess risk', 'body' => 'Use a risk register to capture events, probability, impact, owners and response priorities.'],
            ['title' => 'Plan risk responses', 'body' => 'Compare avoidance, mitigation, transfer and acceptance with project-specific examples.'],
        ]],
        ['slug' => 'project-planning-scheduling', 'title' => 'Project Planning & Scheduling', 'summary' => 'Turn project scope into milestones, estimates and workable schedules.', 'category' => 'Planning & Scheduling', 'level' => 'Intermediate', 'minutes' => 480, 'thumbnail' => 5, 'accessTier' => 'paid', 'lessons' => [
            ['title' => 'Build a work breakdown structure', 'body' => 'Decompose a sample project into deliverables and work packages before creating the schedule.'],
            ['title' => 'Estimate and sequence', 'body' => 'Explore dependencies, duration estimates, the critical path and realistic milestones.'],
        ]],
        ['slug' => 'pmp-exam-simulator-introduction', 'title' => 'PMP Exam Simulator Introduction', 'summary' => 'Explore the structure of scenario-based project management questions.', 'category' => 'PMP Certification', 'level' => 'Advanced', 'minutes' => 300, 'thumbnail' => 6, 'accessTier' => 'paid', 'lessons' => [
            ['title' => 'Reading scenario questions', 'body' => 'Identify the actual decision being tested and distinguish relevant facts from distractors.'],
            ['title' => 'Reviewing explanations', 'body' => 'Use explanations to understand why one response fits a project situation better than others. This demo does not provide an official certification exam.'],
        ]],
        ['slug' => 'pm-career-foundations', 'title' => 'Project Manager Career Foundations', 'summary' => 'Discover common project roles and build an actionable learning plan.', 'category' => 'Leadership & Strategy', 'level' => 'Beginner', 'minutes' => 900, 'thumbnail' => 7, 'accessTier' => 'free', 'lessons' => [
            ['title' => 'Project roles and responsibilities', 'body' => 'Compare the day-to-day work of a coordinator, project manager and program leader.'],
            ['title' => 'Create a growth plan', 'body' => 'Identify current skills, next steps and practical opportunities to demonstrate project experience.'],
        ]],
        ['slug' => 'leadership-for-project-managers', 'title' => 'Leadership for Project Managers', 'summary' => 'Build facilitation, conflict management and team leadership skills.', 'category' => 'Leadership & Strategy', 'level' => 'Intermediate', 'minutes' => 360, 'thumbnail' => 8, 'accessTier' => 'paid', 'lessons' => [
            ['title' => 'Lead without direct authority', 'body' => 'Practice influencing through clear outcomes, trust and shared accountability.'],
            ['title' => 'Manage team conflict', 'body' => 'Use active listening and collaborative problem solving to address competing priorities.'],
        ]],
        ['slug' => 'change-control-essentials', 'title' => 'Change Control Essentials', 'summary' => 'Assess change requests and communicate their effects before approval.', 'category' => 'Risk & Change', 'level' => 'Beginner', 'minutes' => 140, 'thumbnail' => 4, 'accessTier' => 'free', 'lessons' => [
            ['title' => 'Capture a change request', 'body' => 'Record the request, reason, desired outcome and affected deliverables.'],
            ['title' => 'Evaluate trade-offs', 'body' => 'Assess scope, schedule, budget and stakeholder impacts before recommending a decision.'],
        ]],
        ['slug' => 'project-communication-essentials', 'title' => 'Project Communication Essentials', 'summary' => 'Write concise project updates and keep stakeholders informed.', 'category' => 'Stakeholder & Communication', 'level' => 'Beginner', 'minutes' => 110, 'thumbnail' => 3, 'accessTier' => 'free', 'lessons' => [
            ['title' => 'Effective status reporting', 'body' => 'Prepare a status update that highlights progress, risks, decisions and next actions.'],
            ['title' => 'Meeting follow-up', 'body' => 'Capture decisions, owners and due dates so that meetings lead to action.'],
        ]],
        ['slug' => 'resource-planning', 'title' => 'Resource Planning & Capacity', 'summary' => 'Estimate team capacity and resolve competing assignments.', 'category' => 'Planning & Scheduling', 'level' => 'Advanced', 'minutes' => 720, 'thumbnail' => 5, 'accessTier' => 'paid', 'lessons' => [
            ['title' => 'Build a capacity view', 'body' => 'Compare demand with available team time and identify over-allocation.'],
            ['title' => 'Balance the schedule', 'body' => 'Practice negotiating priorities and adjusting a schedule around realistic constraints.'],
        ]],
        ['slug' => 'scrum-team-collaboration', 'title' => 'Scrum Team Collaboration', 'summary' => 'Strengthen team collaboration through ceremonies and feedback.', 'category' => 'Agile & Scrum', 'level' => 'Intermediate', 'minutes' => 180, 'thumbnail' => 2, 'accessTier' => 'free', 'lessons' => [
            ['title' => 'Facilitate sprint planning', 'body' => 'Define a sprint goal and discuss how the team can forecast realistic work.'],
            ['title' => 'Retrospectives and improvement', 'body' => 'Turn observations into small, measurable changes for the next sprint.'],
        ]],
    ],
];
