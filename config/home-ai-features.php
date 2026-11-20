<?php

/** Default public-homepage AI cards. Admin overrides are stored with the homepage record. */
return [
    'heading' => 'How AI helps you on PM Circle',
    'button_label' => 'Explore Plus plans',
    'button_url' => '/pricing',
    'cards' => [
        [
            'category' => 'Exam Simulator',
            'title' => 'Ask AI about any question',
            'description' => 'After your mock, ask follow-up questions in Question Review.',
            'illustration' => '/images/home/ai-features/exam-question-review.webp',
            'alt' => 'Question Review with an AI explanation of the correct option',
            'icon' => 'clipboard-check',
            'image' => '',
        ],
        [
            'category' => 'Daily Challenge',
            'title' => 'A new AI challenge every day',
            'description' => 'Get AI feedback on your response and improve your reasoning.',
            'illustration' => '/images/home/ai-features/daily-challenge-feedback.webp',
            'alt' => 'Daily challenge followed by a card showing AI feedback',
            'icon' => 'calendar-days',
            'image' => '',
        ],
        [
            'category' => 'Community Feed',
            'title' => 'AI helps keep the feed safe',
            'description' => 'AI checks every post. Admins make the final call.',
            'illustration' => '/images/home/ai-features/community-admin-review.webp',
            'alt' => 'AI-assisted community moderation with administrator review',
            'icon' => 'users-round',
            'image' => '',
        ],
        [
            'category' => 'Learn & Practice',
            'title' => 'Learn with AI support',
            'description' => 'Get AI guidance as you learn and practise.',
            'illustration' => '/images/home/ai-features/learn-with-ai.webp',
            'alt' => 'Learning and practice materials with an AI assistant',
            'icon' => 'book-open',
            'image' => '',
        ],
    ],
];
