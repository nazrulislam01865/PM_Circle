/** Public, non-diagnostic reflection content. No server calls or personal identifiers. */
export const profileFields = {
    situation: {
        label: 'Current situation *',
        options: ['Studying', 'Working', 'Exploring a career change', 'Returning to work', 'Other'],
    },
    role: {
        label: 'Current role *',
        options: ['Student or new entrant', 'Individual contributor', 'Team coordinator', 'Team lead or manager', 'Other'],
    },
    exposure: {
        label: 'Project exposure *',
        options: ['No project experience yet', 'School, volunteer or personal projects', 'Contributed to a work project', 'Coordinated a project', 'Led a project'],
    },
    goal: {
        label: 'Main goal *',
        options: ['Understand project management', 'Start a PM-related career', 'Grow in my current role', 'Explore PM learning and certification'],
    },
    education: {
        label: 'Highest education (optional)',
        options: ['Prefer not to say', 'Secondary or higher secondary', 'Diploma', 'Undergraduate degree', 'Postgraduate degree', 'Other'],
    },
    age: {
        label: 'Age range (optional)',
        options: ['Prefer not to say', 'Under 18', '18–24', '25–34', '35–44', '45 or older'],
    },
} as const;

export type ProfileField = keyof typeof profileFields;
export type ProfileAnswers = Record<ProfileField, string>;
export const requiredProfileFields: ProfileField[] = ['situation', 'role', 'exposure', 'goal'];

export type PreferenceArea = 'planning' | 'communication' | 'change' | 'priorities';
export type ReflectionQuestion = { eyebrow: string; title: string; options: { label: string; area: PreferenceArea }[] };

export const reflectionQuestions: ReflectionQuestion[] = [
    {
        eyebrow: 'YOUR EXPERIENCE',
        title: 'Which part of a small group project feels most comfortable?',
        options: [
            { label: 'Planning tasks and deadlines', area: 'planning' },
            { label: 'Keeping everyone informed', area: 'communication' },
            { label: 'Resolving surprises', area: 'change' },
            { label: 'Completing my assigned work', area: 'priorities' },
        ],
    },
    {
        eyebrow: 'HOW YOU WORK',
        title: 'When a team starts something new, what would you like to do first?',
        options: [
            { label: 'Break the work into tasks and milestones', area: 'planning' },
            { label: 'Understand what each person needs', area: 'communication' },
            { label: 'Consider what might change or go wrong', area: 'change' },
            { label: 'Decide which outcome matters most', area: 'priorities' },
        ],
    },
    {
        eyebrow: 'WORKING WITH OTHERS',
        title: 'What would you be most interested in learning on a team project?',
        options: [
            { label: 'Tracking tasks and progress', area: 'planning' },
            { label: 'Working with different people and expectations', area: 'communication' },
            { label: 'Responding when a plan needs to change', area: 'change' },
            { label: 'Making trade-offs with limited time', area: 'priorities' },
        ],
    },
    {
        eyebrow: 'A PROJECT CHALLENGE',
        title: 'If your team had a tight deadline, what would you focus on?',
        options: [
            { label: 'Organising the remaining activities', area: 'planning' },
            { label: 'Checking in with the people involved', area: 'communication' },
            { label: 'Finding an alternative when work is blocked', area: 'change' },
            { label: 'Choosing the most important deliverables', area: 'priorities' },
        ],
    },
    {
        eyebrow: 'LEARNING PREFERENCE',
        title: 'How would you prefer to prepare for your first PM-related role?',
        options: [
            { label: 'A structured beginner guide', area: 'planning' },
            { label: 'Learning with a community', area: 'communication' },
            { label: 'Practice tasks with feedback', area: 'change' },
            { label: 'Examples of real work', area: 'priorities' },
        ],
    },
];

export const interestAreas: { id: PreferenceArea; title: string; description: string; activity: string }[] = [
    { id: 'planning', title: 'Planning & follow-up', description: 'Breaking down work and checking progress', activity: 'Plan a small event with tasks, owners and dates.' },
    { id: 'communication', title: 'Stakeholder communication', description: 'Listening, aligning expectations and coordinating people', activity: 'Summarise two different viewpoints before suggesting a next step.' },
    { id: 'change', title: 'Change & risk', description: 'Adjusting the approach when circumstances change', activity: 'Write two alternatives for a delayed task and their trade-offs.' },
    { id: 'priorities', title: 'Priorities & decisions', description: 'Balancing time, cost, scope and value', activity: 'Choose what to postpone when time is limited and explain why.' },
];

export const careers: Record<PreferenceArea, { title: string; description: string; skills: string[]; nextAction: string }> = {
    planning: {
        title: 'Project Coordinator',
        description: 'Project coordinators help teams organise tasks, timelines, updates and follow-up activities. This can be a practical starting point for exploring project delivery.',
        skills: ['Task planning and scheduling', 'Tracking progress and dependencies', 'Project documentation'],
        nextAction: 'Plan a small event with a task list, dates, owners and progress check-ins.',
    },
    communication: {
        title: 'Project Communications Coordinator',
        description: 'This direction involves keeping people informed, gathering updates and helping a team align on expectations and next actions.',
        skills: ['Stakeholder communication', 'Meeting notes and follow-ups', 'Facilitating team updates'],
        nextAction: 'Write a simple stakeholder update for a volunteer or study project.',
    },
    change: {
        title: 'Agile Delivery Coordinator',
        description: 'Agile delivery support focuses on helping teams organise short cycles of work, surface blockers and respond to changing priorities.',
        skills: ['Agile fundamentals', 'Identifying blockers and risks', 'Continuous improvement'],
        nextAction: 'Create a simple task board and review how you would respond to a blocked task.',
    },
    priorities: {
        title: 'PMO Analyst',
        description: 'PMO analysts help organise project information, monitor milestones and prepare clear updates that support prioritisation and decision-making.',
        skills: ['Project reporting', 'Prioritisation and trade-offs', 'Basic spreadsheets and metrics'],
        nextAction: 'Create a one-page status report for a small project, including milestones and risks.',
    },
};

export const initialProfile: ProfileAnswers = {
    situation: '', role: '', exposure: '', goal: '', education: 'Prefer not to say', age: 'Prefer not to say',
};

/** Choices express interest only; equal counts retain the displayed area order. */
export function getDiscoverResults(answers: (number | null)[]) {
    const scores: Record<PreferenceArea, number> = { planning: 0, communication: 0, change: 0, priorities: 0 };
    reflectionQuestions.forEach((question, index) => {
        const answer = answers[index];
        if (answer !== null && answer !== undefined && Number.isInteger(answer) && answer >= 0 && answer < question.options.length) {
            scores[question.options[answer].area] += 1;
        }
    });
    const best = interestAreas.reduce((previous, current) => scores[current.id] > scores[previous.id] ? current : previous);
    return { scores, recommended: best.id, career: careers[best.id] };
}
