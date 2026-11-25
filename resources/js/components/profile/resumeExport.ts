import type { ResumeDocument } from './ResumeDocumentFields';
import type { ResumeFields } from './ResumeDraftPreview';

export type ResumeExportFormat = 'pdf' | 'word';

// Export the current editor snapshot, not the last saved account profile.
export async function exportResumeDraft(data: ResumeFields, cv: ResumeDocument, format: ResumeExportFormat): Promise<void> {
    // Open synchronously during the click so popup blockers do not prevent printing.
    const printWindow = format === 'pdf' ? window.open('about:blank', '_blank') : null;
    if (format === 'pdf' && !printWindow) throw new Error('Allow popups for this site, then try printing again.');
    if (printWindow) {
        printWindow.opener = null;
        printWindow.document.title = 'Preparing résumé';
        printWindow.document.body.textContent = 'Preparing your résumé…';
    }
    try {
        const { name, email, role, location, summary } = data;
        const response = await fetch('/dashboard/resume-assistant/export', {
            method: 'POST', cache: 'no-store', credentials: 'same-origin',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '' },
            body: JSON.stringify({ name, email, role, location, summary, document: cv, format }),
            signal: AbortSignal.timeout(45000),
        });
        if (response.status === 429) {
            const wait = Number(response.headers.get('Retry-After'));
            throw new Error(`Too many export requests. ${wait > 0 ? `Try again in ${Math.ceil(wait)} seconds.` : 'Please try again shortly.'}`);
        }
        if (response.status === 401 || response.status === 419 || response.redirected) throw new Error('Your session has expired. Sign in again before exporting.');
        if (response.status === 403) throw new Error('Your membership does not allow this export.');
        if (response.status === 413) throw new Error('Your résumé is too long to export. Shorten the descriptions and try again.');
        if (response.status === 422) {
            const result = await response.json().catch(() => null);
            throw new Error(result?.message ?? 'Check your résumé fields before exporting.');
        }
        const expected = format === 'pdf' ? 'text/html' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (!response.ok || !response.headers.get('content-type')?.includes(expected)) throw new Error('Résumé export is temporarily unavailable. Please try again.');
        const blob = await response.blob();
        if (!blob.size) throw new Error('The exported résumé was empty. Please try again.');
        if (format === 'pdf') {
            if (!printWindow || printWindow.closed) throw new Error('The print window was closed. Please try again.');
            // The server escapes every user field. A blob URL keeps personal details out of the request URL.
            const url = URL.createObjectURL(blob);
            printWindow.location.replace(url);
            // Keep the document available while the user is reading/printing it. Release when the window closes.
            const timer = window.setInterval(() => {
                if (printWindow.closed) { window.clearInterval(timer); URL.revokeObjectURL(url); }
            }, 1000);
        } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = 'pm-circle-resume.docx';
            document.body.appendChild(link); link.click(); link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 30000);
        }
    } catch (error) {
        printWindow?.close();
        if (error instanceof Error && error.name === 'TimeoutError') throw new Error('Export timed out. Please try again.');
        if (error instanceof TypeError) throw new Error('Could not connect to the server. Check your connection and try again.');
        throw error;
    }
}
