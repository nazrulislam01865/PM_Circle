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
                        "help": "Your preferred language for content and messages. Saved preference only; not yet applied by the relevant module.",
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
                        "help": "Used for quiet hours; other event and reminder displays are not yet connected.",
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
                        "help": "Your preferred time display. Saved preference only; not yet applied by the relevant module.",
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
                        "help": "Preview appearance here and apply it when you save.",
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
                        "help": "This control is not connected to a live service yet.",
                        "label": "Sign out other devices",
                        "danger": false,
                        "type": "action",
                        "mode": "unavailable"
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
                        "help": "Receive optional community and challenge activity in the notification centre.",
                        "type": "toggle",
                        "mode": "preference",
                        "value": true
                    },
                    {
                        "id": "mail",
                        "name": "Email notifications",
                        "help": "This control is not connected to a live service yet.",
                        "type": "toggle",
                        "mode": "unavailable"
                    },
                    {
                        "id": "push",
                        "name": "Browser push notifications",
                        "help": "This control is not connected to a live service yet.",
                        "type": "toggle",
                        "mode": "unavailable"
                    },
                    {
                        "id": "digest",
                        "name": "Email digest frequency",
                        "help": "This control is not connected to a live service yet.",
                        "choices": [
                            "Instant",
                            "Daily",
                            "Weekly",
                            "Off"
                        ],
                        "type": "select",
                        "mode": "unavailable"
                    }
                ]
            ],
            [
                "Notification topics",
                [
                    {
                        "id": "learnNotify",
                        "name": "Learning reminders",
                        "help": "This control is not connected to a live service yet.",
                        "type": "toggle",
                        "mode": "unavailable"
                    },
                    {
                        "id": "examNotify",
                        "name": "Simulator results and practice reminders",
                        "help": "This control is not connected to a live service yet.",
                        "type": "toggle",
                        "mode": "unavailable"
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
                        "name": "Comments, replies and mentions",
                        "help": "Receive notifications for community follows, comments, replies and reactions.",
                        "type": "toggle",
                        "mode": "preference",
                        "value": true
                    },
                    {
                        "id": "eventNotify",
                        "name": "Event registrations and reminders",
                        "help": "This control is not connected to a live service yet.",
                        "type": "toggle",
                        "mode": "unavailable"
                    },
                    {
                        "id": "careerNotify",
                        "name": "Career Trends and opportunities",
                        "help": "This control is not connected to a live service yet.",
                        "type": "toggle",
                        "mode": "unavailable"
                    },
                    {
                        "id": "usageNotify",
                        "name": "AI usage and low balance",
                        "help": "This control is not connected to a live service yet.",
                        "type": "toggle",
                        "mode": "unavailable"
                    },
                    {
                        "id": "newsletter",
                        "name": "News and offers",
                        "help": "This control is not connected to a live service yet.",
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
                        "help": "Skip optional community and challenge alerts during quiet hours. Security and billing notices are unaffected.",
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
                        "help": "Used to track your learning goal. Saved preference only; not yet applied by the relevant module.",
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
                        "help": "Used for course recommendations. Saved preference only; not yet applied by the relevant module.",
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
                        "name": "Exam simulator mode",
                        "help": "Choose your default for new attempts. Saved preference only; not yet applied by the relevant module.",
                        "value": "Timed exam",
                        "choices": [
                            "Timed exam",
                            "Practice mode"
                        ],
                        "type": "select",
                        "mode": "preference"
                    },
                    {
                        "id": "rationales",
                        "name": "Show answer explanations",
                        "help": "Show rationales in practice mode and review. Saved preference only; not yet applied by the relevant module.",
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
                        "help": "This control is not connected to a live service yet.",
                        "choices": [
                            "Members only",
                            "No one"
                        ],
                        "type": "select",
                        "mode": "unavailable"
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
                        "help": "Offer a calendar link after registering for an event. Saved preference only; not yet applied by the relevant module.",
                        "value": true,
                        "type": "toggle",
                        "mode": "preference"
                    },
                    {
                        "id": "eventEmail",
                        "name": "Event organiser contact",
                        "help": "This control is not connected to a live service yet.",
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
                        "name": "Warn before starting when balance is low",
                        "help": "Show a notice before using AI when your balance is low. Saved preference only; not yet applied by the relevant module.",
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
                        "help": "Preferred language for AI coaching. Saved preference only; not yet applied by the relevant module.",
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
                        "help": "Automatic renewal is not supported by the current payment flow.",
                        "type": "toggle",
                        "mode": "unavailable"
                    },
                    {
                        "id": "cancelPlan",
                        "name": "Cancel membership",
                        "help": "Self-service membership cancellation is not available.",
                        "label": "Cancel plan",
                        "danger": true,
                        "type": "action",
                        "mode": "unavailable"
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
                        "name": "Billing history",
                        "help": "Invoice history is not available from this workspace.",
                        "label": "View invoices",
                        "danger": false,
                        "type": "action",
                        "mode": "unavailable"
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
                        "help": "Self-service temporary deactivation is not available.",
                        "label": "Deactivate",
                        "danger": true,
                        "type": "action",
                        "mode": "unavailable"
                    },
                    {
                        "id": "delete",
                        "name": "Delete account",
                        "help": "Permanently delete your account after confirming your password.",
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
