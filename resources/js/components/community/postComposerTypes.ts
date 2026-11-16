import { ChartNoAxesColumn, MessageCircle, Pencil } from 'lucide-react';

/** Shared by the composer entry card and the full post editor. */
export const postComposerTypes = [
    { value: 'From my project', label: 'Share thoughts', editorLabel: 'Post', icon: Pencil },
    { value: 'Ask the community', label: 'Ask a question', editorLabel: 'Question', icon: MessageCircle },
    { value: 'Poll', label: 'Create a poll', editorLabel: 'Poll', icon: ChartNoAxesColumn },
] as const;

export type PostComposerTopic = (typeof postComposerTypes)[number]['value'];
