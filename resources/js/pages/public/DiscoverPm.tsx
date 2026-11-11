import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { CareerScreen, BeginnerGoalScreen, BeginnerReviewScreen, PlatformScreen, FinalChoiceScreen } from '@/components/discover-pm/CareerScreens';
import { DiscoverShell, type DiscoverStage } from '@/components/discover-pm/DiscoverShell';
import { AboutScreen, FindingsScreen, IntroScreen, NextStepScreen, PracticeScreen, QuestionScreen } from '@/components/discover-pm/DiscoverScreens';
import { careerTotal, industries, salaryExamples, supportAreas, type IndustryId, type SalaryMarket, type SupportAreaId } from '@/data/discover-career';
import { initialProfile, profileFields, reflectionQuestions, requiredProfileFields, type ProfileAnswers, type ProfileField } from '@/data/discover-pm';

const STORAGE_KEY = 'pm-circle-discover-pm-v1';
const stages: DiscoverStage[] = ['intro', 'about', 'explore', 'findings', 'practice', 'next', 'career', 'sample', 'review', 'platform', 'decision'];

type Progress = {
    stage: DiscoverStage;
    profile: ProfileAnswers;
    questionIndex: number;
    answers: (number | null)[];
    practiceChoice: number | null;
    careerIndex: number;
    industry: IndustryId;
    salaryMarket: SalaryMarket;
    salaryRole: number;
    goalText: string;
    supportArea: SupportAreaId;
    finalChoice: number | null;
};

function newProgress(): Progress {
    return { stage: 'intro', profile: { ...initialProfile }, questionIndex: 0,
        answers: reflectionQuestions.map(() => null), practiceChoice: null, careerIndex: 0,
        industry: industries[0].id, salaryMarket: 'bd', salaryRole: 0, goalText: '',
        supportArea: supportAreas[0].id, finalChoice: null };
}

function isAnswer(value: unknown, optionCount: number): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < optionCount;
}

/** Allow-list all browser-provided values; storage is optional and never sent to the server. */
function readProgress(): Progress {
    if (typeof window === 'undefined') return newProgress();
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return newProgress();
        const candidate: unknown = JSON.parse(raw);
        if (!candidate || typeof candidate !== 'object') return newProgress();
        const saved = candidate as Partial<Progress>;
        if (!saved.profile || typeof saved.profile !== 'object') return newProgress();
        const profile = { ...initialProfile };
        for (const field of Object.keys(profileFields) as ProfileField[]) {
            const value = saved.profile[field];
            if (typeof value === 'string' && ((value === '' && requiredProfileFields.includes(field)) || profileFields[field].options.some(option => option === value))) {
                profile[field] = value;
            }
        }
        const answers = reflectionQuestions.map((question, index) => {
            const value = Array.isArray(saved.answers) ? saved.answers[index] : null;
            return isAnswer(value, question.options.length) ? value : null;
        });
        let stage = stages.includes(saved.stage as DiscoverStage) ? saved.stage as DiscoverStage : 'intro';
        const firstMissing = answers.findIndex(answer => answer === null);
        const completeProfile = requiredProfileFields.every(field => profile[field] !== '');
        const questionIndex = isAnswer(saved.questionIndex, reflectionQuestions.length) ? saved.questionIndex : 0;
        if (!completeProfile && !['intro', 'about'].includes(stage)) stage = 'about';
        if (completeProfile && firstMissing !== -1 && !['intro', 'about', 'explore'].includes(stage)) stage = 'explore';
        const goalText = typeof saved.goalText === 'string' ? saved.goalText.slice(0, 500) : '';
        if (['review', 'platform', 'decision'].includes(stage) && !goalText.trim()) stage = 'sample';
        return {
            stage, profile, answers,
            questionIndex: stage === 'explore' && firstMissing !== -1 && saved.stage !== 'explore' ? firstMissing : questionIndex,
            practiceChoice: isAnswer(saved.practiceChoice, 3) ? saved.practiceChoice : null,
            careerIndex: isAnswer(saved.careerIndex, careerTotal) ? saved.careerIndex : 0,
            industry: industries.some(item => item.id === saved.industry) ? saved.industry as IndustryId : industries[0].id,
            salaryMarket: Object.hasOwn(salaryExamples, saved.salaryMarket ?? '') ? saved.salaryMarket as SalaryMarket : 'bd',
            salaryRole: isAnswer(saved.salaryRole, 3) ? saved.salaryRole : 0,
            goalText,
            supportArea: supportAreas.some(item => item.id === saved.supportArea) ? saved.supportArea as SupportAreaId : supportAreas[0].id,
            finalChoice: isAnswer(saved.finalChoice, 3) ? saved.finalChoice : null,
        };
    } catch {
        // Private/restricted browsers and malformed storage do not prevent exploration.
        return newProgress();
    }
}

export default function DiscoverPm() {
    const [progress, setProgress] = useState<Progress>(readProgress);
    const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});
    const [goalError, setGoalError] = useState('');
    const { stage, profile, questionIndex, answers, practiceChoice, careerIndex, industry,
        salaryMarket, salaryRole, goalText, supportArea, finalChoice } = progress;

    useEffect(() => {
        try {
            if (stage === 'intro' && requiredProfileFields.every(field => !profile[field]) && answers.every(answer => answer === null)) {
                window.localStorage.removeItem(STORAGE_KEY);
            } else {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
            }
        } catch {
            // Browser-only persistence is best effort; the entire flow remains functional.
        }
    }, [progress, stage, profile, answers]);

    function move(stageName: DiscoverStage) {
        setProgress(previous => ({ ...previous, stage: stageName }));
    }

    function changeField(name: ProfileField, value: string) {
        if (!profileFields[name].options.some(option => option === value) && value !== '') return;
        setErrors(previous => ({ ...previous, [name]: undefined }));
        setProgress(previous => ({ ...previous, profile: { ...previous.profile, [name]: value } }));
    }

    function finishAbout() {
        const nextErrors: Partial<Record<ProfileField, string>> = {};
        for (const field of requiredProfileFields) {
            if (!profile[field]) nextErrors[field] = 'Please select an option to continue.';
        }
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;
        setProgress(previous => ({ ...previous, stage: 'explore', questionIndex: 0 }));
    }

    function selectAnswer(value: number) {
        setProgress(previous => ({ ...previous, answers: previous.answers.map((answer, index) => index === previous.questionIndex ? value : answer) }));
    }

    function nextQuestion() {
        if (answers[questionIndex] === null) return;
        setProgress(previous => {
            if (previous.questionIndex < reflectionQuestions.length - 1) {
                return { ...previous, questionIndex: previous.questionIndex + 1 };
            }
            const missing = previous.answers.findIndex(answer => answer === null);
            return missing === -1 ? { ...previous, stage: 'practice' } : { ...previous, questionIndex: missing };
        });
    }

    function backFromQuestion() {
        setProgress(previous => previous.questionIndex === 0
            ? { ...previous, stage: 'about' }
            : { ...previous, questionIndex: previous.questionIndex - 1 });
    }

    function nextCareer() {
        setProgress(previous => previous.careerIndex >= careerTotal - 1
            ? { ...previous, stage: 'sample' }
            : { ...previous, careerIndex: previous.careerIndex + 1 });
    }

    function backCareer() {
        setProgress(previous => previous.careerIndex === 0
            ? { ...previous, stage: 'next' }
            : { ...previous, careerIndex: previous.careerIndex - 1 });
    }

    function finishSample() {
        if (!goalText.trim()) {
            setGoalError('Write a short project goal before continuing.');
            return;
        }
        setGoalError('');
        move('review');
    }

    return <><Head title="Discover PM — Explore your career direction" />
        <DiscoverShell stage={stage} questionIndex={questionIndex} careerIndex={careerIndex}>
            {stage === 'intro' && <IntroScreen onBegin={() => move('about')}/>}
            {stage === 'about' && <AboutScreen profile={profile} errors={errors} onChange={changeField}
                onBack={() => move('intro')} onNext={finishAbout}/>}
            {stage === 'explore' && <QuestionScreen index={questionIndex} selected={answers[questionIndex]} onSelect={selectAnswer}
                onBack={backFromQuestion} onNext={nextQuestion}/>}
            {stage === 'practice' && <PracticeScreen selected={practiceChoice}
                onSelect={value => setProgress(previous => ({ ...previous, practiceChoice: value }))}
                onBack={() => setProgress(previous => ({ ...previous, stage: 'explore', questionIndex: reflectionQuestions.length - 1 }))}
                onNext={() => move('findings')}/>}
            {stage === 'findings' && <FindingsScreen answers={answers} onBack={() => move('practice')} onNext={() => move('next')}/>}
            {stage === 'next' && <NextStepScreen answers={answers} onBack={() => move('findings')}
                onNext={() => setProgress(previous => ({ ...previous, stage: 'career', careerIndex: 0 }))}/>}
            {stage === 'career' && <CareerScreen index={careerIndex} industry={industry} salaryMarket={salaryMarket} salaryRole={salaryRole}
                onIndustryChange={value => setProgress(previous => ({ ...previous, industry: value }))}
                onSalaryMarketChange={value => setProgress(previous => ({ ...previous, salaryMarket: value, salaryRole: 0 }))}
                onSalaryRoleChange={value => setProgress(previous => ({ ...previous, salaryRole: value }))}
                onBack={backCareer} onNext={nextCareer}/>}
            {stage === 'sample' && <BeginnerGoalScreen goal={goalText} error={goalError}
                onChange={value => { setGoalError(''); setProgress(previous => ({ ...previous, goalText: value })); }}
                onBack={() => setProgress(previous => ({ ...previous, stage: 'career', careerIndex: careerTotal - 1 }))}
                onNext={finishSample}/>}
            {stage === 'review' && <BeginnerReviewScreen goal={goalText} onBack={() => move('sample')} onNext={() => move('platform')}/>}
            {stage === 'platform' && <PlatformScreen selected={supportArea}
                onSelect={value => setProgress(previous => ({ ...previous, supportArea: value }))}
                onBack={() => move('review')} onNext={() => move('decision')}/>}
            {stage === 'decision' && <FinalChoiceScreen choice={finalChoice}
                onSelect={value => setProgress(previous => ({ ...previous, finalChoice: value }))}
                onBack={() => move('platform')} onBeginSample={() => move('sample')}/>}
        </DiscoverShell>
    </>;
}
