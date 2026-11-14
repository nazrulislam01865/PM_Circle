import type { ExamQuestion } from './ExamShared';

/**
 * Approved public preview content. Editors/developers select the sample here.
 * Do not fetch protected pmp_exam_questions or send answers to the server.
 */
export const pmpPublicSampleQuestion: ExamQuestion = {
    id: 0,
    domain: 'Process',
    difficulty: 'Moderate',
    prompt: 'A key stakeholder requests a major scope change late in a predictive project. What should the project manager do first?',
    options: {
        A: 'Approve the change to maintain stakeholder support.',
        B: 'Assess the request through the agreed change control process.',
        C: 'Ask the sponsor to approve the change immediately.',
        D: 'Update the schedule to make room for the change.',
    },
    correct: 'B',
    explanation: 'The correct first step is to assess the request through the agreed change control process. This ensures the change is evaluated for its impact on scope, schedule, cost and other constraints before making a decision.',
    otherOptions: 'A bypasses change control. C requests approval before impact analysis. D changes the schedule before the request has been evaluated.',
    takeaway: 'Evaluate proposed changes through the agreed integrated change control process before approving or implementing them.',
    concepts: 'Integrated change control; stakeholder engagement; scope and schedule impact analysis.',
    references: 'PM Circle PMP preparation materials and the project change control process.',
};

export const pmpPublicSampleDurationSeconds = 90;
