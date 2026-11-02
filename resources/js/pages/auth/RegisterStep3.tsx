import { Head, Link, useForm } from '@inertiajs/react';
import { Check, Lock } from 'lucide-react';
import { useState } from 'react';
import { OnboardingLayout } from '@/layouts/pm/OnboardingLayout';

type PlanPrice = {
    months: number;
    amount_minor: number;
    currency: string;
};

type Plan = {
    code: string;
    name: string;
    benefits: string[];
    prices: PlanPrice[];
};

type Props = {
    plans: Plan[];
    temporaryAccessEnabled: boolean;
};

export default function RegisterStep3({ plans, temporaryAccessEnabled }: Props) {
    // Default to 'plus' and 1 month as shown in the design
    const [selectedPlanCode, setSelectedPlanCode] = useState<string>('plus');
    const [selectedMonths, setSelectedMonths] = useState<number>(1);

    const form = useForm({
        plan: 'plus',
        months: 1,
    });

    const handleSelectPlan = (code: string) => {
        setSelectedPlanCode(code);
        const plan = plans.find((p) => p.code === code);
        const defaultMonths = plan?.prices[0]?.months || 1;
        setSelectedMonths(defaultMonths);
        form.setData({
            plan: code,
            months: defaultMonths,
        });
    };

    const handleSelectDuration = (months: number) => {
        setSelectedMonths(months);
        form.setData('months', months);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/join/step/3');
    };

    // Calculate current total and monthly rate
    const currentPlan = plans.find((p) => p.code === selectedPlanCode);
    const currentPrice = currentPlan?.prices.find((p) => p.months === selectedMonths) || currentPlan?.prices[0];
    const dueTodayAmount = currentPrice ? currentPrice.amount_minor / 100 : 0;

    const plusPlan = plans.find((p) => p.code === 'plus');
    const freePlan = plans.find((p) => p.code === 'free');
    const proPlan = plans.find((p) => p.code === 'pro');

    const durationRows = [
        { months: 1, monthlyRate: 399, billedText: '৳399 monthly', badge: null },
        { months: 3, monthlyRate: 350, billedText: '৳1,050 every 3 months', badge: null },
        { months: 6, monthlyRate: 300, billedText: '৳1,800 every 6 months', badge: null },
        { months: 12, monthlyRate: 250, billedText: '৳3,000 yearly', badge: 'Best value' },
    ];

    return (
        <OnboardingLayout
            title="Choose your plan."
            subtitle="Start free. Upgrade anytime."
            step={3}
        >
            <Head title="Choose your plan" />

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. FREE PLAN CARD */}
                <div
                    onClick={() => handleSelectPlan('free')}
                    className={`rounded-xl border p-4 sm:p-5 cursor-pointer transition-all ${
                        selectedPlanCode === 'free'
                            ? 'border-blue-600 bg-blue-50/20 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            {/* Custom Radio Button */}
                            <div className="mt-0.5">
                                <span
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                        selectedPlanCode === 'free'
                                            ? 'border-blue-600 bg-blue-600'
                                            : 'border-slate-300 bg-white'
                                    }`}
                                >
                                    {selectedPlanCode === 'free' && (
                                        <span className="w-2 h-2 rounded-full bg-white" />
                                    )}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Free</h3>
                                <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-600">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>Community discussions & learning profile</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>Sample questions & simulations</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Price display right */}
                        <div className="text-right shrink-0">
                            <span className="text-xl font-extrabold text-slate-900">৳0</span>
                            <p className="text-xs text-slate-500 mt-0.5">Always free</p>
                        </div>
                    </div>
                </div>

                {/* 2. PLUS PLAN CARD (Highlighted / Expanded) */}
                <div
                    onClick={() => handleSelectPlan('plus')}
                    className={`rounded-xl border-2 p-4 sm:p-5 cursor-pointer transition-all ${
                        selectedPlanCode === 'plus'
                            ? 'border-blue-600 bg-blue-50/15 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            {/* Custom Radio Button */}
                            <div className="mt-0.5">
                                <span
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                        selectedPlanCode === 'plus'
                                            ? 'border-blue-600 bg-blue-600'
                                            : 'border-slate-300 bg-white'
                                    }`}
                                >
                                    {selectedPlanCode === 'plus' && (
                                        <span className="w-2 h-2 rounded-full bg-white" />
                                    )}
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-bold text-slate-900">Plus</h3>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                        Recommended
                                    </span>
                                </div>
                                <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-600">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>Premium lessons & full exam practice</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>Project simulations & AI feedback</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>Ask anonymously</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Price display right */}
                        <div className="text-right shrink-0">
                            <span className="text-base sm:text-lg font-bold text-slate-900">৳399</span>
                            <span className="text-xs sm:text-sm text-slate-600"> / month</span>
                        </div>
                    </div>

                    {/* DURATION TABLE (Visible when Plus is selected) */}
                    {selectedPlanCode === 'plus' && (
                        <div className="mt-4 pt-4 border-t border-blue-100/80">
                            <div className="rounded-lg border border-slate-200 overflow-hidden bg-white text-xs sm:text-sm">
                                {/* Table header */}
                                <div className="grid grid-cols-12 px-3 py-2 bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                                    <span className="col-span-5">Duration</span>
                                    <span className="col-span-3 text-right">Monthly rate</span>
                                    <span className="col-span-4 text-right">Billed amount</span>
                                </div>

                                {/* Table rows */}
                                {durationRows.map((row) => (
                                    <div
                                        key={row.months}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectDuration(row.months);
                                        }}
                                        className={`grid grid-cols-12 items-center px-3 py-2.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors ${
                                            selectedMonths === row.months
                                                ? 'bg-blue-100/40 text-slate-900 font-semibold'
                                                : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <div className="col-span-5 flex items-center gap-2">
                                            <span
                                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                    selectedMonths === row.months
                                                        ? 'border-blue-600 bg-blue-600'
                                                        : 'border-slate-300 bg-white'
                                                }`}
                                            >
                                                {selectedMonths === row.months && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                                )}
                                            </span>
                                            <span>{row.months} {row.months === 1 ? 'month' : 'months'}</span>
                                            {row.badge && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                                                    {row.badge}
                                                </span>
                                            )}
                                        </div>
                                        <div className="col-span-3 text-right">
                                            ৳{row.monthlyRate}
                                        </div>
                                        <div className="col-span-4 text-right text-slate-500 font-normal">
                                            {row.billedText}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500 text-center mt-2.5">
                                Longer plans are paid upfront. Cancel renewal at any time.
                            </p>
                        </div>
                    )}
                </div>

                {/* 3. PRO PLAN CARD */}
                <div
                    onClick={() => handleSelectPlan('pro')}
                    className={`rounded-xl border p-4 sm:p-5 cursor-pointer transition-all ${
                        selectedPlanCode === 'pro'
                            ? 'border-blue-600 bg-blue-50/20 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            {/* Custom Radio Button */}
                            <div className="mt-0.5">
                                <span
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                        selectedPlanCode === 'pro'
                                            ? 'border-blue-600 bg-blue-600'
                                            : 'border-slate-300 bg-white'
                                    }`}
                                >
                                    {selectedPlanCode === 'pro' && (
                                        <span className="w-2 h-2 rounded-full bg-white" />
                                    )}
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-bold text-slate-900">Pro</h3>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                        Suggested plan
                                    </span>
                                </div>
                                <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-600">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>Everything in Plus + advanced simulations</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>Higher AI allowance, resume & interview tools</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Price display right */}
                        <div className="text-right shrink-0">
                            <span className="text-base sm:text-lg font-bold text-slate-900">৳699</span>
                            <span className="text-xs sm:text-sm text-slate-600"> / month</span>
                        </div>
                    </div>
                </div>

                {/* Compare all features link */}
                <div className="text-center pt-1">
                    <a
                        href="/pricing"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        Compare all features
                    </a>
                </div>

                {/* Dynamic Summary Bar */}
                <div className="rounded-lg bg-slate-100/80 px-4 py-3 flex items-center justify-between text-sm font-bold text-slate-900">
                    <span>
                        {selectedPlanCode === 'free'
                            ? 'Free'
                            : selectedPlanCode === 'plus'
                              ? `Plus · ${selectedMonths} ${selectedMonths === 1 ? 'month' : 'months'}`
                              : `Pro · 1 month`}
                    </span>
                    <span>Due today: ৳{dueTodayAmount.toLocaleString()}</span>
                </div>

                {/* Action Button & Sub-links */}
                <div className="space-y-3 pt-1">
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        {form.processing
                            ? 'Processing...'
                            : selectedPlanCode === 'free'
                              ? 'Start with Free →'
                              : 'Continue to payment →'}
                    </button>

                    {selectedPlanCode !== 'free' && (
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => handleSelectPlan('free')}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                            >
                                Start with Free instead
                            </button>
                        </div>
                    )}

                    <div className="text-center">
                        <Link
                            href="/join/step/2"
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                        >
                            Back
                        </Link>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Review payment details before subscribing.</span>
                    </div>
                </div>
            </form>
        </OnboardingLayout>
    );
}
