import { useId, type ReactNode } from 'react';
import { postComposerTypes, type PostComposerTopic } from './postComposerTypes';

type PostComposerCardProps = {
    avatar: ReactNode;
    selectedTopic?: PostComposerTopic;
    onCompose: (topic: PostComposerTopic) => void;
    disabled?: boolean;
};

/** Reusable composer entry point; the parent owns identity and editor state. */
export function PostComposerCard({ avatar, selectedTopic = 'From my project', onCompose, disabled = false }: PostComposerCardProps) {
    const titleId = useId();

    return (
        <section className="pm-post-composer-card" aria-labelledby={titleId}>
            <div className="pm-post-composer-card-heading">
                {avatar}
                <h2 id={titleId}>Create a post</h2>
            </div>
            <button
                type="button"
                className="pm-post-composer-card-prompt"
                aria-haspopup="dialog"
                disabled={disabled}
                onClick={() => onCompose(selectedTopic)}
            >
                {disabled ? 'Posting is temporarily paused' : 'Share a lesson, ask a question...'}
            </button>
            <div className="pm-post-composer-card-actions" role="group" aria-label="Choose a post type">
                {postComposerTypes.map(({ value, label, icon: Icon }) => (
                    <button
                        key={value}
                        type="button"
                        className={`pm-post-composer-card-action${selectedTopic === value ? ' is-selected' : ''}`}
                        aria-haspopup="dialog"
                        disabled={disabled}
                        onClick={() => onCompose(value)}
                    >
                        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                        <span>{label}</span>
                    </button>
                ))}
            </div>
        </section>
    );
}
