import { router } from '@inertiajs/react';
import { useState } from 'react';
import { useHomeShare, type RequestToJoin } from '@/components/home/HomeEngagement';

/** One save/share state for the desktop row and mobile overflow menu. */
export function usePostSecondaryActions({ postId, canInteract, onJoin, saved = false, onSavedChange }: {
    postId: number; canInteract: boolean; onJoin: RequestToJoin; saved?: boolean; onSavedChange?: (saved: boolean) => void;
}) {
    const url = `/posts/${postId}`;
    const share = useHomeShare({ href: url, canInteract, onJoin });
    const [saveBusy, setSaveBusy] = useState(false);
    const [saveError, setSaveError] = useState('');
    const toggleSave = async () => {
        if (!canInteract) { onJoin('save a post'); return; }
        if (saveBusy) return;
        if (!onSavedChange) {
            setSaveBusy(true);
            setSaveError('');
            const options = { preserveScroll: true, onError: () => setSaveError('Could not update saved post.'), onFinish: () => setSaveBusy(false) };
            if (saved) router.delete(`${url}/save`, options);
            else router.post(`${url}/save`, {}, options);
            return;
        }
        setSaveBusy(true);
        setSaveError('');
        try {
            const response = await fetch(`${url}/save`, {
                method: saved ? 'DELETE' : 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
            });
            if (!response.ok) throw new Error(response.status === 419 ? 'Session expired. Refresh and try again.' : 'Could not update saved post.');
            const result = await response.json() as { saved: boolean };
            onSavedChange(result.saved);
        } catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Could not update saved post.');
        } finally { setSaveBusy(false); }
    };
    return { ...share, toggleSave, saveBusy, saveError, saved };
}
export type PostSecondaryActions = ReturnType<typeof usePostSecondaryActions>;
