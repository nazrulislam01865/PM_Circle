export const helpGuides = [
    {
        "id": "account",
        "name": "Account & profile",
        "articles": [
            {
                "id": "1",
                "title": "Reset your password",
                "steps": [
                    "Open Sign in and choose Forgot password.",
                    "Enter the email linked to your PM Circle account.",
                    "Open the reset email and choose a new password."
                ],
                "quickAnswer": "Request a reset link from the sign-in page, then use it to set a new password."
            },
            {
                "id": "2",
                "title": "Edit your profile",
                "steps": [
                    "Open Profile & career → My profile.",
                    "Choose Edit profile or select a section to edit.",
                    "Save your changes and preview your profile."
                ],
                "quickAnswer": "Edit and save your details from My profile."
            },
            {
                "id": "3",
                "title": "Complete your profile",
                "steps": [
                    "Open My profile → Profile completeness.",
                    "Choose an incomplete section and add the requested details.",
                    "Save and check the updated progress."
                ],
                "quickAnswer": "Open the completeness card to see which profile sections need attention."
            }
        ]
    },
    {
        "id": "learning",
        "name": "Courses & learning",
        "articles": [
            {
                "id": "1",
                "title": "Start a course",
                "steps": [
                    "Open Learn & practise → Browse courses.",
                    "Select a course to review its outline and access requirements.",
                    "Enrol if required, then open the first lesson."
                ],
                "quickAnswer": "Find the course in Browse courses and open its first lesson after enrolling."
            },
            {
                "id": "2",
                "title": "Track your progress",
                "steps": [
                    "Open Learn & practise → My learning.",
                    "Select an enrolled course to see completed lessons.",
                    "Choose Resume learning to continue."
                ],
                "quickAnswer": "Open your enrolled course from My learning to see where you left off."
            },
            {
                "id": "3",
                "title": "Find a daily challenge",
                "steps": [
                    "Open Learn & practise → Daily challenge.",
                    "Choose Today for the latest challenge or Library for earlier ones.",
                    "Read the scenario and submit your response if entries are open."
                ],
                "quickAnswer": "Daily challenge lists the current challenge and earlier scenarios."
            }
        ]
    },
    {
        "id": "exams",
        "name": "Exam simulators",
        "articles": [
            {
                "id": "1",
                "title": "Start a PMP practice exam",
                "steps": [
                    "Open Learn & practise → PMP Exam Simulator.",
                    "Check your access in Plan & usage if the simulator is locked.",
                    "Choose a practice mode, review the instructions and start."
                ],
                "quickAnswer": "Open the PMP simulator from Learn & practise. Plus or Pro access is required."
            },
            {
                "id": "2",
                "title": "Review answers and results",
                "steps": [
                    "Finish your exam and open the result summary.",
                    "Choose Review answers to see your selections and explanations.",
                    "Check your previous attempts in the simulator history."
                ],
                "quickAnswer": "Your result summary links to the answer review and explanations."
            },
            {
                "id": "3",
                "title": "Find Scrum and Project simulators",
                "steps": [
                    "Open Learn & practise.",
                    "Choose Scrum Simulator or Project Simulator.",
                    "These simulators are coming soon; check their pages for availability."
                ],
                "quickAnswer": "Both simulator pages are available from Learn & practise; practice functionality is coming soon."
            }
        ]
    },
    {
        "id": "ai",
        "name": "AI tools & resume",
        "articles": [
            {
                "id": "1",
                "title": "Import your CV",
                "steps": [
                    "Open Profile & career → My profile → Resume & imports.",
                    "Select a supported resume file and review the imported fields.",
                    "Confirm the details you want to save to your profile."
                ],
                "quickAnswer": "Upload a supported CV from Resume & imports and review the fields before saving."
            },
            {
                "id": "2",
                "title": "Use AI Resume Assistant",
                "steps": [
                    "Open Profile & career → AI Resume Assistant.",
                    "Review your Pro plan access and available AI credits.",
                    "Select your uploaded resume, confirm consent, and review the suggestions."
                ],
                "quickAnswer": "Pro members can request AI résumé analysis and rewrites when configured."
            },
            {
                "id": "3",
                "title": "Start a mock interview",
                "steps": [
                    "Open Profile & career → Interview preparation.",
                    "Choose a role and available practice options.",
                    "Complete the practice session and review your feedback."
                ],
                "quickAnswer": "Set the role and session length in Interview preparation."
            }
        ]
    },
    {
        "id": "community",
        "name": "Community & events",
        "articles": [
            {
                "id": "1",
                "title": "Report a post",
                "steps": [
                    "Open the post menu in Community feed.",
                    "Select Report and choose a reason.",
                    "Submit the report for moderation."
                ],
                "quickAnswer": "Use Report in the post menu to send the post to moderation."
            },
            {
                "id": "2",
                "title": "Find a saved post",
                "steps": [
                    "Open Community → Saved posts.",
                    "Select a post to reopen the discussion.",
                    "Use the post menu to remove it from your saved list."
                ],
                "quickAnswer": "Saved posts are listed under Community."
            },
            {
                "id": "3",
                "title": "Register for an event",
                "steps": [
                    "Open the event details from its community listing.",
                    "Check the schedule and available event actions.",
                    "Review the registration confirmation."
                ],
                "quickAnswer": "Use Register on the event details page to reserve your place."
            }
        ]
    },
    {
        "id": "payments",
        "name": "Payments & membership",
        "articles": [
            {
                "id": "1",
                "title": "Check your plan and AI usage",
                "steps": [
                    "Open Account → Plan & usage.",
                    "Review your plan status and billing period.",
                    "Check the PMP AI token allowance and credits separately, then review activity by feature."
                ],
                "quickAnswer": "Plan & usage shows your membership, PMP token allowance, credits and feature activity."
            },
            {
                "id": "2",
                "title": "Payment went through but plan is inactive",
                "steps": [
                    "Open Plan & usage to check your current plan.",
                    "Check your confirmation email for a payment reference.",
                    "Contact support with the reference and payment date."
                ],
                "quickAnswer": "Check your plan status and payment reference before contacting support."
            },
            {
                "id": "3",
                "title": "Manage your membership",
                "steps": [
                    "Open Account → Plan & usage.",
                    "Review your plan status, billing dates and available features.",
                    "Use the membership action to review options for your account."
                ],
                "quickAnswer": "Open Plan & usage to find your membership options."
            }
        ]
    }
];

/** Search the static approved guide catalog without sending member queries to the server. */
export function searchHelpGuides(query: string) {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return helpGuides.map(group => ({ ...group, articles: group.articles.filter(article =>
        words.every(word => `${group.name} ${article.title} ${article.steps.join(' ')}`.toLowerCase().includes(word)))
    })).filter(group => group.articles.length > 0);
}
