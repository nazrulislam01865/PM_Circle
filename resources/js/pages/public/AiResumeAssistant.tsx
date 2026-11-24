import { Head, Link, usePage } from '@inertiajs/react';
import { Lightbulb, Sparkles } from 'lucide-react';
import { HomePhoto } from '@/components/home/v2/HomePhoto';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { ReferencePhotoKey } from '@/components/home/v2/reference';
import '../../../css/pm-ai-resume-public.css';

const description = 'Turn your existing résumé into a clearer account of what you’ve done and the results you delivered.';

const studies = [
    { value: '8% more likely', text: 'to be hired among jobseekers who received résumé writing assistance in an online labour marketplace experiment involving nearly half a million people.', label: 'Wiles, Munyikwa & Horton · NBER', href: 'https://www.nber.org/papers/w30886' },
    { value: '7.4 seconds', text: 'was the average initial résumé scan in Ladders’ 2018 recruiter eye-tracking study.', label: 'Ladders · 2018 study release', href: 'https://www.theladders.com/static/images/basicSite/pdfs/TheLadders-EyeTracking-StudyC2.pdf?lang=fr' },
];

type ResumeStep = { title: string; text: string; photo: ReferencePhotoKey; source?: string };
const steps: ResumeStep[] = [
    { title: 'Import your résumé', text: 'Upload your résumé to prefill your experience, education, skills, and certifications. Check which sections were imported before continuing.', photo: 'review', source: '/images/resume/import.webp' },
    { title: 'Edit your draft', text: 'Check job titles and dates, fill in missing details, and describe what you contributed to each project.', photo: 'tutor' },
    { title: 'Review AI suggestions', text: 'Compare a suggestion with your original wording. Use it if it reflects what you did, or edit it in your own words.', photo: 'review' },
    { title: 'Save your résumé and profile', text: 'Save the draft to revisit later. Review the information you want to use to prefill your PM Circle profile.', photo: 'leader' },
    { title: 'Export a copy', text: 'Preview the final layout and download a copy to share with employers.', photo: 'foundations' },
];

const examples = [
    { title: 'Project coordinator · Reporting and issue tracking', original: 'Helped the team with weekly updates and tracked project issues.', rewrite: 'Prepared weekly project status updates and maintained the issue log, flagging open blockers for the delivery lead.', why: 'The recruiter can see which tasks the candidate owned and how they kept the delivery lead informed.' },
    { title: 'Business analyst · Requirements and handover', original: 'Worked with stakeholders on requirements.', rewrite: 'Led workshops with operations and finance teams, then turned their requirements into user stories and acceptance criteria for developers.', why: 'The rewrite shows who the candidate worked with and what they produced. A recruiter can assess both facilitation and the ability to make requirements testable.' },
    { title: 'Project manager · Measurable outcomes', original: 'Improved the project reporting process.', rewrite: 'Standardised status reporting across six projects, cutting weekly report preparation from four hours to two.', why: 'The scope and before-and-after figures show the scale of the work and the time saved.' },
    { title: 'Scrum master · Collaboration across teams', original: 'Helped remove team blockers.', rewrite: 'Coordinated with engineering and QA to resolve test environment access issues before sprint reviews.', why: 'The candidate gives an example of the blocker they addressed and the teams they brought together. That makes their coordination skills easier to assess.' },
];

function StudyCard({ study }: { study: typeof studies[number] }) {
    return <div className="pm-public-resume-study"><strong className="pm-public-resume-stat">{study.value}</strong><p>{study.text}</p><a href={study.href} target="_blank" rel="noopener noreferrer">{study.label}</a></div>;
}

function StepCard({ step, number }: { step: ResumeStep; number: number }) {
    return <li className="pm-public-resume-split pm-public-resume-step"><div className="pm-public-resume-copy"><span className="pm-public-resume-step-number">Step {number}</span><h3>{step.title}</h3><p>{step.text}</p></div><HomePhoto photo={step.photo} source={step.source} alt="" className="pm-public-resume-photo"/></li>;
}

function ReviewExample({ example }: { example: typeof examples[number] }) {
    return <article className="pm-public-resume-example"><h3>{example.title}</h3><div className="pm-public-resume-comparison"><div className="pm-public-resume-original"><h4>Original</h4><p>“{example.original}”</p></div><div className="pm-public-resume-rewrite"><h4><Sparkles aria-hidden="true"/>Suggested rewrite</h4><p>“{example.rewrite}”</p></div></div><p className="pm-public-resume-why"><Lightbulb aria-hidden="true"/><span><strong>Why it helps:</strong> {example.why}</span></p></article>;
}

export default function AiResumeAssistant() {
    const { auth, memberShell } = usePage<{ auth?: { user?: { is_admin?: boolean } | null }; memberShell?: { featureAccess?: { resume: boolean } } }>().props;
    const isMember = Boolean(auth?.user && !auth.user.is_admin);
    return <PublicLayout siteLayout homePrototype guideLayout>
        <Head title="AI Resume Assistant"><meta name="description" content={description}/></Head>
        <div className="pm-public-resume-page">
            <section className="pm-terms-banner" aria-labelledby="pm-public-resume-title"><div className="pm-public-resume-wrap">
                <nav className="pm-terms-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><a href="/#pm-v2-ai">AI Tools</a><span aria-hidden="true">/</span><span aria-current="page">AI Resume Assistant</span></nav>
                <h1 id="pm-public-resume-title">AI Resume Assistant</h1><p>{description}</p>
            </div></section>
            <div className="pm-public-resume-wrap pm-public-resume-main">
                <section className="pm-public-resume-split pm-public-resume-feature" aria-labelledby="pm-public-resume-experience"><div className="pm-public-resume-copy">
                    <h2 id="pm-public-resume-experience">Make your experience easier to spot</h2><p>Clear headings help a reader find the right section. Specific achievements help them understand your contribution.</p>
                    <div className="pm-public-resume-studies">{studies.map(study => <StudyCard key={study.value} study={study}/>)}</div>
                    <p className="pm-public-resume-note">These figures describe the individual studies. PM Circle’s hiring outcomes are yet to be measured.</p>
                </div><HomePhoto photo="leader" source="/images/resume/experience.webp" alt="" className="pm-public-resume-photo" eager/></section>
                <section aria-labelledby="pm-public-resume-how"><h2 id="pm-public-resume-how">How it works</h2><p className="pm-public-resume-subtitle">Follow a sample résumé from import to export.</p><ol className="pm-public-resume-steps">{steps.map((step, index) => <StepCard key={step.title} step={step} number={index + 1}/>)}</ol></section>
                <section className="pm-public-resume-review" aria-labelledby="pm-public-resume-review-title"><h2 id="pm-public-resume-review-title">See what an AI review could suggest</h2><p>Four sample résumé bullets from project delivery roles.</p>{examples.map(example => <ReviewExample key={example.title} example={example}/>)}<p className="pm-public-resume-note">Before using a suggestion, verify any added detail, responsibility, or number against your own experience.</p></section>
                <section className="pm-public-resume-cta" aria-labelledby="pm-public-resume-start"><div><h2 id="pm-public-resume-start">Start with the résumé you already have</h2><p>Sign in to continue to the member experience. This public preview uses sample content.</p></div><div className="pm-public-resume-actions">{isMember ? <><Link href={memberShell?.featureAccess?.resume ? "/dashboard/resume-assistant" : "/membership"} className="pm-button">{memberShell?.featureAccess?.resume ? "Open Resume Assistant" : "View Plan & usage"}</Link><Link href="/settings/profile?tab=imports" className="pm-guide-button is-outline">Open résumé imports</Link></> : <><Link href="/register" className="pm-guide-button">Create an account</Link><Link href="/login" className="pm-guide-button is-outline">Log in</Link></>}</div></section>
            </div>
        </div>
    </PublicLayout>;
}
