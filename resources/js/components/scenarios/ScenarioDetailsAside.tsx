import { Link } from '@inertiajs/react';
import { Clock, Cpu, Sliders, Target, Users } from 'lucide-react';

type ScenarioInfo = {
    difficulty: string;
    focus: string;
    minutes: number;
};

function ScenarioFactRow({ icon: Icon, label, value }: {
    icon: typeof Clock;
    label: string;
    value: string;
}) {
    return <div className="pm-scenario-detail-info-row">
        <Icon size={21} aria-hidden="true" />
        <span>{label}</span>
        <strong>{value}</strong>
    </div>;
}

/** Reusable scenario context cards; does not change member access rules. */
export function ScenarioDetailsAside({ scenario, isGuest }: { scenario: ScenarioInfo; isGuest: boolean }) {
    return <>
        <section className="pm-sidebar-card pm-scenario-detail-aside-card" aria-labelledby="scenario-about-heading">
            <h3 id="scenario-about-heading">About this scenario</h3>
            <ScenarioFactRow icon={Sliders} label="Difficulty" value={scenario.difficulty} />
            <ScenarioFactRow icon={Target} label="Focus" value={scenario.focus} />
            <ScenarioFactRow icon={Clock} label="Practice time" value={`5–${scenario.minutes} minutes`} />
        </section>

        <section className="pm-sidebar-card pm-scenario-detail-aside-card pm-scenario-detail-ai" aria-labelledby="scenario-ai-heading">
            <h3 id="scenario-ai-heading"><Cpu size={23} aria-hidden="true" />How AI feedback works</h3>
            <p>Responses are reviewed for reasoning, trade-offs, stakeholder involvement and practical next steps.</p>
            <p className="pm-scenario-detail-ai-note">AI feedback can be imperfect. Use your judgment.</p>
            <a href="#assessment-criteria" className="pm-text-link">View assessment criteria →</a>
        </section>

        <section className="pm-cta-guest-card pm-scenario-detail-aside-card pm-scenario-detail-join" aria-labelledby="scenario-join-heading">
            <Users size={30} className="pm-cta-guest-icon" aria-hidden="true" />
            <h3 id="scenario-join-heading">Your perspective belongs here.</h3>
            <p>Respond, learn from feedback and track your progress.</p>
            <Link href="/register" className="pm-button pm-btn-full">Join the community — free</Link>
            <small>Member photos and full profiles are visible after sign-in.</small>
            {isGuest && <span className="pm-cta-guest-login">Already a member? <Link href="/login">Log in</Link></span>}
        </section>
    </>;
}
