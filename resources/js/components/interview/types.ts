export type InterviewShell = import('@/types/dashboard').DashboardShellData;
export type QuestionType = 'General' | 'Behavioral' | 'Technical' | 'Situational';
export type InterviewQuestion = { id: string; type: QuestionType; text: string };
export type InterviewSession = { id: number; industry: string; role: string; experience: string; count: number; mode: 'type' | 'speak' | 'both'; status: string; createdAt: string; serverNow: string; deadlineAt: string; durationSeconds: number; remainingSeconds: number };
export type Evaluation = { score: number; summary: string; relevance: number; pm_knowledge: number; clarity: number; communication: number; leadership: number; problem_solving: number; strengths: string[]; improvements: string[]; suggestions: string[]; suggested_answer: string };
export type InterviewAnswer = { position: number; answer: string | null; mode: string | null; status: 'submitted' | 'pending' | 'evaluated' | 'failed'; score: number | null; evaluation: Evaluation | null };
export type InterviewHistory = { id: number; industry: string; role: string; question_count: number; overall_score: number | string | null; status?: string; completed_at: string | null; created_at?: string };
export const interviewBase = '/interview-preparation';
export const resultsUrl = (id: number) => `${interviewBase}/results/${id}`;
export const practiceUrl = (id: number) => `${interviewBase}/sessions/${id}`;
export const dateLabel = (date: string | null) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
export const scoreLabel = (score: number | string | null) => score === null ? '—' : Number(score).toFixed(1);

/** CSRF-protected JSON actions avoid reloading the dashboard or all Inertia props. */
export async function interviewApi<T>(url: string, method = 'GET', payload?: unknown): Promise<T> {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch(url, {
        method, credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
        const obj = data as { message?: string; errors?: Record<string, string[]> };
        throw new Error(Object.values(obj.errors ?? {})[0]?.[0] ?? obj.message ?? 'Something went wrong. Please try again.');
    }
    return data as T;
}
