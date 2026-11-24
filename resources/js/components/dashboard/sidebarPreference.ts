// UI preference only; no account data or permissions are persisted here.
const storageKey = 'pm-circle:member-sidebar-collapsed';
let memoryPreference: boolean | undefined;

export function readSidebarPreference(): boolean {
    if (typeof window === 'undefined') return false;
    if (memoryPreference !== undefined) return memoryPreference;
    try {
        const value = window.localStorage.getItem(storageKey);
        if (value === 'true' || value === 'false') memoryPreference = value === 'true';
    } catch { /* Storage may be disabled. Retain the in-memory preference. */ }
    return memoryPreference ?? false;
}

export function writeSidebarPreference(collapsed: boolean): void {
    memoryPreference = collapsed;
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(storageKey, String(collapsed)); } catch { /* Optional browser storage. */ }
}
