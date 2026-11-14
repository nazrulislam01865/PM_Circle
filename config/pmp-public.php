<?php

// Approved default content. Overrides are stored under one home_page_contents key.
return [
    'sections' => array_fill_keys(['hero', 'benefits', 'sample', 'ai', 'plans', 'faq', 'video', 'testimonials', 'footer'], true),
    'hero' => [
        'title' => 'Prepare for the PMP® exam',
        'description' => 'Practice with 3,000+ scenario-based questions, timed mock exams and AI study help.',
        'image' => '/images/exam/public/pmp-hero-people.webp',
        'primary_label' => 'Compare plans',
        'secondary_label' => 'Try a sample question',
    ],
    'benefits' => [
        'heading' => 'What you get with PM Circle',
        'cards' => [
            ['title' => 'Exam-like practice', 'description' => 'Practice by exam domain and topic with realistic, scenario-based questions from supported exam languages.', 'icon' => 'clipboard-check', 'icon_image' => ''],
            ['title' => 'Daily PM Challenge', 'description' => 'Respond to a daily scenario. Get AI feedback on your comment and see how others approached the same decision.', 'icon' => 'calendar-days', 'icon_image' => ''],
            ['title' => 'PM Circle Community', 'description' => 'Post questions, reply to discussions and share what you learn with other project managers.', 'icon' => 'users-round', 'icon_image' => ''],
            ['title' => 'Learn & Practice', 'description' => 'Explore PMP preparation and courses from project management basics to more advanced topics.', 'icon' => 'book-open', 'icon_image' => ''],
        ],
    ],
    'sample' => [
        'heading' => 'Try a sample question',
        'description' => 'Answer a real exam-style question to see how it works.',
        'icon_image' => '',
        // Reserved for approved question selection. No question-bank fetch is performed.
        'question_id' => null,
    ],
    'ai' => [
        'heading' => 'Get help with the questions you miss',
        'description' => 'Review your results, find weaker topics, and get clear explanations with AI support.',
        'icon_image' => '',
        'cards' => [
            ['title' => 'AI question review', 'description' => 'Understand the reasoning behind the correct option with a clear explanation.', 'icon' => 'bot', 'icon_image' => ''],
            ['title' => 'Find weaker topics', 'description' => 'Identify knowledge gaps and focus on the topics that need more attention.', 'icon' => 'file-search', 'icon_image' => ''],
            ['title' => 'Learning recommendations', 'description' => 'Discover the next concepts to review as you prepare for the exam.', 'icon' => 'book-open', 'icon_image' => ''],
            ['title' => 'Personal study guidance', 'description' => 'Explore how AI-supported feedback can help structure your study plan.', 'icon' => 'sparkles', 'icon_image' => ''],
        ],
    ],
    'plans' => [
        'heading' => 'Choose your simulator plan',
        'description' => 'Try the free preview, then choose an access period that fits your exam date. Paid plans include the same core simulator tools.',
        'icon_image' => '',
        'first_column' => 'What you get',
        'columns' => [
            ['title' => 'Free Preview', 'subtitle' => '', 'action' => 'Try free'],
            ['title' => '30-Day Access', 'subtitle' => '', 'action' => 'Choose 30 days'],
            ['title' => '90-Day Access', 'subtitle' => 'Recommended', 'action' => 'Choose 90 days'],
            ['title' => '180-Day Access', 'subtitle' => '', 'action' => 'Choose 180 days'],
        ],
        'rows' => [
            ['label' => 'Proposed price', 'type' => 'text', 'values' => ['$0', "$8\n≈ ৳1,000", "$16\n≈ ৳2,000", "$24\n≈ ৳3,000"]],
            ['label' => 'Scenario questions', 'type' => 'text', 'values' => ['Sample set', '3,000+', '3,000+', '3,000+']],
            ['label' => 'Timed mock exams', 'type' => 'text', 'values' => ['Short preview', 'Full mocks', 'Full mocks', 'Full mocks']],
            ['label' => 'AI question help', 'type' => 'checkbox', 'values' => [false, true, true, true]],
            ['label' => 'Community and Daily Challenge', 'type' => 'checkbox', 'values' => [true, true, true, true]],
        ],
        'price_note' => 'Illustrative prices, not an active checkout offer. USD via Stripe. Bangladesh payments in BDT via SSLCOMMERZ, subject to availability. BDT amounts are estimates.',
        'checkout_note' => 'Choose a plan, create an account or log in, then continue to checkout when the simulator plans become available.',
    ],
    'faq' => [
        'heading' => 'Frequently asked questions',
        'items' => [
            ['question' => 'Can I try the simulator before paying?', 'answer' => 'Yes. The public sample question is available without logging in. Full exam attempts require an eligible membership.'],
            ['question' => 'What changes with a longer plan?', 'answer' => 'The proposed access periods differ in duration. Final availability and pricing are subject to confirmation.'],
            ['question' => 'When can I ask AI for help?', 'answer' => 'AI assistance is illustrated in this preview. Live AI assistance is not activated by the preview.'],
        ],
    ],
    'video' => [
        'heading' => 'Learner video stories',
        'video_url' => 'https://videos.pexels.com/video-files/5940726/5940726-hd_1920_1080_25fps.mp4',
        'feedback_heading' => 'Featured learner feedback',
        'points' => [
            ['title' => 'Timed mocks', 'description' => 'Build exam readiness with realistic, timed practice.', 'icon' => 'calendar-days', 'icon_image' => ''],
            ['title' => 'Answer review', 'description' => 'Understand why answers are right or wrong.', 'icon' => 'file-search', 'icon_image' => ''],
            ['title' => 'Community', 'description' => 'Learn from discussions and the experience of others.', 'icon' => 'users-round', 'icon_image' => ''],
        ],
    ],
    'testimonials' => [
        'heading' => 'What learners say',
        'items' => [
            ['name' => 'Learner name', 'role' => 'Project Manager', 'quote' => 'Add an approved learner quote about PM Circle or the exam simulator.', 'image' => '/images/exam/public/learner-avatar-sample.webp'],
            ['name' => 'Learner name', 'role' => 'Project Manager', 'quote' => 'Approved learner feedback will appear here when it is available.', 'image' => '/images/exam/public/learner-avatar-sample.webp'],
            ['name' => 'Learner name', 'role' => 'Project Manager', 'quote' => 'Learner testimonials will be published here after review and approval.', 'image' => '/images/exam/public/learner-avatar-sample.webp'],
        ],
    ],
    'footer' => [
        'description' => 'Learn, practice and grow with other project professionals.',
        'explore_heading' => 'Explore',
        'support_heading' => 'Support',
        'newsletter_heading' => 'Stay in the loop',
        'newsletter_placeholder' => 'Enter your email',
        'newsletter_button' => 'Subscribe',
        'payment_usd' => 'Stripe · USD',
        'payment_bdt' => 'SSLCOMMERZ · BDT',
        'explore_links' => [
            ['label' => 'Daily Challenge', 'href' => '/daily-challenge'],
            ['label' => 'Community', 'href' => '/community'],
            ['label' => 'Learn & Practice', 'href' => '/learning'],
            ['label' => 'Exam Simulator', 'href' => '/exam-simulator/pmp'],
        ],
        'support_links' => [
            ['label' => 'Help Center', 'href' => '/help-center'],
            ['label' => 'Contact', 'href' => '/contact'],
            ['label' => 'Privacy', 'href' => '/privacy'],
            ['label' => 'Terms', 'href' => '/terms'],
        ],
        'social' => [
            'linkedin' => 'https://www.linkedin.com/', 'facebook' => 'https://www.facebook.com/',
            'instagram' => 'https://www.instagram.com/', 'youtube' => 'https://www.youtube.com/',
        ],
        'social_icons' => ['linkedin' => '', 'facebook' => '', 'instagram' => '', 'youtube' => ''],
        'legal_notice' => 'PMI® and PMP® are registered marks of Project Management Institute, Inc. CSM® is a registered mark of Scrum Alliance, Inc. BABOK® is a registered mark of International Institute of Business Analysis (IIBA®).',
        'disclaimer' => 'PM Circle provides independent study and exam preparation resources. Payment methods and plan prices on this preview are illustrative.',
    ],
];
