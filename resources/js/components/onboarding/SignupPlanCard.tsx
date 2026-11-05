import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

export type PlanPrice = { months: number; amount_minor: number; currency: string };
export type Plan = { code: string; name: string; benefits: string[]; prices: PlanPrice[] };

export function formatAmount(amountMinor: number, currency: string): string {
    const amount = (amountMinor / 100).toLocaleString('en-BD', { maximumFractionDigits: 2 });
    return currency === 'BDT' ? `৳${amount}` : `${amount} ${currency}`;
}

const planBadges: Record<string, string> = { plus: 'Recommended', pro: 'Suggested plan' };

export function SignupPlanCard({ plan, selected, onSelect, children }: {
    plan: Plan; selected: boolean; onSelect: () => void; children?: ReactNode;
}) {
    const firstPrice = plan.prices.find((price) => price.months === 1) ?? plan.prices[0];
    const monthlyAmount = firstPrice ? firstPrice.amount_minor / firstPrice.months : 0;
    return (
        <article className={`signup-plan-card ${selected ? 'is-selected' : ''}`}>
            <label className="signup-plan-main">
                <input type="radio" className="signup-visually-hidden" name="signup-plan-choice" value={plan.code} checked={selected} onChange={onSelect} />
                <span className="signup-plan-radio" aria-hidden="true" />
                <span className="signup-plan-description">
                    <span className="signup-plan-title">{plan.name}{planBadges[plan.code] && <span className="signup-plan-badge">{planBadges[plan.code]}</span>}</span>
                    <span className="signup-plan-benefits">
                        {plan.benefits.map((benefit, index) => <span className="signup-plan-benefit" key={`${index}-${benefit}`}><Check size={14} strokeWidth={2} aria-hidden="true" />{benefit}</span>)}
                    </span>
                </span>
                <span className="signup-plan-price">
                    <strong>{firstPrice ? formatAmount(monthlyAmount, firstPrice.currency) : '—'}</strong>
                    {plan.code !== 'free' && <span> / month</span>}
                    {plan.code === 'free' && <p>Always free</p>}
                </span>
            </label>
            {children && <div className="signup-plan-expander" aria-hidden={!selected} inert={!selected}>
                <div className="signup-plan-expander-inner">{children}</div>
            </div>}
        </article>
    );
}

export function SignupDurationTable({ prices, selectedMonths, onChange }: {
    prices: PlanPrice[]; selectedMonths: number; onChange: (months: number) => void;
}) {
    return (
        <div className="signup-duration-table" role="group" aria-label="Choose membership duration">
            <div className="signup-duration-row is-header" aria-hidden="true">
                <span>Duration</span><span>Monthly rate</span><span>Billed amount</span>
            </div>
            {prices.map((price) => {
                const selected = price.months === selectedMonths;
                const isBest = price.months === Math.max(...prices.map((p) => p.months)) && prices.length > 1;
                const amount = formatAmount(price.amount_minor, price.currency);
                return (
                    <button type="button" key={price.months} className={`signup-duration-row ${selected ? 'is-checked' : ''}`}
                        aria-pressed={selected} onClick={() => onChange(price.months)}>
                        <span className="signup-duration-name"><span className="signup-duration-radio" aria-hidden="true" />{price.months} {price.months === 1 ? 'month' : 'months'} {isBest && <span className="signup-plan-badge">Best value</span>}</span>
                        <span>{formatAmount(price.amount_minor / price.months, price.currency)}</span>
                        <span>{amount} {price.months === 1 ? 'monthly' : price.months === 12 ? 'yearly' : `every ${price.months} months`}</span>
                    </button>
                );
            })}
        </div>
    );
}
