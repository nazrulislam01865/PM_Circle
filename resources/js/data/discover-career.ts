/** Screenshot-matched informational sample content. Not live jobs, salary research or verified testimonials. */
export const careerTotal = 8;

export const processSteps = [
    { title: '1 · Agree the goal', description: 'What result are we trying to achieve, and for whom?' },
    { title: '2 · Organise the work', description: 'Clarify tasks, people, time, resources and risks.' },
    { title: '3 · Coordinate & adapt', description: 'Track progress, resolve issues and review changes.' },
    { title: '4 · Deliver & learn', description: 'Check the result, hand over and capture lessons.' },
];

export const projectRoles = [
    { title: 'Project coordinator', description: 'Supports schedules, updates, documentation and follow-up.' },
    { title: 'Project manager', description: 'Coordinates delivery, stakeholders, decisions and constraints.' },
    { title: 'PMO professional', description: 'Supports project standards, reporting and governance.' },
    { title: 'Programme or delivery leader', description: 'Coordinates broader outcomes across teams or related work.' },
];

export const industries = [
    { id: 'technology', name: 'Technology', example: 'Launch a customer portal.', detail: 'Work with product, engineering, design and customers.' },
    { id: 'construction', name: 'Construction', example: 'Complete a new community facility.', detail: 'Coordinate design, contractors, materials, schedules and safety.' },
    { id: 'development', name: 'Development', example: 'Run a local skills workshop.', detail: 'Plan activities with participants, volunteers, partners and funders.' },
    { id: 'manufacturing', name: 'Manufacturing', example: 'Improve a production process.', detail: 'Align operations, quality, equipment and delivery milestones.' },
    { id: 'healthcare', name: 'Healthcare', example: 'Introduce an appointment service.', detail: 'Coordinate staff, patient needs, training and service changes.' },
] as const;
export type IndustryId = typeof industries[number]['id'];

export const internationalRoutes = [
    { title: 'Local roles abroad', description: 'Check work authorisation, local hiring practices and sector experience.' },
    { title: 'Distributed teams', description: 'Communication, time-zone overlap and independent follow-through matter.' },
    { title: 'Internal career moves', description: 'Project responsibilities can grow from an existing specialist or operational role.' },
];

/** Invented interface examples only. Never present these numbers as researched salaries or market averages. */
export const salaryExamples = {
    bd: {
        label: 'Bangladesh · BDT / month', unit: 'BDT per month', symbol: '৳',
        roles: [
            { label: 'Coordinator · Early career', title: 'Coordinator', range: '25,000–45,000' },
            { label: 'Project Manager · Experienced', title: 'Project Manager', range: '60,000–110,000' },
            { label: 'Senior PM · Larger delivery scope', title: 'Senior PM', range: '120,000–180,000' },
        ],
    },
    overseas: {
        label: 'Example overseas market · USD / year', unit: 'USD per year', symbol: '$',
        roles: [
            { label: 'Coordinator · Early career', title: 'Coordinator', range: '35,000–55,000' },
            { label: 'Project Manager · Experienced', title: 'Project Manager', range: '60,000–100,000' },
            { label: 'Senior PM · Larger delivery scope', title: 'Senior PM', range: '105,000–155,000' },
        ],
    },
} as const;
export type SalaryMarket = keyof typeof salaryExamples;

export const supportAreas = [
    { id: 'learning', label: 'Learning journey', eyebrow: 'LEARNING JOURNEY', title: 'Build skills one step at a time.',
        description: 'Follow a beginner path, practise small decisions and review feedback. Record your progress when you join.',
        step: 'Start with one short lesson and one practice activity.' },
    { id: 'discussions', label: 'Discussions', eyebrow: 'DISCUSSIONS', title: 'Learn from different perspectives.',
        description: 'Explore practical project questions, exchange ideas and understand how others approach real challenges.',
        step: 'Read one community conversation and note a useful idea.' },
    { id: 'connections', label: 'Professional connections', eyebrow: 'PROFESSIONAL CONNECTIONS', title: 'Meet people working on projects.',
        description: 'Explore professional profiles and build relevant connections as you grow your experience.',
        step: 'Find a project role you are curious about and learn what it involves.' },
    { id: 'certifications', label: 'Certification preparation', eyebrow: 'CERTIFICATION PREPARATION', title: 'Prepare through guided practice.',
        description: 'Explore exam topics and practice questions when a certification matches your goals and experience.',
        step: 'Compare certification eligibility with your current experience.' },
    { id: 'careers', label: 'Career & opportunities', eyebrow: 'CAREER & OPPORTUNITIES', title: 'Explore your possible next role.',
        description: 'Read example role requirements and understand the experience, skills and responsibilities employers ask for.',
        step: 'Compare two job descriptions and list their shared requirements.' },
] as const;
export type SupportAreaId = typeof supportAreas[number]['id'];

export const completionPlan = [
    'Learn the difference between a project and ongoing work.',
    'Plan one small activity with a goal, tasks and owners.',
    'Ask for feedback and write one lesson learned.',
];
