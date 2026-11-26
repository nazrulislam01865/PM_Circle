import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { results: ArrayLike<SpeechResult> };
type RecognitionLike = {
    lang: string; continuous: boolean; interimResults: boolean;
    onstart: (() => void) | null;
    onresult: ((event: SpeechEvent) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start(): void; stop(): void; abort(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
type SpeechState = 'idle' | 'requesting' | 'listening' | 'stopping';
export const ANSWER_LIMIT = 6000;

/** Web Speech owns microphone access. No separate getUserMedia stream or audio upload. */
export function useSpeechAnswer(onTranscript: (value: string) => void, initial: string) {
    const recognition = useRef<RecognitionLike | null>(null);
    const latest = useRef(initial);
    const callback = useRef(onTranscript);
    const timer = useRef<number | null>(null);
    const [state, setState] = useState<SpeechState>('idle');
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const supported = typeof window !== 'undefined' && Boolean((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition);
    const secure = typeof window !== 'undefined' && window.isSecureContext;
    useEffect(() => { callback.current = onTranscript; }, [onTranscript]);

    const cleanup = useCallback((abort: boolean) => {
        if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
        const current = recognition.current;
        recognition.current = null;
        if (current) {
            current.onstart = current.onresult = current.onerror = current.onend = null;
            if (abort) { try { current.abort(); } catch { /* Already ended. */ } }
        }
    }, []);

    const stop = useCallback(() => {
        const instance = recognition.current;
        if (!instance) return;
        if (state === 'requesting') { cleanup(true); setState('idle'); setStatus('Dictation cancelled.'); return; }
        if (state === 'stopping') return;
        setState('stopping');
        // stop(), unlike abort(), permits final recognition results to arrive.
        try {
            instance.stop();
            if (recognition.current === instance) timer.current = window.setTimeout(() => {
                if (recognition.current === instance) { cleanup(true); setState('idle'); setStatus(''); }
            }, 2500);
        } catch { cleanup(true); setState('idle'); setStatus(''); }
    }, [cleanup, state]);

    const start = useCallback(() => {
        if (recognition.current) return;
        setError(''); setStatus('');
        if (!secure) { setError('Microphone access requires HTTPS or localhost. You can still type your answer.'); return; }
        const Win = window as SpeechWindow;
        const Constructor = Win.SpeechRecognition ?? Win.webkitSpeechRecognition;
        if (!Constructor) { setError('This browser does not support live dictation. Try Chrome or Edge, or type your answer.'); return; }
        if (latest.current.length >= ANSWER_LIMIT) { setError('Your answer has reached the character limit. Edit it before adding more.'); return; }
        const base = latest.current;
        let heardSpeech = false;
        let failure = false;
        try {
            const instance = new Constructor();
            recognition.current = instance;
            instance.lang = 'en-US'; instance.continuous = true; instance.interimResults = true;
            instance.onstart = () => { if (recognition.current === instance) { setState('listening'); setStatus('Listening… speak in English.'); } };
            instance.onresult = event => {
                if (recognition.current !== instance) return;
                // Results contain the full recognition segment, including revised interim text.
                const parts = Array.from(event.results, result => result[0].transcript.trim()).filter(Boolean);
                if (!parts.length) return;
                heardSpeech = true;
                const value = [base.trimEnd(), ...parts].filter(Boolean).join(' ').slice(0, ANSWER_LIMIT);
                latest.current = value; callback.current(value);
            };
            instance.onerror = event => {
                if (recognition.current !== instance) return;
                failure = true;
                const messages: Record<string, string> = {
                    'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser and try again.',
                    'service-not-allowed': 'Speech recognition is blocked or unavailable. Check browser permissions or try Chrome or Edge.',
                    'audio-capture': 'No usable microphone was found. Connect or enable a microphone and try again.',
                    'network': 'The browser speech service could not connect. Check your connection or type your answer.',
                    'no-speech': 'No speech was detected. Start dictation again and speak clearly.',
                    'aborted': 'Dictation was interrupted. Start again to continue.',
                };
                setError(messages[event.error] ?? 'Dictation stopped unexpectedly. Try again or type your answer.');
                cleanup(true); setState('idle'); setStatus('');
            };
            instance.onend = () => {
                if (recognition.current !== instance) return;
                cleanup(false); setState('idle');
                if (!failure) setStatus(heardSpeech ? '' : 'No speech captured. Start dictation again or type your answer.');
            };
            setState('requesting'); setStatus('Waiting for microphone access…');
            // Start synchronously from the user's click, preserving browser activation.
            instance.start();
        } catch { cleanup(true); setState('idle'); setStatus(''); setError('Could not start dictation. Check microphone permissions and try again.'); }
    }, [cleanup, secure]);

    const replaceTranscript = useCallback((value: string) => { latest.current = value; }, []);
    const reset = useCallback(() => { cleanup(true); latest.current = ''; setState('idle'); setError(''); setStatus(''); }, [cleanup]);
    useEffect(() => () => cleanup(true), [cleanup]);
    return { state, error, status, supported, secure, start, stop, replaceTranscript, reset };
}
