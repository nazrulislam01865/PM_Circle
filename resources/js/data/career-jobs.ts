/** Shared data contract used by the existing Careers cards and details view. */
export type CareerJob = {
    id: string;
    title: string;
    company: string;
    location: string;
    posted: string | null;
    type: string;
    experience?: string | null;
    vacancies?: number | null;
    salary?: { amount: number; maxAmount?: number | null; currency: string; interval?: string | null } | null;
    source: string;
    sourceUrl: string;
    image: string;
    description?: string | null;
};

export const careerJobHref = (id: string): string => `/careers/${encodeURIComponent(id)}`;

export function formatCareerJobDate(date: string | null): string {
    if (!date) return 'Not provided';
    const parts = date.split('-').map(Number);
    if (parts.length !== 3 || parts.some(value => !Number.isInteger(value))) return 'Not provided';
    const [year, month, day] = parts;
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return 'Not provided';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

export function formatCareerJobSalary(job: CareerJob): string {
    if (!job.salary) return 'Not disclosed';
    const { amount, maxAmount, currency, interval } = job.salary;
    const prefix = currency === 'BDT' ? '৳' : currency === 'USD' ? '$' : `${currency} `;
    const range = maxAmount != null && maxAmount > amount ? `–${prefix}${maxAmount.toLocaleString('en-BD')}` : '';
    const intervalLabels: Record<string, string> = { yearly: 'year', monthly: 'month', weekly: 'week', daily: 'day', hourly: 'hour' };
    const unit = interval ? ` / ${intervalLabels[interval] ?? interval}` : '';
    return `${prefix}${amount.toLocaleString('en-BD')}${range}${unit}`;
}
