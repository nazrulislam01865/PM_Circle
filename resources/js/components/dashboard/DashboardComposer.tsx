import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import { PostComposerCard } from '@/components/community/PostComposerCard';
import { PostComposerDialog } from '@/components/community/PostComposerDialog';
import type { PostComposerTopic } from '@/components/community/postComposerTypes';
import type { DashboardPlan } from '@/types/dashboard';
import type { PostCheckPreview } from '@/components/community/PostCheckCard';

/** Connect the shared composer card to the member identity and post editor. */
export function DashboardComposer({ name, plan, demo, onSubmissionStateChange, blockedUntil = null, returnTo = 'dashboard' }: { name: string; plan: DashboardPlan; demo: boolean; onSubmissionStateChange?: (post: PostCheckPreview | null) => void; blockedUntil?: string | null; returnTo?: 'dashboard' | 'community' }) {
    const blocked = Boolean(blockedUntil && new Date(blockedUntil).getTime() > Date.now());
    const { auth } = usePage<{ auth?: { user?: { avatar_path?: string | null } | null } }>().props;
    const [open, setOpen] = useState(false);
    const [topic, setTopic] = useState<PostComposerTopic>('From my project');
    const compose = (nextTopic: PostComposerTopic) => {
        setTopic(nextTopic);
        setOpen(true);
    };
    return <>
        <PostComposerCard
            avatar={<DashboardAvatar name={name} size={38} demo={demo} src={auth?.user?.avatar_path} />}
            selectedTopic={topic}
            disabled={blocked}
            onCompose={compose}
        />
        <PostComposerDialog open={open && !blocked} onClose={() => setOpen(false)} plan={plan} initialTopic={topic} returnTo={returnTo}
            onSubmissionStateChange={onSubmissionStateChange} onSubmissionError={() => setOpen(true)}/>
    </>;
}
