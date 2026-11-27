import { InterviewAiReview } from '@/components/interview/InterviewAiReview';
import { router } from '@inertiajs/react';
import { Mic, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Brief, Difficulty, Feedback, FlowPage, Intro, Wizard, professionFor } from '@/components/interview/InterviewFlow';
import { InterviewProgress } from '@/components/interview/InterviewShared';
import { interviewApi, interviewBase, type InterviewAiOffer, type InterviewAnswer, type InterviewQuestion, type InterviewSession, type InterviewShell } from '@/components/interview/types';
import { ANSWER_LIMIT, useSpeechAnswer } from '@/components/interview/useSpeechAnswer';

type Props = { shell: InterviewShell; session: InterviewSession; questions: InterviewQuestion[]; answers: InterviewAnswer[]; aiReview?: InterviewAiOffer | null };
const finished = (answer?: InterviewAnswer) => Boolean(answer && ['submitted', 'evaluated', 'pending', 'skipped'].includes(answer.status));
export default function Practice({ shell, session, questions, answers: initial, aiReview }: Props) {
    const [answers, setAnswers] = useState(initial);
    const [index, setIndex] = useState(() => { const first = questions.findIndex((_, i) => !finished(initial.find(a => a.position === i))); return first === -1 ? Math.max(0, questions.length - 1) : first; });
    const [text, setText] = useState(() => initial.find(a => a.position === index)?.answer ?? '');
    const [mode, setMode] = useState<'type'|'speak'>(() => initial.find(a => a.position === index)?.mode === 'speak' ? 'speak' : 'type');
    const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [playStatus, setPlayStatus] = useState('');
    const drafts = useRef<Record<number, {text: string; mode: 'type' | 'speak'}>>({});
    const sending = useRef(false); const speech = useSpeechAnswer(value => { setText(value); setMode(session.mode === 'type' ? 'type' : 'speak'); }, text);
    const answer = answers.find(a => a.position === index); const question = questions[index];
    const evaluated = answer?.status === 'evaluated' && text.trim() === (answer?.answer ?? '').trim();
    const recording = speech.state !== 'idle';
    const canDictate = speech.supported && speech.secure;
    const last = index === questions.length - 1;
    useEffect(() => () => { if (typeof window !== 'undefined') window.speechSynthesis?.cancel(); }, []);
    const stopPlayback = () => { window.speechSynthesis?.cancel(); setPlayStatus(''); };
    const play = () => { stopPlayback(); if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') { setPlayStatus('Playback is not supported by this browser.'); return; } const utterance = new SpeechSynthesisUtterance(question.text); utterance.lang = 'en-US'; utterance.onend = () => setPlayStatus(''); utterance.onerror = () => setPlayStatus('Playback could not finish.'); setPlayStatus('Playing question…'); window.speechSynthesis.speak(utterance); };
    const navigate = (i: number, skipped = false) => { drafts.current[index] = {text: skipped ? '' : text, mode}; stopPlayback(); speech.reset(); const existing = answers.find(a => a.position === i); const savedDraft = drafts.current[i]; const value = savedDraft?.text ?? existing?.answer ?? ''; speech.replaceTranscript(value); setText(value); setMode(savedDraft?.mode ?? (existing?.mode === 'speak' ? 'speak' : 'type')); setIndex(i); setError(''); };
    const save = async (skip = false) => {
        if (sending.current || recording || busy) return false;
        if (!skip && !text.trim()) { setError('Enter an answer or choose Skip.'); return false; }
        sending.current = true; setBusy(true); setError(''); stopPlayback();
        try { const response = await interviewApi<{answer: InterviewAnswer}>(`${interviewBase}/sessions/${session.id}/answer`, 'POST', {position:index, answer:skip ? '' : text.trim(), mode, skip}); setAnswers(old => [...old.filter(a => a.position !== index), response.answer]); setText(response.answer.answer ?? ''); return true; }
        catch (e) { setError(e instanceof Error ? e.message : 'Unable to save your answer.'); return false; }
        finally { sending.current = false; setBusy(false); }
    };
    const advance = async (skip = false) => {
        if (sending.current || recording || busy) return;
        if (skip ? !(await save(true)) : !evaluated) { if (!skip) setError('Evaluate your answer before continuing, or choose Skip.'); return; }
        if (!last) { navigate(index + 1, skip); return; }
        setBusy(true); sending.current = true; setError('');
        try { const response = await interviewApi<{url: string}>(`${interviewBase}/sessions/${session.id}/finish`, 'POST'); router.visit(response.url); }
        catch (e) { setError(e instanceof Error ? e.message : 'Unable to finish your interview.'); }
        finally { sending.current = false; setBusy(false); }
    };
    const rows: [string, string | number][] = [['Profession', session.profession || professionFor(session.role)], ['Role',session.roleLabel || session.role],['Industry', session.industryLabel || session.industry], ['Level',session.experienceLabel || session.experience], ['JD experience', session.requestedExperience || 'Unspecified'], ['Questions',session.count], ['Estimated time',`≈ ${Math.round(session.durationSeconds / 60)} min`]];
    return <FlowPage shell={shell} rail={<Brief rows={rows} coaching/>}><Wizard step={2} left={index > 0 && <button type="button" className="pm-button pm-button-outline" disabled={busy || recording} onClick={() => navigate(index-1)}>Previous</button>} right={<><button type="button" className="pm-if-quiet" disabled={busy || recording || evaluated} onClick={() => void advance(true)}>Skip</button><button type="button" className={`pm-button ${evaluated ? '' : 'pm-button-outline'}`} disabled={busy || recording || !evaluated} onClick={() => void advance()}>{last ? 'Finish & see results' : 'Next question'}</button></>}>
        <Intro title="Practice interview" description={`${session.roleLabel || session.role} · ${session.industryLabel || session.industry}`}/><div className="pm-if-between pm-if-question-meta"><strong>Question {index+1} of {questions.length}</strong><span className="pm-if-tag">{question.type_label ?? question.type}</span><Difficulty question={question}/></div><InterviewProgress value={index+1} max={questions.length}/><h3 className="pm-if-question">{question.text}</h3>
        <div className="pm-if-strip"><button className="pm-button pm-button-outline" disabled={recording || busy} type="button" onClick={play}><Play size={15} fill="currentColor"/> Play question</button><button className="pm-if-quiet" type="button" onClick={stopPlayback}>Stop playback</button><span role="status" className="pm-if-note">{playStatus}</span></div>
        <div className="pm-if-answer-editor">
            <div className="pm-if-between"><label htmlFor="interview-answer" className="pm-if-field">Your answer</label><span className="pm-if-note" id="interview-answer-count">{text.length.toLocaleString()} / {ANSWER_LIMIT.toLocaleString()} characters</span></div>
            <textarea id="interview-answer" className="pm-input pm-if-answer" rows={9} placeholder="Type your answer or use dictation…" maxLength={ANSWER_LIMIT} value={text} readOnly={recording} disabled={busy} aria-describedby="interview-answer-count interview-dictation-status" onChange={e => { setText(e.target.value); speech.replaceTranscript(e.target.value); }}/>
            <div className="pm-if-answer-actions">
                <button type="button" className={`pm-button pm-button-outline${recording ? ' is-recording' : ''}`} disabled={busy || !canDictate || speech.state === 'stopping'} onClick={() => { if (recording) speech.stop(); else { stopPlayback(); speech.replaceTranscript(text); speech.start(); } }}>{recording ? <Square size={16} aria-hidden="true"/> : <Mic size={16} aria-hidden="true"/>}{speech.state === 'requesting' ? 'Cancel dictation' : speech.state === 'stopping' ? 'Finishing dictation…' : recording ? 'Stop dictation' : 'Start dictation'}</button>
                <button className="pm-button" type="button" disabled={busy || recording || !text.trim() || evaluated} onClick={() => void save()}>{busy ? 'Please wait…' : evaluated ? 'Answer evaluated' : 'Evaluate answer'}</button>
            </div>
            <span className="pm-if-note pm-if-dictation-status" id="interview-dictation-status" role="status">{!speech.secure ? 'Microphone access requires HTTPS or localhost.' : !speech.supported ? 'Live dictation is unavailable in this browser. Try Chrome or Edge.' : speech.status}</span>
            {speech.error && <p role="alert" className="pm-interview-error">{speech.error}</p>}
        </div>
        {evaluated && answer?.evaluation && <Feedback evaluation={answer.evaluation}/>}
        {evaluated && answer && <InterviewAiReview key={`${answer.id}-${answer.revision}`} answer={answer} offer={aiReview} onReceipt={receipt => setAnswers(old => old.map(a => a.id === answer.id && a.revision === answer.revision ? {...a, ai_review: receipt} : a))}/>} {answer?.status === 'submitted' && <p className="pm-if-note">Previously saved answer. Evaluate again for practice feedback.</p>}
        {error && <p role="alert" className="pm-interview-error">{error}</p>}
    </Wizard></FlowPage>;
}
