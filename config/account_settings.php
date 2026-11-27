<?php

// Account settings catalog. The same definitions drive rendering and the preference allowlist.
return json_decode(<<<'JSON'
[
    [
        "Account",
        "user",
        "Contact details and how PM Circle displays information.",
        [
            [
                "Personal details",
                [
                    {
                        "id": "name",
                        "name": "Display name",
                        "help": "Used on your profile and community posts.",
                        "value": "",
                        "type": "text",
                        "mode": "profile"
                    },
                    {
                        "id": "email",
                        "name": "Email address",
                        "help": "Your current sign-in email. Change it through Edit profile.",
                        "value": "",
                        "type": "email",
                        "mode": "readonly",
                        "href": "/settings/profile?tab=edit"
                    },
                    {
                        "id": "phone",
                        "name": "Phone number",
                        "help": "Your private contact number. An existing number must remain valid.",
                        "value": "",
                        "type": "tel",
                        "mode": "profile"
                    }
                ]
            ],
            [
                "Regional preferences",
                [
                    {
                        "id": "language",
                        "name": "Preferred language",
                        "help": "Formats notification dates in your preferred language. Content and interface translations are not provided.",
                        "value": "English",
                        "choices": [
                            "English",
                            "বাংলা"
                        ],
                        "type": "select",
                        "mode": "preference"
                    },
                    {
                        "id": "timezone",
                        "name": "Time zone",
                        "help": "Used for notification timestamps, quiet hours and email digest scheduling.",
                        "value": "Asia/Dhaka",
                        "choices": [
                            "Asia/Dhaka",
                            "Asia/Kolkata",
                            "Asia/Dubai",
                            "Europe/London",
                            "UTC"
                        ],
                        "type": "select",
                        "mode": "preference"
                    },
                    {
                        "id": "clock",
                        "name": "Time format",
                        "help": "Choose the 12-hour or 24-hour format for notification timestamps.",
                        "value": "12-hour",
                        "choices": [
                            "12-hour",
                            "24-hour"
                        ],
                        "type": "select",
                        "mode": "preference"
                    }
                ]
            ],
            [
                "Appearance & accessibility",
                [
                    {
                        "id": "theme",
                        "name": "Appearance",
                        "help": "Choose Light, Dark or System for the entire website on this browser.",
                        "value": "Light",
                        "choices": [
                            "Light",
                            "Dark",
                            "System"
                        ],
                        "type": "select",
                        "mode": "theme"
                    },
                    {
                        "id": "motion",
                        "name": "Reduce motion",
                        "help": "Reduce animation in this settings workspace.",
                        "value": false,
                        "type": "toggle",
                        "mode": "preference"
                    },
                    {
                        "id": "size",
                        "name": "Text size",
                        "help": "Adjust the text size of this settings workspace.",
                        "value": "Default",
                        "choices": [
                            "Default",
                            "Large"
                        ],
                        "type": "select",
                        "mode": "preference"
                    }
                ]
            ]
        ]
    ],
    [
        "Security",
        "lock",
        "Manage sign-in protection and active sessions.",
        [
            [
                "Sign-in protection",
                [
                    {
                        "id": "password",
                        "name": "Password",
                        "help": "Change your password using the secure password form.",
                        "label": "Change password",
                        "danger": false,
                        "type": "action",
                        "mode": "link",
                        "href": "/settings/security"
                    },
                    {
                        "id": "mfa",
                        "name": "Two-step verification",
                        "help": "Configure two-step verification in Security.",
                        "value": false,
                        "type": "action",
                        "mode": "link",
                        "href": "/settings/security",
                        "label": "Manage verification"
                    },
                    {
                        "id": "recovery",
                        "name": "Recovery codes",
                        "help": "Manage recovery codes after confirming your identity.",
                        "label": "Manage codes",
                        "danger": false,
                        "type": "action",
                        "mode": "link",
                        "href": "/settings/security"
                    }
                ]
            ],
            [
                "Sessions",
                [
                    {
                        "id": "currentDevice",
                        "name": "Current device",
                        "help": "View information about your current signed-in browser.",
                        "label": "View session",
                        "danger": false,
                        "type": "action",
                        "mode": "action"
                    },
                    {
                        "id": "otherDevice",
                        "name": "Other signed-in devices",
                        "help": "Confirm your password to sign out other browser sessions. Your current session stays signed in.",
                        "label": "Sign out other devices",
                        "danger": false,
                        "type": "action",
                        "mode": "action"
                    }
                ]
            ]
        ]
    ],
    [
        "Privacy",
        "shield",
        "Choose who can see each field and section of your profile.",
        []
    ],
    [
        "Notifications",
        "bell",
        "Choose which updates you receive and where.",
        [
            [
                "Delivery channels",
                [
                    {
                        "id": "inapp",
                        "name": "In-app notifications",
                        "help": "Receive optional activity updates in the notification centre.",
                        "type": "toggle",
                        "mode": "preference",
                        "value": true
                    },
                    {
                        "id": "mail",
                        "name": "Email notifications",
                        "help": "Receive optional activity updates by email using your selected delivery frequency.",
                        "type": "toggle",
                        "mode": "preference",
                        "value": false
                    },
                    {
                        "id": "push",
                        "name": "Browser push notifications",
                        "help": "Background browser push requires a push service and device subscriptions; it is not configured.",
                        "type": "toggle",
                        "mode": "unavailable"
                    },
                    {
                        "id": "digest",
                        "name": "Email digest frequency",
                        "help": "Choose individual updates (normally within a minute), a daily digest at 08:00, a weekly digest on Monday at 08:00, or Off. Uses your account time zone; changes apply to new activity.",
                        "choices": [
                            "Instant",
                            "Daily",
                            "Weekly",
                            "Off"
                        ],
                        "type": "select",
                        "mode": "preference",
                        "value": "Instant"
                    }
                ]
            ],
            [
                "Notification topics",
                [
                    {
                        "id": "learnNotify",
                        "name": "Course completion updates",
                        "help": "Receive a notification when you complete a course.",
                        "type": "toggle",
                        "mode": "preference",
                        "value": false
                    },
                    {
                        "id": "examNotify",
                        "name": "PMP simulator results",
                        "help": "Receive a notification when your PMP exam result is ready.",
                        "type": "toggle",
                        "mode": "preference",
                        "value": false
                    },
                    {
                        "id": "challengeNotify",
                        "name": "Daily challenge",
                        "help": "Receive notifications for challenge replies and reactions.",
                        "type": "toggle",
                        "mode": "preference",
                        "value": true
                    },
                    {
                        "id": "communityNotify",
                        "name": "Community activity",
                        "help": "Receive notifications for community follows, comments, replies and reactions.",
                        "type": "toggle",
                        "mode": "preference",
                        "value": true
                    },
                    {
                        "id": "eventNotify",
                        "name": "Event registration updates",
                        "help": "Receive an update when your member event registration is recorded.",
                        "type": "toggle",
                        "mode": "preference",
                        "value": false
                    },
                    {
                        "id": "careerNotify",
                        "name": "Career Trends and opportunities",
                        "help": "No optional delivery workflow is currently available for this topic.",
                        "type": "toggle",
                        "mode": "unavailable"
                    },
                    {
                        "id": "usageNotify",
                        "name": "AI credit and token limit alerts",
                        "help": "Receive an alert when a centralized AI request is blocked by insufficient credits or PMP tokens (at most once per reason per day).",
                        "type": "toggle",
                        "mode": "preference",
                        "value": false
                    },
                    {
                        "id": "newsletter",
                        "name": "News and offers",
                        "help": "No optional delivery workflow is currently available for this topic.",
                        "type": "toggle",
                        "mode": "unavailable"
                    }
                ]
            ],
            [
                "Quiet hours",
                [
                    {
                        "id": "quiet",
                        "name": "Pause optional alerts during quiet hours",
                        "help": "Skip optional alerts during quiet hours. Security and billing notices are unaffected. Identical start and end times disable the quiet interval.",
                        "type": "toggle",
                        "mode": "preference",
                        "value": false
                    },
                    {
                        "id": "quietStart",
                        "name": "Start time",
                        "help": "Uses your saved account time zone. Alerts during quiet hours are skipped, not queued.",
                        "type": "time",
                        "mode": "preference",
                        "value": "22:00"
                    },
                    {
                        "id": "quietEnd",
                        "name": "End time",
                        "help": "Uses your saved account time zone. Alerts during quiet hours are skipped, not queued.",
                        "type": "time",
                        "mode": "preference",
                        "value": "07:00"
                    }
                ]
            ]
        ]
    ],
    [
        "Learning & practice",
        "book",
        "Set defaults for courses, simulators, and interview practice.",
        [
            [
                "Learning goals",
                [
                    {
                        "id": "goal",
                        "name": "Weekly study target",
                        "help": "Show your personal weekly study target in My Learning. This is a target, not measured study time.",
                        "value": "3 hours",
                        "choices": [
                            "1 hour",
                            "2 hours",
                            "3 hours",
                            "5 hours",
                            "10 hours"
                        ],
                        "type": "select",
                        "mode": "preference"
                    },
                    {
                        "id": "interest",
                        "name": "Primary learning interest",
                        "help": "Prioritize matching published course categories in the recommended Browse courses order.",
                        "value": "Project management",
                        "choices": [
                            "Project management",
                            "Business analysis",
                            "Product management",
                            "Technology & AI"
                        ],
                        "type": "select",
                        "mode": "preference"
                    },
                    {
                        "id": "captions",
                        "name": "Show course captions",
                        "help": "Applied when a lesson video provides caption tracks.",
                        "value": true,
                        "type": "toggle",
                        "mode": "preference"
                    },
                    {
                        "id": "speed",
                        "name": "Default playback speed",
                        "help": "Applied when opening a lesson video.",
                        "value": "1×",
                        "choices": [
                            "1×",
                            "1.25×",
                            "1.5×",
                            "2×"
                        ],
                        "type": "select",
                        "mode": "preference"
                    }
                ]
            ],
            [
                "Practice defaults",
                [
                    {
                        "id": "examMode",
                        "name": "Default simulator view",
                        "help": "Open the PMP dashboard on full mock exam overview or focused practice performance. Both existing attempt types keep their configured timers.",
                        "value": "Timed exam",
                        "choices": [
                            "Timed exam",
                            "Practice mode"
                        ],
                        "options": [
                            {"value": "Timed exam", "label": "Full mock overview"},
                            {"value": "Practice mode", "label": "Focused practice"}
                        ],
                        "type": "select",
                        "mode": "preference"
                    },
                    {
                        "id": "rationales",
                        "name": "Show answer explanations",
                        "help": "Choose whether answer explanations are expanded by default in completed PMP question reviews.",
                        "value": true,
                        "type": "toggle",
                        "mode": "preference"
                    },
                    {
                        "id": "role",
                        "name": "Interview target role",
                        "help": "Default role when setting up a new practice. Applied when the selected option is available in the active interview catalog.",
                        "value": "Project Manager",
                        "choices": [
                            "Project Coordinator",
                            "Project Manager",
                            "Scrum Master",
                            "Senior Project Manager",
                            "Program Manager"
                        ],
                        "type": "select",
                        "mode": "preference"
                    },
                    {
                        "id": "industry",
                        "name": "Interview industry",
                        "help": "Default industry for interview questions. Applied when the selected option is available in the active interview catalog.",
                        "value": "Software & IT",
                        "choices": [
                            "Software & IT",
                            "Construction",
                            "Manufacturing",
                            "Finance & BFSI",
                            "Healthcare",
                            "Other"
                        ],
                        "type": "select",
                        "mode": "preference"
                    },
                    {
                        "id": "level",
                        "name": "Interview experience level",
                        "help": "Default level for interview questions. Applied when the selected option is available in the active interview catalog.",
                        "value": "Mid-level",
                        "choices": [
                            "Entry",
                            "Junior",
                            "Mid-level",
                            "Senior",
                            "Leadership"
                        ],
                        "type": "select",
                        "mode": "preference"
                    },
                    {
                        "id": "answerMode",
                        "name": "Interview answer mode",
                        "help": "Choose how to answer during practice. Applied when the selected option is available in the active interview catalog.",
                        "value": "Type",
                        "choices": [
                            "Type",
                            "Speak",
                            "Both"
                        ],
                        "type": "select",
                        "mode": "preference"
                    },
                    {
                        "id": "count",
                        "name": "Interview question count",
                        "help": "Default number of questions per practice. Applied when the selected option is available in the active interview catalog.",
                        "value": "5",
                        "choices": [
                            "3",
                            "5",
                            "8",
                            "10"
                        ],
                        "type": "select",
                        "mode": "preference"
                    }
                ]
            ]
        ]
    ],
    [
        "Community",
        "people",
        "Control social interactions and event preferences.",
        [
            [
                "Interactions",
                [
                    {
                        "id": "follow",
                        "name": "Who can follow you",
                        "help": "Allow eligible members to start following your public profile, or prevent new follows. Existing followers can still unfollow.",
                        "choices": [
                            "Members only",
                            "No one"
                        ],
                        "type": "select",
                        "mode": "preference",
                        "value": "Members only"
                    },
                    {
                        "id": "mention",
                        "name": "Who can mention you",
                        "help": "This control is not connected to a live service yet.",
                        "choices": [
                            "Members only",
                            "People I follow",
                            "No one"
                        ],
                        "type": "select",
                        "mode": "unavailable"
                    },
                    {
                        "id": "anon",
                        "name": "Start posts in anonymous mode",
                        "help": "Start new posts anonymously when your plan permits it. You can change this before publishing.",
                        "type": "toggle",
                        "mode": "preference",
                        "value": false
                    },
                    {
                        "id": "blocked",
                        "name": "Blocked accounts",
                        "help": "Blocked-account management is not available.",
                        "label": "Manage blocked accounts",
                        "danger": false,
                        "type": "action",
                        "mode": "unavailable"
                    }
                ]
            ],
            [
                "Events",
                [
                    {
                        "id": "eventCalendar",
                        "name": "Suggest calendar links",
                        "help": "Offer a downloadable calendar entry after registering for an event.",
                        "value": true,
                        "type": "toggle",
                        "mode": "preference"
                    },
                    {
                        "id": "eventEmail",
                        "name": "Event organiser contact",
                        "help": "Organiser messaging and contact-sharing consent are not implemented; existing registration details remain private.",
                        "type": "toggle",
                        "mode": "unavailable"
                    }
                ]
            ]
        ]
    ],
    [
        "AI & usage",
        "spark",
        "Manage AI preferences and see your available balance.",
        [
            [
                "Usage balance",
                [
                    {
                        "id": "usage",
                        "name": "AI usage history",
                        "help": "Review actual AI usage and credit balances in Plan & usage.",
                        "label": "View usage",
                        "danger": false,
                        "type": "action",
                        "mode": "link",
                        "href": "/membership"
                    },
                    {
                        "id": "lowBalance",
                        "name": "Warn when PMP AI balance is low",
                        "help": "Show a warning in PMP question coaching when 10% or less of allocated tokens remain, or fewer than two replies can be funded. Required balance errors always appear.",
                        "value": true,
                        "type": "toggle",
                        "mode": "preference"
                    },
                    {
                        "id": "topup",
                        "name": "AI credit top-up",
                        "help": "View credit packs through the existing secure AI checkout.",
                        "label": "View options",
                        "danger": false,
                        "type": "action",
                        "mode": "link",
                        "href": "/exams/pmp#pmp-ai-usage"
                    }
                ]
            ],
            [
                "Assistant preferences",
                [
                    {
                        "id": "aiLanguage",
                        "name": "AI response language",
                        "help": "Choose the language of new member AI coaching responses using the centralized AI gateway. Existing replies and legacy tutoring are not translated.",
                        "value": "English",
                        "choices": [
                            "English",
                            "বাংলা"
                        ],
                        "type": "select",
                        "mode": "preference"
                    },
                    {
                        "id": "aiProfile",
                        "name": "Use profile for personalized AI coaching",
                        "help": "This control is not connected to a live service yet.",
                        "type": "toggle",
                        "mode": "unavailable"
                    },
                    {
                        "id": "aiHistory",
                        "name": "Keep AI conversation history",
                        "help": "This control is not connected to a live service yet.",
                        "type": "toggle",
                        "mode": "unavailable"
                    },
                    {
                        "id": "clearAI",
                        "name": "Clear AI conversation history",
                        "help": "Global AI conversation deletion is not available.",
                        "label": "Clear history",
                        "danger": true,
                        "type": "action",
                        "mode": "unavailable"
                    }
                ]
            ]
        ]
    ],
    [
        "Plan & billing",
        "card",
        "Review your plan, renewal, payment methods, and receipts.",
        [
            [
                "Membership",
                [
                    {
                        "id": "plans",
                        "name": "Current plan",
                        "help": "Review available membership plans.",
                        "label": "Compare plans",
                        "danger": false,
                        "type": "action",
                        "mode": "link",
                        "href": "/membership?view=plans"
                    },
                    {
                        "id": "renew",
                        "name": "Auto-renew membership",
                        "help": "Membership uses fixed terms. Automatic renewal is not available.",
                        "type": "text",
                        "mode": "readonly",
                        "value": "Not supported"
                    },
                    {
                        "id": "cancelPlan",
                        "name": "Cancel membership",
                        "help": "Contact support about cancelling a paid membership. Current access and billing records will not change automatically.",
                        "label": "Contact support",
                        "danger": true,
                        "type": "action",
                        "mode": "link",
                        "href": "/help-center/contact"
                    }
                ]
            ],
            [
                "Payment & receipts",
                [
                    {
                        "id": "payment",
                        "name": "Payment methods",
                        "help": "Saved payment-method management is not available.",
                        "label": "Manage payment method",
                        "danger": false,
                        "type": "action",
                        "mode": "unavailable"
                    },
                    {
                        "id": "billingEmail",
                        "name": "Billing email",
                        "help": "A separate billing email is not supported.",
                        "type": "email",
                        "mode": "unavailable"
                    },
                    {
                        "id": "invoice",
                        "name": "Payment history",
                        "help": "View your recorded central payment orders (not tax invoices).",
                        "label": "View payments",
                        "danger": false,
                        "type": "action",
                        "mode": "action"
                    }
                ]
            ]
        ]
    ],
    [
        "Data & account",
        "file",
        "Export your data and manage the status of your account.",
        [
            [
                "Your data",
                [
                    {
                        "id": "export",
                        "name": "Download your settings",
                        "help": "Download a JSON copy of the saved account settings (not a full data export).",
                        "label": "Download JSON",
                        "danger": false,
                        "type": "action",
                        "mode": "action"
                    },
                    {
                        "id": "request",
                        "name": "Request an account data export",
                        "help": "Contact support to request a full account data export.",
                        "label": "Request export",
                        "danger": false,
                        "type": "action",
                        "mode": "link",
                        "href": "/help-center/contact"
                    }
                ]
            ],
            [
                "Account status",
                [
                    {
                        "id": "deactivate",
                        "name": "Deactivate account",
                        "help": "Contact support about temporary account deactivation. This action does not deactivate the account automatically.",
                        "label": "Contact support",
                        "danger": true,
                        "type": "action",
                        "mode": "link",
                        "href": "/help-center/contact"
                    },
                    {
                        "id": "delete",
                        "name": "Delete account",
                        "help": "Permanently delete your account after confirming your password. Accounts with retained financial or audit records may need support-assisted removal.",
                        "label": "Delete account",
                        "danger": true,
                        "type": "action",
                        "mode": "action"
                    }
                ]
            ]
        ]
    ]
]
JSON
, true, 512, JSON_THROW_ON_ERROR);
