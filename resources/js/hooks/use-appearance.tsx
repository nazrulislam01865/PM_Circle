import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly systemAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => boolean;
};

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'system';
let initialized = false;

const isAppearance = (value: unknown): value is Appearance => value === 'light' || value === 'dark' || value === 'system';

const prefersDark = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax${location.protocol === 'https:' ? ';Secure' : ''}`;
};

const getCookieAppearance = (): Appearance | null => {
    try {
        const value = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('appearance='))?.slice(11);
        return isAppearance(value) ? value : null;
    } catch { return null; }
};

const getStoredAppearance = (): Appearance => {
    if (typeof window === 'undefined') {
        return 'system';
    }

    try {
        const stored = localStorage.getItem('appearance');
        if (isAppearance(stored)) return stored;
    } catch { /* Fall back to the server-provided browser preference. */ }
    const initial = document.documentElement.dataset.appearance;
    return isAppearance(initial) ? initial : 'system';
};

const isDarkMode = (appearance: Appearance): boolean => {
    return appearance === 'dark' || (appearance === 'system' && prefersDark());
};

const applyTheme = (appearance: Appearance): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const isDark = isDarkMode(appearance);

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.appearance = appearance;
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

const mediaQuery = (): MediaQueryList | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const handleSystemThemeChange = (): void => { applyTheme(currentAppearance); notify(); };

const handleStorageChange = (event: StorageEvent): void => {
    if (event.key !== 'appearance') return;
    currentAppearance = isAppearance(event.newValue) ? event.newValue : getCookieAppearance() ?? 'system';
    applyTheme(currentAppearance);
    notify();
};

export function initializeTheme(): void {
    if (typeof window === 'undefined' || initialized) return;
    initialized = true;
    currentAppearance = getStoredAppearance();
    applyTheme(currentAppearance);
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);
    window.addEventListener('storage', handleStorageChange);
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'system',
    );

    const resolvedAppearance: ResolvedAppearance = useSyncExternalStore(
        subscribe, () => isDarkMode(currentAppearance) ? 'dark' : 'light', () => 'light',
    );

    const systemAppearance: ResolvedAppearance = useSyncExternalStore(
        subscribe, () => prefersDark() ? 'dark' : 'light', () => 'light',
    );

    const updateAppearance = (mode: Appearance): boolean => {
        // A blocked storage API must not prevent applying the theme in this tab.
        let stored = false;
        try { localStorage.setItem('appearance', mode); stored = localStorage.getItem('appearance') === mode; } catch { /* Cookie fallback. */ }
        try { setCookie('appearance', mode); stored = stored || getCookieAppearance() === mode; } catch { /* Apply in memory if both stores are blocked. */ }
        currentAppearance = mode;
        applyTheme(mode);
        notify();
        return stored;
    };

    return { appearance, resolvedAppearance, systemAppearance, updateAppearance } as const;
}
