// Keep only the latest score received by My Profile in this browser session's
// running app. Inertia history can restore an older Home payload after editing.
// This is a refresh hint, never a replacement for the server's score or reward.
let latest: { memberId: number; completion: number } | undefined;

export function rememberProfileCompletion(memberId: number, completion: number): void {
    latest = { memberId, completion };
}

export function needsProfileCompletionRefresh(memberId: number, completion: number): boolean {
    return latest?.memberId === memberId && latest.completion !== completion;
}
