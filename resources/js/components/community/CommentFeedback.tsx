import { AlertCircle, Clock3, Info, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

const icons = { checking: LoaderCircle, info: Clock3, warning: AlertCircle, error: AlertCircle };

/** Shared, accessible feedback for comment and reply moderation and validation. */
export function CommentFeedback({ tone, message, children }: {
    tone: keyof typeof icons;
    message: string;
    children?: ReactNode;
}) {
    const Icon = icons[tone] ?? Info;
    return <div className={`pm-comment-feedback is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
        <Icon className="pm-comment-feedback-icon" aria-hidden="true"/>
        <div className="pm-comment-feedback-content"><span>{message}</span>{children && <div className="pm-comment-feedback-actions">{children}</div>}</div>
    </div>;
}
