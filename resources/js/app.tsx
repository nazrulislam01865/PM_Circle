import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AuthLayout from '@/layouts/auth-layout';

const appName = import.meta.env.VITE_APP_NAME || 'PM Circle';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
            case name.startsWith('public/'):
            case name.startsWith('community/'):
            case name.startsWith('scenarios/'):
            case name.startsWith('account/'):
            case name.startsWith('learning/'):
            case name.startsWith('settings/'):
            case name === 'auth/login':
            case name === 'auth/forgot-password':
            case name === 'auth/reset-password':
            case name.startsWith('auth/RegisterStep'):
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            default:
                return null;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: 'var(--pm-tone-0966e8)',
    },
});

// This will set light / dark mode on load...
initializeTheme();
