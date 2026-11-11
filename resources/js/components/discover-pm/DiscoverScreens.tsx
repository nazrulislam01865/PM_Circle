import type { ReactNode } from 'react';
import { FormField } from '@/components/pm/FormField';
import { DiscoverActions, DiscoverCard } from './DiscoverShell';
import {
    getDiscoverResults, interestAreas, profileFields, reflectionQuestions,
    type ProfileAnswers, type ProfileField,
} from '@/data/discover-pm';

export function IntroScreen({ onBegin }: { onBegin: () => void }) {
    return <DiscoverCard eyebrow="PUBLIC DISCOVERY · ABOUT 10 MINUTES" title="A career journey that starts with you."
        description="Tell us a little about your background. Explore relevant questions, try a small situation and choose what you want to learn next.">
        <div className="pm-discover-info">
            <h2>One question. One small step.</h2>
            <p>No account needed. You can return, change answers or leave whenever you like.</p>
        </div>
        <p className="pm-discover-fine-print">Self-reflection is not a validated personality assessment. A short practice check gives limited evidence, not a career verdict.</p>
        <details className="pm-discover-privacy">
            <summary>What happens to my information?</summary>
            <p>Your choices are saved in this browser only, so you can continue later on the same device. They are not sent to PM Circle. Use your browser’s site-data controls to clear saved answers. Avoid using a shared device if you want your answers to remain private.</p>
        </details>
        <button type="button" className="btn pm-discover-action pm-discover-begin" onClick={onBegin}>Let’s begin →</button>
    </DiscoverCard>;
}

export function AboutScreen({ profile, errors, onChange, onBack, onNext }: {
    profile: ProfileAnswers;
    errors: Partial<Record<ProfileField, string>>;
    onChange: (name: ProfileField, value: string) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    return <DiscoverCard eyebrow="ABOUT YOU · A SHORT INTRODUCTION" title="Where are you starting from?"
        description="Your experience and goal shape the questions. Age and education do not determine your ability.">
        <form noValidate onSubmit={event => { event.preventDefault(); onNext(); }}>
            <div className="pm-discover-form-grid">
                {(Object.keys(profileFields) as ProfileField[]).map(field => <FormField key={field} htmlFor={`pm-discover-${field}`}
                    label={profileFields[field].label}>
                    <select id={`pm-discover-${field}`} value={profile[field]} onChange={event => onChange(field, event.target.value)}
                        aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `pm-discover-${field}-error` : undefined}>
                        {!['education', 'age'].includes(field) && <option value="">Select an option</option>}
                        {profileFields[field].options.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                    {errors[field] && <p className="pm-error" id={`pm-discover-${field}-error`} role="alert">{errors[field]}</p>}
                </FormField>)}
            </div>
            <p className="pm-discover-form-note">No name, email or date of birth required. You can change these choices later.</p>
            <div className="pm-discover-actions">
                <button type="button" className="btn secondary pm-discover-action" onClick={onBack}>← Back</button>
                <button type="submit" className="btn pm-discover-action">Find my route →</button>
            </div>
        </form>
    </DiscoverCard>;
}

function Choice({ selected, label, name, value, onSelect }: { selected: boolean; label: string; name: string; value: number; onSelect: (value: number) => void }) {
    return <label className={`pm-discover-choice${selected ? ' is-selected' : ''}`}>
        <input type="radio" name={name} checked={selected} onChange={() => onSelect(value)} value={value}/>
        <span>{label}</span>
    </label>;
}

export function QuestionScreen({ index, selected, onSelect, onBack, onNext }: {
    index: number;
    selected: number | null;
    onSelect: (value: number) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    const question = reflectionQuestions[index];
    return <DiscoverCard eyebrow={`START A PM CAREER · QUESTION ${index + 1} OF ${reflectionQuestions.length} · ${question.eyebrow}`}
        title={question.title} description="Choose what is closest to you. These are preferences, not right or wrong answers.">
        <fieldset className="pm-discover-choices"><legend className="sr-only">Select your answer</legend>
            {question.options.map((option, choiceIndex) => <Choice key={option.label} label={option.label}
                selected={selected === choiceIndex} name={`pm-discover-question-${index}`} value={choiceIndex} onSelect={onSelect}/>)}
        </fieldset>
        <DiscoverActions onBack={onBack} onNext={onNext} nextLabel={index === reflectionQuestions.length - 1 ? 'See my reflection' : 'Next question'} disabled={selected === null}/>
    </DiscoverCard>;
}

export function FindingsScreen({ answers, onBack, onNext }: {
    answers: (number | null)[];
    onBack: () => void;
    onNext: () => void;
}) {
    const { scores } = getDiscoverResults(answers);
    return <DiscoverCard eyebrow="YOUR FINDINGS → PROJECT MANAGEMENT" title="Where your preferences may connect."
        description="These are areas to explore, not a judgement of your ability.">
        <div className="pm-discover-findings">
            {interestAreas.map(area => <section className="pm-discover-finding" key={area.id}>
                <div className="pm-discover-finding-heading"><h2>{area.title}</h2><span className="pm-discover-mini-badge">{scores[area.id] > 0 ? 'Worth exploring' : 'Try to learn more'}</span></div>
                <p className="pm-discover-area-description">{area.description}</p>
                <p className="pm-discover-try"><strong>Try:</strong> {area.activity}</p>
            </section>)}
        </div>
        <p className="pm-discover-findings-note">A less-selected area is not a weakness. Use small exercises and feedback to identify what actually needs development.</p>
        <DiscoverActions onBack={onBack} onNext={onNext} nextLabel="What is project management?"/>
    </DiscoverCard>;
}

const practiceAnswers = [
    'Give every task the same priority',
    'Identify dependencies and agree owners and priorities',
    'Wait until the deadline is closer',
];

export function PracticeScreen({ selected, onSelect, onBack, onNext }: {
    selected: number | null;
    onSelect: (value: number) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    return <DiscoverCard eyebrow="PRACTICE CHECK · ONE SITUATION"
        title="Your team has five tasks and two are blocking others. What is a useful first step?"
        description="This question explores your reasoning about a project situation.">
        <fieldset className="pm-discover-choices pm-discover-practice-choices"><legend className="sr-only">Choose a first step</legend>
            {practiceAnswers.map((label, index) => <Choice key={label} label={label} name="pm-discover-practice" value={index} selected={selected === index} onSelect={onSelect}/>)}
        </fieldset>
        <div className="pm-discover-feedback" aria-live="polite">
            <h2>A useful starting approach</h2>
            <p>Understanding dependencies helps a team sequence work and decide what needs attention first.</p>
            <small>One response does not measure your overall competence.</small>
        </div>
        <DiscoverActions onBack={onBack} onNext={onNext} nextLabel="See my learning direction"/>
    </DiscoverCard>;
}

function NextSection({ title, children }: { title: string; children: ReactNode }) {
    return <section className="pm-discover-next-section"><h2>{title}</h2>{children}</section>;
}

export function NextStepScreen({ answers, onBack, onNext }: { answers: (number | null)[]; onBack: () => void; onNext: () => void }) {
    const { career, recommended } = getDiscoverResults(answers);
    const area = interestAreas.find(item => item.id === recommended)!;
    return <DiscoverCard eyebrow="YOUR NEXT STEP · A LEARNING DIRECTION" title="A path you could explore."
        description="Based on the interests you selected, here is one possible PM-related career direction to investigate. It is not an assessment of job readiness.">
        <div className="pm-discover-next-section pm-discover-next-overview">
            <h2>What is project management?</h2>
            <p>Project management is the practice of organising people, tasks and resources to deliver an outcome. Project professionals plan work, communicate with stakeholders, manage changes and make thoughtful trade-offs.</p>
        </div>
        <div className="pm-discover-next-highlight">
            <span className="pm-discover-next-label">Suggested career direction</span>
            <h2>{career.title}</h2><p>{career.description}</p>
        </div>
        <NextSection title="Why explore this path?"><p>Your answers connected most often with {area.title.toLowerCase()}. That is an interest to explore, not a verified skill or a guarantee that this role will be the right fit.</p></NextSection>
        <NextSection title="What to learn next"><ul>{career.skills.map(skill => <li key={skill}>{skill}</li>)}</ul></NextSection>
        <NextSection title="One small starting activity"><p>{career.nextAction}</p></NextSection>
        <div className="pm-discover-actions">
            <button type="button" className="btn secondary pm-discover-action" onClick={onBack}>← Back</button>
            <button type="button" className="btn pm-discover-action" onClick={onNext}>What is project management? →</button>
        </div>
    </DiscoverCard>;
}
