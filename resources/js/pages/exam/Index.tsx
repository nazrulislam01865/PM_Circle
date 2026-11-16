import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ExamPage } from '@/components/exam/ExamShared';
import { useExamStart } from '@/components/exam/useExamStart';
import {
    PmpWorkspaceTabs, PmpOverview, PmpPerformance, PmpHistory, PmpAiUsage,
    type PmpDashboardTab, type PmpWorkspaceAttempt, type PmpTopicRow,
    type PmpPlanDetails, type PmpAiUsageData,
} from '@/components/exam/PmpWorkspacePanels';
import type { DashboardShellData } from '@/types/dashboard';

type Props = {
    shell: DashboardShellData;
    availableQuestions: number;
    fullLength: boolean;
    examSettings: { enabled: boolean; full_question_count: number; focused_question_count: number; };
    planCode: string;
    planDetails: PmpPlanDetails;
    targetExamDate: string | null;
    attemptTotals: { completed: number; inProgress: number };
    aiUsage: PmpAiUsageData;
    attempts: PmpWorkspaceAttempt[];
    historyNextCursor: number | null;
    topicAccuracy: PmpTopicRow[];
};

const dashboardTabs: PmpDashboardTab[] = ['overview', 'performance', 'history', 'ai'];

/** Four prototype-matched views, one visible at a time. No navigation requests for tab changes. */
export default function Index({ shell, availableQuestions, fullLength, examSettings, planCode, planDetails,
    targetExamDate, attemptTotals, aiUsage, attempts, topicAccuracy, historyNextCursor }: Props) {
    const page = usePage();
    const [active, setActive] = useState<PmpDashboardTab>(() => {
        const requested = new URLSearchParams(page.url.split('?')[1]?.split('#')[0] ?? '').get('tab');
        return dashboardTabs.find(tab => tab === requested) ?? 'overview';
    });
    const { startExam, starting, startError } = useExamStart();
    const onStart = () => void startExam();
    const onFocus = (domain: string) => void startExam({ mode: 'focused', domain });

    // Old review/history bookmarks used hash fragments. Keep them working without
    // reintroducing continuous-page scrolling or exposing hidden sections.
    useEffect(() => {
        const bookmarked: Record<string, PmpDashboardTab> = {
            '#pmp-overview': 'overview', '#pmp-performance': 'performance',
            '#pmp-history': 'history', '#pmp-ai-usage': 'ai',
        };
        const tab = bookmarked[window.location.hash];
        if (tab) setActive(tab);
    }, []);

    return <ExamPage shell={shell} className="pm-pmp-dashboard">
        <Head title="My PMP Exam Simulator | PM Circle"/>
        <div className="pm-pmp-workspace">
            <PmpWorkspaceTabs active={active} onChange={setActive}/>
            {startError && <p className="pm-pmp-action-error" role="alert">{startError}</p>}
            <div className="pm-pmp-dashboard-main" id="pmp-dashboard-content" role="tabpanel" aria-labelledby={`pm-pmp-tab-${active}`} tabIndex={0}>
                {active === 'overview' && <PmpOverview attempts={attempts} planCode={planCode} planDetails={planDetails}
                    attemptTotals={attemptTotals} aiUsage={aiUsage} topics={topicAccuracy} targetExamDate={targetExamDate}
                    availableQuestions={availableQuestions} fullLength={fullLength} fullQuestionCount={examSettings.full_question_count} focusedQuestionCount={examSettings.focused_question_count}
                    onStart={onStart} onFocus={onFocus} starting={starting} onAi={() => setActive('ai')}/>}
                {active === 'performance' && <PmpPerformance attempts={attempts} topics={topicAccuracy}
                    onStart={onStart} onFocus={onFocus} starting={starting} canStart={availableQuestions > 0} fullQuestionCount={examSettings.full_question_count}/>}
                {active === 'history' && <PmpHistory attempts={attempts} initialNextCursor={historyNextCursor}
                    onStart={onStart} starting={starting} canStart={availableQuestions > 0} fullQuestionCount={examSettings.full_question_count}/>}
                {active === 'ai' && <PmpAiUsage usage={aiUsage}/>}
            </div>
        </div>
    </ExamPage>;
}
