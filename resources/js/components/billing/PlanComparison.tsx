import { Check, BookOpen, BrainCircuit, BriefcaseBusiness, ChartNoAxesColumnIncreasing, FileText, IdCard, Link2, MessageCircle, RefreshCw, Settings, Shield, Trophy, UserRound, UsersRound, Eye, Target } from 'lucide-react';
import type { ComponentType } from 'react';

const icons = { BookOpen, BrainCircuit, BriefcaseBusiness, ChartNoAxesColumnIncreasing, FileText, IdCard, Link2, MessageCircle, RefreshCw, Settings, Shield, Trophy, UserRound, UsersRound, Eye, Target } satisfies Record<string, ComponentType<{ size?: number; strokeWidth?: number }>>;
export type ComparisonGroup = { enabled: boolean; title: string; rows: { label: string; description?: string; icon: string; free: string; plus: string; pro: string }[] };

// Display-only values. Laravel remains authoritative for feature access.
function Cell({ value }: { value: string }) {
    return <span className={value === 'Included' ? 'pm-compare-check' : value === 'Full access' ? 'pm-compare-value pm-compare-full' : 'pm-compare-value'}>
        {value === 'Included' ? <Check size={21} strokeWidth={3} aria-label="Included"/> : value.toLowerCase() === 'not included' ? <span aria-label="Not included">—</span> : value}
    </span>;
}
export function PlanComparisonRows({ sections }: { sections: ComparisonGroup[] }) {
    return <>
        {sections.filter(group => group.enabled).map((group, index) => <tbody key={index}>
            <tr className="pm-compare-group"><th colSpan={4} scope="rowgroup">{group.title}</th></tr>
            {group.rows.map((row, rowIndex) => { const Icon = icons[row.icon as keyof typeof icons] ?? FileText; return <tr key={rowIndex}>
                <th scope="row"><span className="pm-compare-row-label"><Icon size={18} strokeWidth={1.8} aria-hidden="true"/><span title={row.description}>{row.label}</span></span></th>
                <td><Cell value={row.free}/></td><td className="pm-compare-plus"><Cell value={row.plus}/></td><td><Cell value={row.pro}/></td>
            </tr>; })}
        </tbody>)}
    </>;
}
