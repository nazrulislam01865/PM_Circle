import {
    BookOpen, BriefcaseBusiness, ChartNoAxesColumnIncreasing, ClipboardCheck,
    Compass, FileCheck2, FileText, Layers3, MessagesSquare, Users,
    type LucideIcon,
} from 'lucide-react';

/** The same fallback icons are used by the public homepage and admin previews. */
export const homepageDefaultIcons: Record<string, Record<string, LucideIcon>> = {
    pathway_step_icon: {
        direction: Compass, learn: BookOpen, exams: ClipboardCheck,
        skills: ChartNoAxesColumnIncreasing, community: Users,
    },
    pathway_exam_icon: { pmp: ClipboardCheck, scrum: Layers3, simulation: Layers3 },
    skills_icon: { practice: ClipboardCheck, scrum: FileCheck2, simulation: ChartNoAxesColumnIncreasing },
    careers_feature_icon: { learn: BookOpen, discuss: MessagesSquare, jobs: BriefcaseBusiness, resume: FileText },
};

export function homepageDefaultIcon(category: string, key: string): LucideIcon {
    return homepageDefaultIcons[category]?.[key] ?? Object.values(homepageDefaultIcons[category] ?? {})[0] ?? Compass;
}
