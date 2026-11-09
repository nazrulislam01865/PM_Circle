import { router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { examBase } from '@/components/exam/ExamShared';

/** One guarded start request for both new and repeat practice attempts. */
export function useExamStart() {
    const busy = useRef(false);
    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState('');

    const startExam = async () => {
        if (busy.current) return;
        busy.current = true;
        setStarting(true);
        setStartError('');
        try {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const response = await fetch(`${examBase}/start`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': token,
                },
            });
            if (!response.ok) {
                if (response.status === 429) throw new Error('Too many exam starts. Please try again shortly.');
                if (response.status === 419) throw new Error('Your session has expired. Refresh the page and try again.');
                if (response.status === 403) throw new Error('Your membership does not currently allow this practice exam.');
                throw new Error('Unable to start the exam. Please try again.');
            }
            const result: { takeUrl?: string } = await response.json();
            const next = new URL(result.takeUrl ?? '', window.location.origin);
            if (!result.takeUrl || next.origin !== window.location.origin ||
                !/^\/exams\/pmp\/attempts\/\d+$/.test(next.pathname)) {
                throw new Error('Unable to open the exam. Please try again.');
            }
            router.visit(`${next.pathname}${next.search}`);
        } catch (error) {
            setStartError(error instanceof Error ? error.message : 'Unable to start the exam. Please try again.');
        } finally {
            busy.current = false;
            setStarting(false);
        }
    };

    return { startExam, starting, startError };
}
