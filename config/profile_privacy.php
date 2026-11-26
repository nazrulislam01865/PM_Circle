<?php

// One canonical server-side list for validation, storage, and the profile editor.
// Labels match the approved PM Circle privacy prototype.
return [
    'groups' => [
        [
            'title' => 'Basic details',
            'fields' => [
                ['key' => 'full_name', 'label' => 'Full name'],
                ['key' => 'professional_headline', 'label' => 'Professional headline'],
                ['key' => 'current_job_title', 'label' => 'Current job title'],
                ['key' => 'current_organisation', 'label' => 'Current organisation'],
                ['key' => 'industry', 'label' => 'Industry'],
                ['key' => 'country', 'label' => 'Country'],
                ['key' => 'city', 'label' => 'City'],
                ['key' => 'profile_photo_url', 'label' => 'Profile photo URL'],
                ['key' => 'cover_photo_url', 'label' => 'Cover photo URL'],
            ],
        ],
        [
            'title' => 'About & skills',
            'fields' => [
                ['key' => 'professional_summary', 'label' => 'Professional summary'],
                ['key' => 'core_skills', 'label' => 'Core skills & skill categories'],
                ['key' => 'tools_and_software', 'label' => 'Tools and software'],
                ['key' => 'delivery_methods', 'label' => 'Delivery methods'],
            ],
        ],
        [
            'title' => 'Professional sections',
            'fields' => [
                ['key' => 'experience', 'label' => 'Experience'],
                ['key' => 'research_work', 'label' => 'Research work'],
                ['key' => 'interests', 'label' => 'Interests'],
                ['key' => 'selected_projects', 'label' => 'Selected projects'],
                ['key' => 'education', 'label' => 'Education'],
                ['key' => 'certifications_and_licences', 'label' => 'Certifications & licences'],
                ['key' => 'courses_and_professional_development', 'label' => 'Courses & professional development'],
                ['key' => 'awards_and_honours', 'label' => 'Awards & honours'],
                ['key' => 'publications_and_speaking', 'label' => 'Publications & speaking'],
                ['key' => 'volunteering', 'label' => 'Volunteering'],
                ['key' => 'languages', 'label' => 'Languages'],
                ['key' => 'portfolio_and_links', 'label' => 'Portfolio & links'],
            ],
        ],
        [
            'title' => 'Career preferences',
            'fields' => [
                ['key' => 'availability', 'label' => 'Availability'],
                ['key' => 'target_roles', 'label' => 'Target roles'],
                ['key' => 'seniority', 'label' => 'Seniority'],
                ['key' => 'preferred_work_locations', 'label' => 'Preferred work locations'],
                ['key' => 'preferred_work_arrangement', 'label' => 'Preferred work arrangement'],
                ['key' => 'preferred_employment_type', 'label' => 'Preferred employment type'],
                ['key' => 'notice_period_or_earliest_start', 'label' => 'Notice period or earliest start'],
                ['key' => 'open_to_relocation', 'label' => 'Open to relocation'],
            ],
        ],
    ],
];
