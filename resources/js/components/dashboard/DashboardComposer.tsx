import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import { PostComposerCard } from '@/components/community/PostComposerCard';
import { PostComposerDialog } from '@/components/community/PostComposerDialog';
import type { PostComposerTopic } from '@/components/community/postComposerTypes';
import type { DashboardPlan } from '@/types/dashboard';

/** Connect the shared composer card to the member identity and post editor. */
export function DashboardComposer({ name, plan, demo }: { name: string; plan: DashboardPlan; demo: boolean }) {
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
            onCompose={compose}
        />
        <PostComposerDialog open={open} onClose={() => setOpen(false)} plan={plan} initialTopic={topic}/>
    </>;
}
