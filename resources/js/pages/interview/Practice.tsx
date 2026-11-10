import { Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, FileText, Mic2, Pause, Play, RotateCcw, Square, Timer, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { InterviewHeading, InterviewPage, InterviewProgress } from '@/components/interview/InterviewShared';
import { interviewApi, interviewBase, type InterviewAnswer, type InterviewQuestion, type InterviewSession, type InterviewShell } from '@/components/interview/types';
import { useSpeechAnswer } from '@/components/interview/useSpeechAnswer';
import { useInterviewCountdown } from '@/components/interview/useInterviewCountdown';

type Props = { shell: InterviewShell; session: InterviewSession; questions: InterviewQuestion[]; answers: InterviewAnswer[] };
const timeText = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const saved = (answer?: InterviewAnswer) => Boolean(answer && ['submitted', 'evaluated', 'pending'].includes(answer.status));

export default function Practice({ shell, session, questions, answers: initial }: Props) {
    const [answers, setAnswers] = useState<InterviewAnswer[]>(initial);
    const [index, setIndex] = useState(() => {
        const first = questions.findIndex((_, position) => !saved(initial.find(answer => answer.position === position)));
        return first === -1 ? Math.max(0, questions.length - 1) : first;
    });
    const [text, setText] = useState(() => initial.find(answer => answer.position === index)?.answer ?? '');
    const [mode, setMode] = useState<'type' | 'speak'>(() => initial.find(item => item.position === index)?.mode === 'speak' || session.mode === 'speak' ? 'speak' : 'type');
    const [busy, setBusy] = useState(false);
    const [editingPosition, setEditingPosition] = useState<number | null>(null);
    const [error, setError] = useState('');
    const sending = useRef(false);
    const speech = useSpeechAnswer(setText, text);
    const timeRemaining = useInterviewCountdown(session);
    const answer = answers.find(item => item.position === index);
    const answered = saved(answer) && editingPosition !== index;
    const last = index === questions.length - 1;
        const recording = speech.state === 'listening' || speech.state === 'requesting';

    const navigate = (position: number) => {
        speech.reset();
        const existing = answers.find(item => item.position === position);
        const draft = existing?.answer ?? '';
        speech.replaceTranscript(draft);
        if (existing?.mode === 'speak' || existing?.mode === 'type') setMode(existing.mode);
        setIndex(position);
        setEditingPosition(null);
        setText(draft);
        setError('');
    };
    const send = async () => {
        if (busy || sending.current || answered || recording) return;
        const content = text.trim();
        if (content.length < 20) { setError('Please enter at least 20 characters before submitting your answer.'); return; }
        sending.current = true;
        speech.stop();
        setBusy(true);
        setError('');
        try {
            const result = await interviewApi<{ answer: InterviewAnswer }>(`${interviewBase}/sessions/${session.id}/answer`, 'POST', { position: index, answer: content, mode });
            setAnswers(previous => [...previous.filter(item => item.position !== index), result.answer]);
            setText(result.answer.answer ?? content);
            setEditingPosition(null);
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'Could not save your answer. Please try again.');
        } finally { sending.current = false; setBusy(false); }
    };
    const edit = () => {
        speech.stop();
        setEditingPosition(index);
        setError('');
    };
    const cancelEdit = () => {
        speech.reset();
        const previous = answer?.answer ?? '';
        speech.replaceTranscript(previous);
        setText(previous);
        setEditingPosition(null);
        setError('');
    };
    const next = async () => {
        if (busy || !answered) return;
        if (!last) { navigate(index + 1); return; }
        setBusy(true);
        setError('');
        try {
            const result = await interviewApi<{ url: string }>(`${interviewBase}/sessions/${session.id}/finish`, 'POST');
            window.location.assign(result.url);
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'Could not finish the interview.');
            setBusy(false);
        }
    };
    // Always offer typing as an accessible fallback for unsupported microphones or browsers.
    const allowType = true;
    const allowSpeak = session.mode !== 'type';

    return <InterviewPage shell={shell}><InterviewHeading/>
        <section className="pm-interview-card pm-interview-practice-card">
            <header className="pm-interview-practice-header"><div className="pm-interview-practice-title"><BriefcaseBusiness size={22}/><h2>{session.role} – Mock Interview</h2></div>
                <div className="pm-interview-practice-meta"><span>Question {index + 1} of {questions.length}</span><InterviewProgress value={index + 1} max={questions.length}/><span className="pm-interview-time" role="timer" aria-label={`Interview time remaining: ${timeText(timeRemaining)}`} title="Live countdown from the interview start time. Question progress does not affect the timer."><Clock3 size={18}/>{timeText(timeRemaining)} left</span></div>
            </header>
            <div className="pm-interview-practice-content"><div className="pm-interview-question"><span>Q</span><h3>{questions[index].text}</h3></div>
                <div className="pm-interview-answer-panel"><div className="pm-interview-answer-tabs" role="tablist" aria-label="Answer method">
                    {allowType && <button role="tab" aria-selected={mode === 'type'} type="button" className={mode === 'type' ? 'is-active' : ''} onClick={() => { speech.stop(); setMode('type'); }}><FileText size={19}/>Type Answer</button>}
                    {allowSpeak && <button role="tab" aria-selected={mode === 'speak'} type="button" className={mode === 'speak' ? 'is-active' : ''} onClick={() => { speech.replaceTranscript(text); setMode('speak'); }}><Mic2 size={19}/>Speak Answer</button>}
                </div>
                    {mode === 'type' ? <div className="pm-interview-type-box"><label htmlFor="pm-interview-answer" className="sr-only">Your interview answer</label><textarea id="pm-interview-answer" placeholder="Type your answer here..." maxLength={1000} value={text} disabled={answered || busy} onChange={event => setText(event.target.value)}/><span>{text.length} / 1000</span></div>
                        : <div className="pm-interview-speech-panel">
                            <div className="pm-interview-speech-main"><div className={`pm-interview-mic-orb ${speech.state === 'listening' ? 'is-listening' : ''}`}><Mic2 size={34}/></div>
                                <div className="pm-interview-speech-activity"><p className="pm-interview-record-state"><span className={speech.state === 'listening' ? 'is-recording' : ''}/>{speech.state === 'requesting' ? 'Requesting microphone access...' : speech.state === 'listening' ? 'Listening and transcribing your answer...' : speech.state === 'paused' ? 'Recording paused' : 'Ready to record your answer'}</p>
                                    <div className="pm-interview-waveform" aria-hidden="true">{speech.levels.map((level, bar) => <i key={bar} style={{ height: `${8 + Math.round(level * 44)}px` }}/>)}</div>
                                    <div className="pm-interview-record-controls">{speech.state === 'idle' && <button className="pm-button pm-button-outline" disabled={answered || busy} type="button" onClick={() => { speech.replaceTranscript(text); void speech.start(); }}><Mic2 size={17}/>Start Recording</button>}
                                        {speech.state === 'requesting' && <button type="button" className="pm-button pm-button-outline" onClick={speech.stop}>Cancel</button>}
                                        {speech.state === 'listening' && <button className="pm-button pm-button-outline" onClick={speech.pause} type="button"><Pause size={16}/>Pause</button>}
                                        {speech.state === 'paused' && <button className="pm-button pm-button-outline" onClick={speech.resume} type="button"><Play size={16}/>Resume</button>}
                                        {(speech.state === 'listening' || speech.state === 'paused') && <button className="pm-button" onClick={speech.stop} type="button"><Square size={14} fill="currentColor"/>Stop &amp; Save</button>}
                                    </div></div>
                                <div className="pm-interview-speech-timer"><strong>{timeText(speech.elapsed)}</strong><span> / 03:00</span></div>
                            </div>
                            <div className="pm-interview-transcript"><div><h4><FileText size={17}/>Live Transcription (Auto)</h4><small><CheckCircle2 size={15}/>{recording ? 'Transcribing...' : 'Editable transcript'}</small></div>
                                <label className="sr-only" htmlFor="pm-interview-transcript">Transcribed answer</label><textarea id="pm-interview-transcript" maxLength={1000} placeholder="Your transcribed answer will appear here. You can edit it before submitting." readOnly={recording} disabled={answered || busy} value={text} onChange={event => { setText(event.target.value); speech.replaceTranscript(event.target.value); }}/></div>
                            <p className="pm-interview-voice-notice">The waveform reflects your live microphone input. PM Circle saves the transcript only; browser speech recognition may use its own speech service.</p>
                            {speech.error && <p role="alert" className="pm-interview-error">{speech.error}</p>}
                        </div>}
                </div>
                {answered ? <div className="pm-interview-answer-actions"><div className="pm-interview-saved"><CheckCircle2 size={19}/><span>Answer saved</span></div><div className="pm-interview-record-controls"><button type="button" className="pm-button pm-button-outline" onClick={edit} disabled={busy}><RotateCcw size={17}/>Edit Answer</button><button type="button" className="pm-button" onClick={() => void next()} disabled={busy}>{busy ? 'Please wait...' : last ? 'View My Results' : 'Next Question'}<ArrowRight size={18}/></button></div></div>
                    : <div className="pm-interview-answer-actions"><button type="button" className="pm-button pm-button-outline" onClick={() => { if (editingPosition === index) cancelEdit(); else { speech.reset(); setText(''); } }} disabled={editingPosition !== index && (!text || busy)}><RotateCcw size={17}/>{editingPosition === index ? 'Cancel Edit' : mode === 'speak' ? 'Re-record Answer' : 'Clear Answer'}</button><button type="button" className="pm-button" onClick={() => void send()} disabled={busy || recording || text.trim().length < 20}>{busy ? 'Saving...' : mode === 'speak' ? 'Use This Answer' : 'Submit Answer'}<ArrowRight size={18}/></button></div>}
                {error && <div role="alert" className="pm-interview-error"><XCircle size={16}/>{error}</div>}
                <div className="pm-interview-practice-footer">{!answered && <div className="pm-interview-tip"><Timer size={19}/><span><strong>Tip:</strong> Keep it concise, highlight your key skills, experience, and what makes you a good fit for the role.</span></div>}
                    <div className="pm-interview-question-links"><Link href={interviewBase}><ArrowLeft size={16}/>Interview Setup</Link>{index > 0 && <button type="button" onClick={() => navigate(index - 1)}><ArrowLeft size={16}/>Previous Question</button>}</div></div>
            </div>
        </section>
    </InterviewPage>;
}
