import { BookOpen, Bot, CalendarDays, ClipboardCheck, FileSearch, Sparkles, UsersRound } from 'lucide-react';
import type { PmpIcon } from '@/types/pmp-public';

const icons = {
    'clipboard-check': ClipboardCheck,
    'calendar-days': CalendarDays,
    'users-round': UsersRound,
    'book-open': BookOpen,
    'bot': Bot,
    'file-search': FileSearch,
    'sparkles': Sparkles,
} as const;

/** Share one icon source with admin-controlled cards; uploaded images override only their own icon. */
export function PmpPublicIcon({ icon, image = '', size = 32 }: { icon: PmpIcon; image?: string; size?: 32 | 36 }) {
    if (image) {
        return <img className="pm-pmp-public-icon-image" src={image} width={size} height={size} loading="lazy" decoding="async" alt="" aria-hidden="true" />;
    }
    const Icon = icons[icon] ?? ClipboardCheck;
    return <Icon aria-hidden="true" width={size} height={size} />;
}
