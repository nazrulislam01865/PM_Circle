import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
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
    attemptTotals: { completed: number; inProgress: number; practiceCompleted: number; latestScore: number | null };
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
    const [currentUsage, setCurrentUsage] = useState<PmpAiUsageData>(aiUsage);
    const [usageLoading, setUsageLoading] = useState(false);
    const [usageError, setUsageError] = useState('');
    const usageInFlight = useRef(false);
    useEffect(() => { setCurrentUsage(aiUsage); }, [aiUsage]);

    // Browser back/forward cache may restore an older mock summary after an exam finishes.
    // Refresh only for a restored snapshot; ordinary tab switches stay entirely client-side.
    useEffect(() => {
        const onRestore = (event: PageTransitionEvent) => {
            if (event.persisted) {
                router.reload({ only: ['attemptTotals', 'attempts', 'topicAccuracy', 'aiUsage'] });
            }
        };
        window.addEventListener('pageshow', onRestore);
        return () => window.removeEventListener('pageshow', onRestore);
    }, []);

    // Revalidate when the AI tab opens, not on every dashboard render or keystroke.
    const refreshUsage = async () => {
        if (usageInFlight.current) return;
        usageInFlight.current = true;
        setUsageLoading(true);
        setUsageError('');
        try {
            const response = await fetch('/exams/pmp/ai-usage', {
                credentials: 'same-origin', cache: 'no-store',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!response.ok) throw new Error(response.status === 403
                ? 'Your membership does not currently permit PMP AI usage.'
                : 'Could not refresh AI usage. Please try again.');
            setCurrentUsage(await response.json() as PmpAiUsageData);
        } catch (error) {
            setUsageError(error instanceof Error ? error.message : 'Could not refresh AI usage.');
        } finally {
            usageInFlight.current = false;
            setUsageLoading(false);
        }
    };
    const openTab = (next: PmpDashboardTab) => {
        setActive(next);
        if (next === 'ai') void refreshUsage();
    };

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
            <PmpWorkspaceTabs active={active} onChange={openTab}/>
            {startError && <p className="pm-pmp-action-error" role="alert">{startError}</p>}
            <div className="pm-pmp-dashboard-main" id="pmp-dashboard-content" role="tabpanel" aria-labelledby={`pm-pmp-tab-${active}`} tabIndex={0}>
                {active === 'overview' && <PmpOverview attempts={attempts} planCode={planCode} planDetails={planDetails}
                    attemptTotals={attemptTotals} aiUsage={currentUsage} topics={topicAccuracy} targetExamDate={targetExamDate}
                    availableQuestions={availableQuestions} fullLength={fullLength} fullQuestionCount={examSettings.full_question_count} focusedQuestionCount={examSettings.focused_question_count}
                    onStart={onStart} onFocus={onFocus} starting={starting} onAi={() => openTab('ai')}/>}
                {active === 'performance' && <PmpPerformance attempts={attempts} topics={topicAccuracy}
                    onStart={onStart} onFocus={onFocus} starting={starting} canStart={availableQuestions > 0} fullQuestionCount={examSettings.full_question_count}/>}
                {active === 'history' && <PmpHistory attempts={attempts} initialNextCursor={historyNextCursor}
                    onStart={onStart} starting={starting} canStart={availableQuestions > 0} fullQuestionCount={examSettings.full_question_count}/>}
                {active === 'ai' && <PmpAiUsage usage={currentUsage} onRefresh={() => void refreshUsage()} loading={usageLoading} error={usageError}/>}
            </div>
        </div>
    </ExamPage>;
}
