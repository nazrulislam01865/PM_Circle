import { Check, BookOpen, BrainCircuit, BriefcaseBusiness, ChartNoAxesColumnIncreasing, FileText, IdCard, Link2, MessageCircle, RefreshCw, Settings, Shield, Trophy, UserRound, UsersRound, Eye, Target } from 'lucide-react';
import type { ComponentType } from 'react';

type Benefit = boolean | string;
type ComparisonRow = { label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }>; free: Benefit; plus: Benefit; pro: Benefit };
type ComparisonGroup = { title: string; rows: ComparisonRow[] };

// The feature vocabulary is taken from the supplied comparison prototype.
// Access to features is ALWAYS enforced by Laravel; this table is informational.
const groups: ComparisonGroup[] = [
    { title: 'Community & profile', rows: [
        { label: 'Professional profile & photo upload', icon: UserRound, free: true, plus: true, pro: true },
        { label: 'Posts, comments, reactions & sharing', icon: UsersRound, free: true, plus: true, pro: true },
        { label: 'Basic privacy & visibility controls', icon: Shield, free: true, plus: true, pro: true },
        { label: 'Link your LinkedIn profile', icon: Link2, free: true, plus: true, pro: true },
        { label: 'Import profile from LinkedIn PDF / export', icon: FileText, free: true, plus: true, pro: true },
        { label: 'Re-import with review before updating', icon: RefreshCw, free: true, plus: true, pro: true },
        { label: 'Achievements & learning record', icon: Trophy, free: true, plus: true, pro: true },
    ] },
    { title: 'Learn & practice', rows: [
        { label: 'Short lessons & learning paths', icon: BookOpen, free: 'Samples', plus: 'Full access', pro: 'Full access' },
        { label: 'PMP & Scrum practice questions', icon: FileText, free: 'Samples', plus: 'Full access', pro: 'Full access' },
        { label: 'Standard project scenarios', icon: Target, free: 'Samples', plus: true, pro: true },
        { label: 'Advanced project simulations', icon: ChartNoAxesColumnIncreasing, free: false, plus: false, pro: true },
        { label: 'AI feedback credits / month', icon: BrainCircuit, free: false, plus: '50', pro: '150' },
    ] },
    { title: 'Career & insights', rows: [
        { label: 'Browse jobs & save opportunities', icon: BriefcaseBusiness, free: true, plus: true, pro: true },
        { label: 'Share professional profile & portfolio', icon: IdCard, free: true, plus: true, pro: true },
        { label: 'Profile-view totals & trends', icon: ChartNoAxesColumnIncreasing, free: false, plus: true, pro: true },
        { label: 'Recent viewer details*', icon: Eye, free: false, plus: false, pro: true },
        { label: 'AI resume builder & PDF export', icon: FileText, free: false, plus: false, pro: true },
        { label: 'AI interview practice', icon: MessageCircle, free: false, plus: false, pro: true },
        { label: 'Recruiter resume access controls', icon: Settings, free: false, plus: false, pro: true },
    ] },
];

function Cell({ value }: { value: Benefit }) {
    return <span className={value === true ? 'pm-compare-check' : 'pm-compare-value'}>
        {value === true ? <Check size={21} strokeWidth={3} aria-label="Included"/> : value === false ? <span aria-label="Not included">—</span> : value}
    </span>;
}
export function PlanComparisonRows() {
    return <>
        {groups.map(group => <tbody key={group.title}>
            <tr className="pm-compare-group"><th colSpan={4} scope="rowgroup">{group.title}</th></tr>
            {group.rows.map(row => { const Icon = row.icon; return <tr key={row.label}>
                <th scope="row"><Icon size={18} strokeWidth={1.8}/><span>{row.label}</span></th>
                <td><Cell value={row.free}/></td><td className="pm-compare-plus"><Cell value={row.plus}/></td><td><Cell value={row.pro}/></td>
            </tr>; })}
        </tbody>)}
    </>;
}
