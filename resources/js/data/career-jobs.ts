/**
 * A small, browser-only job preview selected from the user-provided
 * project_manager_jobs.csv (11 Nov 2026). These are sample records, not
 * verified/live advertisements. The CSV supplies no employer descriptions,
 * responsibilities, skills or benefits, so none are invented here.
 */
export type CareerJob = {
    id: string;
    title: string;
    company: string;
    location: string;
    posted: string;
    type: 'Full time' | 'Contract';
    experience?: string;
    vacancies: number;
    salary?: { amount: number; currency: 'BDT'; interval: 'month' };
    source: 'Bdjobs';
    sourceUrl: string;
    image: string;
};

export const careerJobs: readonly CareerJob[] = [
    {
        id: 'bd-1548237', title: 'Project Manager', company: 'TUUO Solutions Limited',
        location: 'Nikunja, Bangladesh', posted: '2026-11-09', type: 'Full time', vacancies: 5,
        source: 'Bdjobs', sourceUrl: 'https://bdjobs.com/h/details/1548237',
        image: '/images/trends/job-trends.webp',
    },
    {
        id: 'bd-1554296', title: 'Project Manager (Civil)', company: 'DG.Bangla',
        location: 'Dhaka, Bangladesh', posted: '2026-11-09', type: 'Full time',
        experience: '15 to 20 years', vacancies: 1,
        source: 'Bdjobs', sourceUrl: 'https://bdjobs.com/h/details/1554296',
        image: '/images/trends/office-project-plan.webp',
    },
    {
        id: 'bd-1553577', title: 'Assistant Project Manager (APM) - HO', company: 'Shanta Holdings Ltd.',
        location: 'Dhaka, Bangladesh', posted: '2026-11-09', type: 'Full time',
        experience: '3 to 5 years', vacancies: 1,
        source: 'Bdjobs', sourceUrl: 'https://bdjobs.com/h/details/1553577',
        image: '/images/learning/catalog-hero.webp',
    },
    {
        id: 'bd-1553880', title: 'Project Officer', company: 'Centre for Disability in Development (CDD)',
        location: 'Savar, Bangladesh', posted: '2026-11-09', type: 'Contract',
        experience: 'At least 3 years', vacancies: 1,
        salary: { amount: 50000, currency: 'BDT', interval: 'month' },
        source: 'Bdjobs', sourceUrl: 'https://bdjobs.com/h/details/1553880',
        image: '/images/interview/industry-hero.webp',
    },
    {
        id: 'bd-1552517', title: 'Project Manager', company: 'The Fred Hollows Foundation-Bangladesh',
        location: 'Dhaka, Bangladesh', posted: '2026-11-05', type: 'Contract', vacancies: 1,
        source: 'Bdjobs', sourceUrl: 'https://bdjobs.com/h/details/1552517',
        image: '/images/trends/green-energy.webp',
    },
    {
        id: 'bd-1553003', title: 'Technical Project Manager - Software Development', company: 'Technovicinity Limited',
        location: 'Kalabagan, Bangladesh', posted: '2026-11-05', type: 'Full time',
        experience: '4 to 5 years', vacancies: 1,
        source: 'Bdjobs', sourceUrl: 'https://bdjobs.com/h/details/1553003',
        image: '/images/trends/challenges.webp',
    },
];

export const careerJobHref = (id: string): string => `/careers/${encodeURIComponent(id)}`;

export function findCareerJob(id: string): CareerJob | undefined {
    return careerJobs.find(job => job.id === id);
}

export function formatCareerJobDate(date: string): string {
    const parts = date.split('-').map(Number);
    if (parts.length !== 3 || parts.some(value => !Number.isInteger(value))) return date;
    const [year, month, day] = parts;
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return date;
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

export function formatCareerJobSalary(job: CareerJob): string {
    return job.salary ? `${job.salary.currency === 'BDT' ? '৳' : job.salary.currency}${job.salary.amount.toLocaleString('en-BD')} / ${job.salary.interval}` : 'Not disclosed';
}
