import { useCallback, useEffect, useRef, useState } from 'react';

const BAR_COUNT = 46;
const SILENCE = Array<number>(BAR_COUNT).fill(0);

/** Web Audio analyser fed exclusively by the user's real microphone stream. No generated waveform. */
export function useMicrophoneWaveform() {
    const [levels, setLevels] = useState<number[]>(SILENCE);
    const context = useRef<AudioContext | null>(null);
    const frame = useRef<number | null>(null);
    const lastFrame = useRef(0);

    const stop = useCallback(() => {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = null;
        lastFrame.current = 0;
        const current = context.current;
        context.current = null;
        if (current) void current.close().catch(() => undefined);
        setLevels(SILENCE);
    }, []);

    const start = useCallback(async (stream: MediaStream) => {
        stop();
        const audio = new AudioContext();
        context.current = audio;
        const source = audio.createMediaStreamSource(stream);
        const analyser = audio.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser); // Never connect to speakers or record audio.
        await audio.resume();
        if (context.current !== audio) return;
        const samples = new Uint8Array(analyser.frequencyBinCount);
        const voiceBins = Math.max(BAR_COUNT, Math.min(samples.length, Math.floor(4000 * analyser.fftSize / audio.sampleRate)));

        const render = (timestamp: number) => {
            if (context.current !== audio) return;
            if (timestamp - lastFrame.current >= 50) { // 20fps minimizes React updates and battery use.
                lastFrame.current = timestamp;
                analyser.getByteFrequencyData(samples);
                const updated = Array.from({ length: BAR_COUNT }, (_, index) => {
                    const from = Math.floor(index * voiceBins / BAR_COUNT);
                    const until = Math.max(from + 1, Math.floor((index + 1) * voiceBins / BAR_COUNT));
                    let sum = 0;
                    for (let bin = from; bin < until; bin++) sum += samples[bin];
                    const power = sum / (until - from) / 255;
                    return Math.min(1, Math.max(0, (power - 0.055) * 2.7));
                });
                setLevels(updated);
            }
            frame.current = requestAnimationFrame(render);
        };
        frame.current = requestAnimationFrame(render);
    }, [stop]);

    useEffect(() => stop, [stop]);

    return { levels, start, stop };
}
