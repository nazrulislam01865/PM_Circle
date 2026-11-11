import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { careerTotal, completionPlan, industries, internationalRoutes, processSteps, projectRoles, salaryExamples, supportAreas,
    type IndustryId, type SalaryMarket, type SupportAreaId } from '@/data/discover-career';
import { DiscoverActions, DiscoverCard } from './DiscoverShell';

type Navigation = { onBack: () => void; onNext: () => void };

function InfoPanel({ title, children, eyebrow }: { title: string; children: ReactNode; eyebrow?: string }) {
    return <section className="pm-discover-career-info">
        {eyebrow && <p className="pm-discover-career-info-label">{eyebrow}</p>}
        <h2>{title}</h2><div>{children}</div>
    </section>;
}

function DetailRows({ items }: { items: readonly { title: string; description: string }[] }) {
    return <div className="pm-discover-detail-rows">
        {items.map(item => <section className="pm-discover-detail-row" key={item.title}>
            <h2>{item.title}</h2><p>{item.description}</p>
        </section>)}
    </div>;
}

function SelectionPills<T extends string>({ items, selected, onSelect, label }: {
    items: readonly { id: T; name: string }[];
    selected: T;
    onSelect: (id: T) => void;
    label: string;
}) {
    return <div className="pm-discover-pills" role="group" aria-label={label}>
        {items.map(item => <button key={item.id} type="button" className={`pm-discover-pill${selected === item.id ? ' is-selected' : ''}`}
            aria-pressed={selected === item.id} onClick={() => onSelect(item.id)}>{item.name}</button>)}
    </div>;
}

export function CareerScreen({ index, industry, onIndustryChange, salaryMarket, onSalaryMarketChange, salaryRole, onSalaryRoleChange, onBack, onNext }: {
    index: number;
    industry: IndustryId;
    onIndustryChange: (value: IndustryId) => void;
    salaryMarket: SalaryMarket;
    onSalaryMarketChange: (value: SalaryMarket) => void;
    salaryRole: number;
    onSalaryRoleChange: (value: number) => void;
} & Navigation) {
    const eyebrow = `DISCOVER THE CAREER · ${index + 1} OF ${careerTotal}`;
    const industryData = industries.find(item => item.id === industry) ?? industries[0];
    const pay = salaryExamples[salaryMarket];
    const selectedRole = pay.roles[salaryRole] ?? pay.roles[0];
    const nextLabels = [
        'How does the work happen?', 'Who does this work?', 'Explore different industries', 'Explore Bangladesh opportunities',
        'What about international careers?', 'Explore pay & progression', 'See my next step', 'Try the beginner sample',
    ];
    let content: ReactNode;
    switch (index) {
        case 0:
            content = <DiscoverCard eyebrow={eyebrow} title="What is project management?"
                description="Helping people organise temporary work to achieve a defined result.">
                <InfoPanel title="Think of a campus event.">
                    <p>It has a goal, a deadline, people, a budget and an outcome. Coordinating those pieces is project work.</p>
                </InfoPanel>
                <p className="pm-discover-career-after-panel">A project manager helps the team plan, communicate, make decisions and respond to change.</p>
                <DiscoverActions onBack={onBack} onNext={onNext} nextLabel={nextLabels[index]}/>
            </DiscoverCard>;
            break;
        case 1:
            content = <DiscoverCard eyebrow={eyebrow} title="How does the work happen?">
                <DetailRows items={processSteps}/>
                <p className="pm-discover-career-caption">Teams may work iteratively or follow a more sequential approach. The exact process depends on the project.</p>
                <DiscoverActions onBack={onBack} onNext={onNext} nextLabel={nextLabels[index]}/>
            </DiscoverCard>;
            break;
        case 2:
            content = <DiscoverCard eyebrow={eyebrow} title="Who works in project management?">
                <DetailRows items={projectRoles}/>
                <p className="pm-discover-career-caption">Titles vary. People may enter from operations, engineering, technology, business or other backgrounds.</p>
                <DiscoverActions onBack={onBack} onNext={onNext} nextLabel={nextLabels[index]}/>
            </DiscoverCard>;
            break;
        case 3:
            content = <DiscoverCard eyebrow={eyebrow} title="Where can you find project work?"
                description="Select an industry to see a simple example.">
                <SelectionPills items={industries} selected={industry} onSelect={onIndustryChange} label="Choose an industry"/>
                <InfoPanel title={`Example: ${industryData.example}`}><p>{industryData.detail}</p></InfoPanel>
                <DiscoverActions onBack={onBack} onNext={onNext} nextLabel={nextLabels[index]}/>
            </DiscoverCard>;
            break;
        case 4:
            content = <DiscoverCard eyebrow={eyebrow} title="Explore opportunities in Bangladesh."
                description="Use these sample search directions to learn what employers ask for.">
                <div className="pm-discover-career-twocol">
                    <section className="pm-discover-career-outline"><h2>Starting roles</h2><p>Project Assistant<br/>Project Coordinator<br/>PMO Analyst</p></section>
                    <section className="pm-discover-career-outline"><h2>Places to explore</h2><p>Technology &amp; services<br/>Construction &amp; engineering<br/>Development organisations</p></section>
                </div>
                <InfoPanel title="Read the job description, not just the title.">
                    <p>Look for required experience, responsibilities, tools, sector knowledge and location.</p>
                </InfoPanel>
                <p className="pm-discover-career-warning">Illustrative career directions. This prototype does not show live vacancies or a measured Bangladesh demand forecast.</p>
                <DiscoverActions onBack={onBack} onNext={onNext} nextLabel={nextLabels[index]}/>
            </DiscoverCard>;
            break;
        case 5:
            content = <DiscoverCard eyebrow={eyebrow} title="Explore international routes.">
                <DetailRows items={internationalRoutes}/>
                <InfoPanel title="Meet the people doing the work">
                    <p><strong>Sara · Project Coordinator</strong></p>
                    <p>“I started by organising updates and following up on actions. I learned by supporting a small delivery team.”</p>
                    <p className="pm-discover-career-caption">Fictional persona for this prototype; not a real testimonial.</p>
                </InfoPanel>
                <p className="pm-discover-career-caption">Remote does not always mean available in every country. A certification alone does not guarantee a role.</p>
                <DiscoverActions onBack={onBack} onNext={onNext} nextLabel={nextLabels[index]}/>
            </DiscoverCard>;
            break;
        case 6:
            content = <DiscoverCard eyebrow={eyebrow} title="How might pay change with a role?">
                <p className="pm-discover-career-warning"><strong>DEMO VALUES ONLY — not salary research or market averages.</strong> These invented ranges demonstrate the interface. Do not use them for career or pay decisions.</p>
                <SelectionPills items={Object.entries(salaryExamples).map(([id, data]) => ({ id: id as SalaryMarket, name: data.label }))}
                    selected={salaryMarket} onSelect={onSalaryMarketChange} label="Choose a salary example market"/>
                <div className="pm-discover-career-salary-roles" role="group" aria-label="Choose an illustrative role">
                    {pay.roles.map((role, roleIndex) => <button type="button" key={role.title}
                        className={`pm-discover-career-role${salaryRole === roleIndex ? ' is-selected' : ''}`}
                        aria-pressed={salaryRole === roleIndex} onClick={() => onSalaryRoleChange(roleIndex)}>{role.label}</button>)}
                </div>
                <section className="pm-discover-career-info pm-discover-career-pay" aria-live="polite">
                    <h2>{selectedRole.title} · Illustrative range</h2>
                    <p className="pm-discover-career-pay-number">{pay.symbol}{selectedRole.range}</p>
                    <p className="pm-discover-career-caption">{pay.unit}</p>
                </section>
                <p className="pm-discover-career-pay-note">Actual pay depends on country, industry, employer, responsibility, experience and benefits. There is no guaranteed timeline for promotion.</p>
                <details className="pm-discover-career-privacy"><summary>What the live version must show</summary>
                    <p>Verified location-specific salary sources, collection dates, sample sizes, currency, employment type and limitations before pay figures are presented as market data.</p>
                </details>
                <DiscoverActions onBack={onBack} onNext={onNext} nextLabel={nextLabels[index]}/>
            </DiscoverCard>;
            break;
        case 7:
        default:
            content = <DiscoverCard eyebrow={eyebrow} title="You have a starting point."
                description="You explored your preferences, connected them with PM work and learned about possible career routes.">
                <InfoPanel title="Try a Student & Beginner sample.">
                    <p>Start with a worked example from a small project. Then reflect on whether you want to continue.</p>
                </InfoPanel>
                <h2 className="pm-discover-career-list-title">A small plan for your next week</h2>
                <div className="pm-discover-career-plan">{completionPlan.map(step => <p key={step}>{step}</p>)}</div>
                <p className="pm-discover-career-caption">Your exploration is not a qualification or a prediction of career success.</p>
                <DiscoverActions onBack={onBack} onNext={onNext} nextLabel={nextLabels[index]}/>
                <button className="pm-discover-print" type="button" onClick={() => window.print()}>Print / save this reflection as PDF</button>
            </DiscoverCard>;
    }
    return content;
}

export function BeginnerGoalScreen({ goal, error, onChange, onBack, onNext }: {
    goal: string;
    error: string;
    onChange: (value: string) => void;
} & Navigation) {
    return <DiscoverCard eyebrow="BEGINNER SAMPLE · FREE TO TRY" title="Start with a clear goal."
        description="Your friends want to organise a student career meetup. Before choosing a venue or making a schedule, write down the result you want.">
        <InfoPanel title="A useful project goal">
            <p>“Help 30 students understand three entry-level career routes through a two-hour meetup.”</p>
        </InfoPanel>
        <p className="pm-discover-career-after-panel">It describes who benefits, what changes and a clear boundary for the activity.</p>
        <form noValidate onSubmit={event => { event.preventDefault(); onNext(); }}>
            <label className="pm-discover-goal-label" htmlFor="pm-discover-goal">Try your own goal</label>
            <textarea id="pm-discover-goal" className="pm-discover-goal-input" value={goal} maxLength={500}
                onChange={event => onChange(event.target.value)} rows={3} aria-invalid={Boolean(error)}
                aria-describedby={error ? 'pm-discover-goal-error' : 'pm-discover-goal-helper'}
                placeholder="Help [who] achieve [what] by [when]…"/>
            {error ? <p role="alert" className="pm-discover-goal-error" id="pm-discover-goal-error">{error}</p>
                : <p className="pm-discover-career-caption" id="pm-discover-goal-helper">Your goal stays in this browser. The next step gives a simple review checklist.</p>}
            <div className="pm-discover-actions">
                <button type="button" className="btn secondary pm-discover-action" onClick={onBack}>← My next step</button>
                <button type="submit" className="btn pm-discover-action">Review my goal</button>
            </div>
        </form>
    </DiscoverCard>;
}

export function BeginnerReviewScreen({ goal, onBack, onNext }: { goal: string } & Navigation) {
    return <DiscoverCard eyebrow="YOUR FIRST STEP" title="You have started thinking like a planner."
        description="Here is the goal you wrote.">
        <div className="pm-discover-career-info pm-discover-goal-result">{goal}</div>
        <h2 className="pm-discover-career-list-title">Give it three quick checks</h2>
        <div className="pm-discover-career-checks">
            <p><strong>Who benefits?</strong> Name the people you want to help.</p>
            <p><strong>What changes?</strong> Describe a useful, observable result.</p>
            <p><strong>By when?</strong> Set a clear time boundary.</p>
        </div>
        <p className="pm-discover-career-caption">This is a reflection checklist, not an AI assessment of your goal.</p>
        <DiscoverActions onBack={onBack} onNext={onNext} nextLabel="How can PM Circle help me?"/>
    </DiscoverCard>;
}

export function PlatformScreen({ selected, onSelect, onBack, onNext }: {
    selected: SupportAreaId;
    onSelect: (id: SupportAreaId) => void;
} & Navigation) {
    const item = supportAreas.find(area => area.id === selected) ?? supportAreas[0];
    return <DiscoverCard eyebrow="YOUR JOURNEY WITH PM CIRCLE" title="A place to keep growing."
        description="Choose an area to see how it can support your next step.">
        <SelectionPills items={supportAreas.map(area => ({ id: area.id, name: area.label }))}
            selected={selected} onSelect={onSelect} label="Explore PM Circle support areas"/>
        <InfoPanel title={item.title} eyebrow={item.eyebrow}><p>{item.description}</p></InfoPanel>
        <section className="pm-discover-career-outline pm-discover-career-small-step" aria-live="polite">
            <h2>A small next step</h2><p>{item.step}</p>
        </section>
        <p className="pm-discover-career-caption">Your learning and contributions can strengthen your profile. They do not guarantee a job, certification or professional connection.</p>
        <DiscoverActions onBack={onBack} onNext={onNext} nextLabel="Choose my next step"/>
    </DiscoverCard>;
}

const finalChoices = [
    { title: 'Begin learning', description: 'Return to the free beginner sample.' },
    { title: 'Explore the community', description: 'Preview a practical conversation.' },
    { title: 'Join PM Circle — free', description: 'See how your discovery carries into onboarding.' },
] as const;

export function FinalChoiceScreen({ choice, onSelect, onBack, onBeginSample }: {
    choice: number | null;
    onSelect: (index: number) => void;
    onBack: () => void;
    onBeginSample: () => void;
}) {
    return <DiscoverCard eyebrow="CONTINUE AT YOUR OWN PACE" title="What would help you most right now?"
        description="You can keep exploring without registering, or join when you want to record your learning and take part.">
        <fieldset className="pm-discover-final-choices"><legend className="sr-only">Choose your next step</legend>
            {finalChoices.map((item, index) => <label key={item.title} className={`pm-discover-final-choice${choice === index ? ' is-selected' : ''}`}>
                <input type="radio" name="pm-discover-final-choice" checked={choice === index} onChange={() => onSelect(index)}/>
                <span><strong>{item.title}</strong><small>{item.description}</small></span>
            </label>)}
        </fieldset>
        {choice !== null && <div className="pm-discover-final-selected" aria-live="polite">
            {choice === 0 ? <button type="button" className="btn pm-discover-action" onClick={onBeginSample}>Begin learning →</button>
                : <Link className="btn pm-discover-action" href={choice === 1 ? '/community' : '/register'}>
                    {choice === 1 ? 'Explore the community →' : 'Join PM Circle →'}</Link>}
        </div>}
        <div className="pm-discover-actions">
            <button type="button" className="btn secondary pm-discover-action" onClick={onBack}>← Back</button>
            <button type="button" className="pm-discover-print" onClick={() => window.print()}>Print this page</button>
        </div>
        <p className="pm-discover-career-caption">Prototype preview: no account is created and no data is submitted.</p>
    </DiscoverCard>;
}
