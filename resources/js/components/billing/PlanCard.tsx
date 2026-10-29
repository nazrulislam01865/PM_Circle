import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export type Plan = { code: string; name: string; benefits: string[]; prices: { months: number; amount_minor: number; currency: string }[] };
export function PlanCard({ plan, active, onSelect, children }: { plan: Plan; active: boolean; onSelect: () => void; children?: ReactNode }) {
    const month = plan.prices.find(p => p.months === 1);
    return <section className={`pm-plan-card ${active ? 'selected' : ''}`}>
        <button type="button" className="pm-plan-header" onClick={onSelect} aria-pressed={active}><span className={`pm-radio ${active ? 'checked' : ''}`} /><strong>{plan.name}</strong>{plan.code === 'plus' && <span className="pm-recommended">Recommended</span>}<div className="pm-plan-price"><strong>৳{((month?.amount_minor ?? 0)/100).toLocaleString('en-BD')}{plan.code !== 'free' && <span> / month</span>}</strong><small>{plan.code === 'free' ? 'Always free' : 'Monthly plan'}</small></div></button>
        <ul className="pm-plan-benefits">{plan.benefits?.map(text => <li key={text}><Check size={19} />{text}</li>)}</ul>
        {children}
    </section>;
}
