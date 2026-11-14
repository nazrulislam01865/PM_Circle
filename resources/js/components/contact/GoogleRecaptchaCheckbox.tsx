import { useEffect, useRef, useState } from 'react';

type RecaptchaAPI = {
    render: (container: HTMLElement, options: {
        sitekey: string;
        size?: 'normal' | 'compact';
        callback: (token: string) => void;
        'expired-callback': () => void;
        'error-callback': () => void;
    }) => number;
    reset: (widgetId?: number) => void;
};

declare global {
    interface Window {
        grecaptcha?: RecaptchaAPI;
        pmCircleContactCaptchaReady?: () => void;
    }
}

let pendingLoad: Promise<RecaptchaAPI> | null = null;

function loadRecaptcha(): Promise<RecaptchaAPI> {
    if (window.grecaptcha?.render) return Promise.resolve(window.grecaptcha);
    if (pendingLoad) return pendingLoad;

    pendingLoad = new Promise<RecaptchaAPI>((resolve, reject) => {
        window.pmCircleContactCaptchaReady = () => {
            if (window.grecaptcha?.render) resolve(window.grecaptcha);
            else reject(new Error('Google reCAPTCHA did not initialize.'));
        };

        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?onload=pmCircleContactCaptchaReady&render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.pmcRecaptcha = 'true';
        script.onerror = () => {
            pendingLoad = null;
            script.remove();
            reject(new Error('Google reCAPTCHA could not be loaded.'));
        };
        document.head.appendChild(script);
    });

    return pendingLoad;
}

type GoogleRecaptchaCheckboxProps = {
    siteKey: string;
    onVerify: (token: string) => void;
    onError: (message: string) => void;
    resetKey: number;
};

/** Isolated integration: no extra React reCAPTCHA dependency or polling. */
export function GoogleRecaptchaCheckbox({ siteKey, onVerify, onError, resetKey }: GoogleRecaptchaCheckboxProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<number | null>(null);
    const apiRef = useRef<RecaptchaAPI | null>(null);
    const callbackRef = useRef({ onVerify, onError });
    const [loadError, setLoadError] = useState('');
    callbackRef.current = { onVerify, onError };

    useEffect(() => {
        let cancelled = false;

        loadRecaptcha().then(api => {
            if (cancelled || !containerRef.current) return;
            apiRef.current = api;
            widgetRef.current = api.render(containerRef.current, {
                sitekey: siteKey,
                size: containerRef.current.clientWidth < 304 ? 'compact' : 'normal',
                callback: token => callbackRef.current.onVerify(token),
                'expired-callback': () => {
                    callbackRef.current.onVerify('');
                    callbackRef.current.onError('The reCAPTCHA challenge expired. Please complete it again.');
                },
                'error-callback': () => {
                    callbackRef.current.onVerify('');
                    callbackRef.current.onError('Could not verify the reCAPTCHA challenge. Please try again.');
                },
            });
        }).catch(() => {
            if (!cancelled) setLoadError('Google reCAPTCHA could not load. Check your connection and refresh the page.');
        });

        return () => { cancelled = true; };
    }, [siteKey]);

    useEffect(() => {
        if (resetKey > 0 && widgetRef.current !== null) {
            apiRef.current?.reset(widgetRef.current);
        }
    }, [resetKey]);

    return <div className="pm-contact-recaptcha-field">
        <div ref={containerRef} className="pm-contact-recaptcha-widget" aria-label="Google reCAPTCHA verification"/>
        {loadError && <span className="pm-contact-error" role="alert">{loadError}</span>}
    </div>;
}
