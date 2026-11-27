import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { ExamPage } from '@/components/exam/ExamShared';
import { useExamStart } from '@/components/exam/useExamStart';
import { PmpStartExamDialog, type PmpExamCoverage, type PmpExamSelection } from '@/components/exam/PmpStartExamDialog';
import {
    PmpWorkspaceTabs, PmpOverview, PmpPerformance, PmpHistory, PmpAiUsage,
    type PmpDashboardTab, type PmpWorkspaceAttempt, type PmpTopicRow,
    type PmpPlanDetails, type PmpAiUsageData,
} from '@/components/exam/PmpWorkspacePanels';
import type { DashboardShellData } from '@/types/dashboard';

type Props = {
    shell: DashboardShellData;
    availableQuestions: number;
    activeQuestionCount: number;
    fullLength: boolean;
    examSettings: { enabled: boolean; full_question_count: number; full_duration_minutes: number; focused_question_count: number; };
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
export default function Index({ shell, availableQuestions, activeQuestionCount, fullLength, examSettings, planCode, planDetails,
    targetExamDate, attemptTotals, aiUsage, attempts, topicAccuracy, historyNextCursor }: Props) {
    const page = usePage<{auth?: {user?: {settings?: {exam_default_view?: string}} | null}}>();
    const [active, setActive] = useState<PmpDashboardTab>(() => {
        const requested = new URLSearchParams(page.url.split('?')[1]?.split('#')[0] ?? '').get('tab');
        return dashboardTabs.find(tab => tab === requested) ?? (page.props.auth?.user?.settings?.exam_default_view === 'Practice mode' ? 'performance' : 'overview');
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
                router.reload({ only: ['attemptTotals', 'attempts', 'topicAccuracy', 'aiUsage', 'planCode', 'planDetails'] });
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

    const { startExam, starting, startError, clearStartError } = useExamStart();
    const [startDialogOpen, setStartDialogOpen] = useState(false);
    const [startDialogPhase, setStartDialogPhase] = useState<'loading' | 'ready' | 'mixed' | 'preparing'>('loading');
    const [startCoverage, setStartCoverage] = useState<PmpExamCoverage | null>(null);
    const [startSelection, setStartSelection] = useState<PmpExamSelection>('new');
    const [startDialogError, setStartDialogError] = useState('');
    const coverageRequest = useRef<AbortController | null>(null);
    useEffect(() => () => coverageRequest.current?.abort(), []);

    const loadStartOptions = async () => {
        coverageRequest.current?.abort();
        const request = new AbortController();
        coverageRequest.current = request;
        setStartDialogPhase('loading');
        setStartCoverage(null);
        setStartDialogError('');
        clearStartError();
        try {
            const response = await fetch('/exams/pmp/start-options', {
                credentials: 'same-origin', cache: 'no-store', signal: request.signal,
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!response.ok) {
                if (response.status === 419) throw new Error('Your session has expired. Refresh the page and try again.');
                if (response.status === 403) throw new Error('Your membership does not currently allow this exam.');
                throw new Error('Could not retrieve question bank coverage. Please try again.');
            }
            const result = await response.json() as PmpExamCoverage;
            if (![result.bankTotal, result.usedCount, result.unseenCount, result.examSize, result.fullQuestionCount, result.fullDurationMinutes]
                .every(value => Number.isSafeInteger(value) && value >= 0)) {
                throw new Error('Question bank coverage is temporarily unavailable. Please try again.');
            }
            if (request.signal.aborted) return;
            setStartCoverage(result);
            setStartSelection(result.unseenCount === 0 ? 'random' : 'new');
            setStartDialogPhase('ready');
        } catch (error) {
            if (request.signal.aborted) return;
            setStartCoverage(null);
            setStartDialogError(error instanceof Error ? error.message : 'Unable to check question availability.');
            setStartDialogPhase('ready');
        }
    };
    const onStart = () => {
        if (starting || startDialogOpen) return;
        setStartDialogOpen(true);
        void loadStartOptions();
    };
    const closeStartDialog = () => {
        if (startDialogPhase === 'preparing') return;
        coverageRequest.current?.abort();
        setStartDialogOpen(false);
        setStartDialogError('');
    };
    const confirmStart = async () => {
        if (!startCoverage || startCoverage.examSize === 0 || starting) return;
        setStartDialogError('');
        if (startDialogPhase === 'ready' && startSelection === 'new'
            && startCoverage.unseenCount > 0 && startCoverage.unseenCount < startCoverage.examSize) {
            setStartDialogPhase('mixed');
            return;
        }
        const selection: PmpExamSelection = startDialogPhase === 'mixed' ? 'mixed'
            : startCoverage.unseenCount === 0 ? 'random' : startSelection;
        setStartDialogPhase('preparing');
        const succeeded = await startExam({ selection });
        if (!succeeded) setStartDialogPhase('ready');
    };
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
            {startError && !startDialogOpen && <p className="pm-pmp-action-error" role="alert">{startError}</p>}
            <div className="pm-pmp-dashboard-main" id="pmp-dashboard-content" role="tabpanel" aria-labelledby={`pm-pmp-tab-${active}`} tabIndex={0}>
                {active === 'overview' && <PmpOverview attempts={attempts} planCode={planCode} planDetails={planDetails}
                    attemptTotals={attemptTotals} aiUsage={currentUsage} topics={topicAccuracy} targetExamDate={targetExamDate}
                    availableQuestions={availableQuestions} activeQuestionCount={activeQuestionCount} fullLength={fullLength}
                    examEnabled={examSettings.enabled} fullQuestionCount={examSettings.full_question_count}
                    fullDurationMinutes={examSettings.full_duration_minutes} focusedQuestionCount={examSettings.focused_question_count}
                    onStart={onStart} onFocus={onFocus} starting={starting} onAi={() => openTab('ai')}/>}
                {active === 'performance' && <PmpPerformance attempts={attempts} topics={topicAccuracy}
                    onStart={onStart} onFocus={onFocus} starting={starting} canStart={availableQuestions > 0} fullQuestionCount={examSettings.full_question_count}/>}
                {active === 'history' && <PmpHistory attempts={attempts} initialNextCursor={historyNextCursor}
                    onStart={onStart} starting={starting} canStart={availableQuestions > 0} fullQuestionCount={examSettings.full_question_count}/>}
                {active === 'ai' && <PmpAiUsage usage={currentUsage} planDetails={planDetails} onRefresh={() => void refreshUsage()} loading={usageLoading} error={usageError}/>}
            </div>
        </div>
        <PmpStartExamDialog open={startDialogOpen} phase={startDialogPhase} coverage={startCoverage}
            attempts={attempts} completedCount={attemptTotals.completed} inProgressCount={attemptTotals.inProgress}
            selection={startSelection} onSelectionChange={setStartSelection} onClose={closeStartDialog}
            onRetry={() => void loadStartOptions()} onBack={() => setStartDialogPhase('ready')} onConfirm={() => void confirmStart()}
            error={startDialogError || startError}/>
    </ExamPage>;
}
