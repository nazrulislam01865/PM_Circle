import { useCallback, useEffect, useRef, useState } from 'react';
import { useMicrophoneWaveform } from './useMicrophoneWaveform';

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { results: ArrayLike<SpeechResult> };
type SpeechError = { error: string };
type RecognitionLike = {
    lang: string; continuous: boolean; interimResults: boolean;
    onresult: ((event: SpeechEvent) => void) | null;
    onerror: ((event: SpeechError) => void) | null;
    onend: (() => void) | null;
    start(): void; stop(): void; abort(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
type SpeechState = 'idle' | 'requesting' | 'listening' | 'paused';

/** In-browser transcription; the stream is analysed locally and never uploaded by PM Circle. */
export function useSpeechAnswer(onTranscript: (value: string) => void, initial: string) {
    const recognition = useRef<RecognitionLike | null>(null);
    const stream = useRef<MediaStream | null>(null);
    const committed = useRef(initial);
    const latest = useRef(initial);
    const shouldListen = useRef(false);
    const requestId = useRef(0);
    const callback = useRef(onTranscript);
    const [state, setState] = useState<SpeechState>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [error, setError] = useState('');
    const waveform = useMicrophoneWaveform();
    const waveformStart = waveform.start;
    const waveformStop = waveform.stop;
    const supported = typeof window !== 'undefined' && Boolean((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition);

    useEffect(() => { callback.current = onTranscript; }, [onTranscript]);

    const cleanup = useCallback(() => {
        const current = recognition.current;
        recognition.current = null;
        if (current) {
            current.onend = null;
            current.onresult = null;
            current.onerror = null;
            current.abort();
        }
        stream.current?.getTracks().forEach(track => track.stop());
        stream.current = null;
        waveformStop();
    }, [waveformStop]);

    const stop = useCallback(() => {
        shouldListen.current = false;
        requestId.current++;
        committed.current = latest.current.trim();
        cleanup();
        setState('idle');
    }, [cleanup]);

    // Each new browser recognition segment starts with a fresh base to avoid
    // duplicated text when the browser automatically ends on silence.
    const beginRecognition = useCallback(() => {
        const Win = window as SpeechWindow;
        const Constructor = Win.SpeechRecognition ?? Win.webkitSpeechRecognition;
        if (!Constructor) throw new Error('unsupported');
        const instance = new Constructor();
        instance.lang = 'en-US';
        instance.continuous = true;
        instance.interimResults = true;
        instance.onresult = event => {
            if (recognition.current !== instance || !shouldListen.current) return;
            const finalParts: string[] = [];
            const interimParts: string[] = [];
            for (let i = 0; i < event.results.length; i++) {
                const part = event.results[i];
                (part.isFinal ? finalParts : interimParts).push(part[0].transcript);
            }
            const value = [committed.current, ...finalParts, ...interimParts].filter(Boolean).join(' ').trim().slice(0, 1000);
            latest.current = value;
            callback.current(value);
        };
        instance.onerror = event => {
            if (!shouldListen.current || recognition.current !== instance) return;
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            setError(event.error === 'not-allowed' || event.error === 'service-not-allowed'
                ? 'Speech recognition permission was denied. Allow microphone access or use Type Answer.'
                : 'Speech transcription stopped. You can retry recording or type your answer.');
            stop();
        };
        instance.onend = () => {
            if (recognition.current !== instance || !shouldListen.current) return;
            recognition.current = null;
            committed.current = latest.current;
            // Browsers often stop recognition after silence despite `continuous`.
            // Restart while the member is still recording; keep the same mic analyser.
            try { beginRecognition(); }
            catch { setError('Speech transcription has stopped. Please try recording again.'); stop(); }
        };
        recognition.current = instance;
        instance.start();
    }, [stop]);

    const start = useCallback(async () => {
        if (shouldListen.current) return;
        if (!supported) { setError('Live speech transcription is not available in this browser. Please use Type Answer in a supported browser.'); return; }
        if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') {
            setError('Microphone capture requires a supported browser and HTTPS (or localhost).');
            return;
        }
        const id = ++requestId.current;
        setState('requesting');
        setError('');
        try {
            const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
            if (id !== requestId.current) { media.getTracks().forEach(track => track.stop()); return; }
            stream.current = media;
            await waveformStart(media);
            if (id !== requestId.current) { cleanup(); return; }
            shouldListen.current = true;
            committed.current = latest.current;
            beginRecognition();
            setState('listening');
            media.getAudioTracks()[0]?.addEventListener('ended', () => {
                if (id === requestId.current && shouldListen.current) {
                    setError('Microphone access ended. Start recording again to continue.');
                    stop();
                }
            }, { once: true });
        } catch (exception) {
            if (id !== requestId.current) return;
            cleanup();
            shouldListen.current = false;
            setState('idle');
            const name = exception instanceof DOMException ? exception.name : '';
            setError(name === 'NotAllowedError' || name === 'PermissionDeniedError'
                ? 'Microphone access was denied. Allow microphone permission in your browser and try again.'
                : name === 'NotFoundError' ? 'No microphone was found. Connect a microphone and try again.'
                    : 'Could not start live recording. Check your microphone and browser permissions.');
        }
    }, [beginRecognition, cleanup, stop, supported, waveformStart]);

    const pause = useCallback(() => {
        if (!shouldListen.current) return;
        shouldListen.current = false;
        requestId.current++;
        committed.current = latest.current;
        cleanup();
        setState('paused');
    }, [cleanup]);
    const resume = useCallback(() => { void start(); }, [start]);
    const replaceTranscript = useCallback((value: string) => {
        latest.current = value;
        committed.current = value;
    }, []);
    const reset = useCallback(() => {
        stop();
        committed.current = '';
        latest.current = '';
        setElapsed(0);
        setError('');
    }, [stop]);

    useEffect(() => {
        if (state !== 'listening') return;
        const interval = window.setInterval(() => setElapsed(previous => Math.min(180, previous + 1)), 1000);
        return () => window.clearInterval(interval);
    }, [state]);
    useEffect(() => { if (elapsed >= 180 && state === 'listening') stop(); }, [elapsed, state, stop]);
    useEffect(() => () => { shouldListen.current = false; requestId.current++; cleanup(); }, [cleanup]);

    return { state, elapsed, error, supported, levels: waveform.levels, start, stop, pause, resume, replaceTranscript, reset };
}
