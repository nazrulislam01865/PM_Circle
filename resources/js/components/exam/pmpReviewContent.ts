import type { ExamQuestion, ExamResponse } from './ExamShared';

/** Rich text-column schemas, with a backward-compatible plain-text fallback. */
type ContentRecord = Record<string, unknown>;
type Concept = { title: string; description?: string };
type Reference = {
    source?: string; title?: string; chapter?: string; section?: string;
    page?: string; pageLabel?: string; pageRange?: string; examDomain?: string; task?: string; focus?: string; ecoReference?: string; kind?: string;
};

function objectValue(value: string | null | undefined): ContentRecord | null {
    if (!value?.trim().startsWith('{')) return null;
    try {
        const parsed: unknown = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as ContentRecord : null;
    } catch { return null; }
}

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

export function answerRationales(raw: string | null | undefined): { key: string; reason: string }[] {
    const structured = objectValue(raw);
    if (structured) {
        const options = structured.options && typeof structured.options === 'object' && !Array.isArray(structured.options)
            ? structured.options as ContentRecord : structured;
        return ['A', 'B', 'C', 'D'].flatMap(key => text(options[key]) ? [{ key, reason: text(options[key]) }] : []);
    }
    if (!raw) return [];
    const parts = [...raw.matchAll(/(?:^|\s)([A-D]):\s*/g)];
    return parts.map((match, index) => ({
        key: match[1],
        reason: raw.slice((match.index ?? 0) + match[0].length, parts[index + 1]?.index ?? raw.length).trim(),
    })).filter(item => item.reason.length > 0);
}

export function takeawayContent(raw: string | null | undefined) {
    const data = objectValue(raw);
    return { summary: data ? text(data.summary) || text(data.headline) : raw?.trim() ?? '', application: text(data?.application) };
}

export function conceptsContent(raw: string | null | undefined): { items: Concept[]; connection: string; approach: string; industry: string } {
    const data = objectValue(raw);
    if (data) {
        const items: Concept[] = Array.isArray(data.items) ? data.items.flatMap((item: unknown) => {
            if (typeof item === 'string') return item.trim() ? [{ title: item.trim() }] : [];
            if (item && typeof item === 'object' && !Array.isArray(item)) {
                const record = item as ContentRecord;
                const title = text(record.title);
                return title ? [{ title, description: text(record.description) }] : [];
            }
            return [];
        }) : [];
        return { items, connection: text(data.connection), approach: text(data.approach), industry: text(data.industry) };
    }
    // Workbook cells can contain the legacy semicolon list or authored lines
    // in the form 'Concept | Description' and 'How they connect: ...'.
    const value = raw?.trim() ?? '';
    const lines = value.split(/\r?\n/);
    const connectionIndex = lines.findIndex(line => /^how they connect\s*:/i.test(line.trim()));
    const connection = connectionIndex < 0 ? '' : lines.slice(connectionIndex).join('\n').replace(/^\s*how they connect\s*:\s*/i, '').trim();
    const conceptLines = connectionIndex < 0 ? lines : lines.slice(0, connectionIndex);
    const items = conceptLines.flatMap(line => {
        const divider = line.indexOf('|');
        if (divider >= 0) {
            const title = line.slice(0, divider).trim();
            const description = line.slice(divider + 1).trim();
            return title ? [{ title, ...(description ? { description } : {}) }] : [];
        }
        return line.split(';').map(title => ({ title: title.trim() })).filter(item => item.title);
    });
    return { items, connection, approach: '', industry: '' };
}

export function referenceContent(raw: string | null | undefined): { sources: Reference[]; performanceDomain: string; knowledgeArea: string } {
    const data = objectValue(raw);
    if (!data) return {
        sources: raw?.trim() ? [{ title: raw.trim() }] : [] as Reference[],
        performanceDomain: '', knowledgeArea: '',
    };
    const sources: Reference[] = Array.isArray(data.sources) ? data.sources.flatMap((source: unknown) => {
        if (typeof source === 'string') return source.trim() ? [{ title: source.trim() }] : [];
        if (!source || typeof source !== 'object' || Array.isArray(source)) return [];
        const entry = source as ContentRecord;
        return [{
            source: text(entry.source), title: text(entry.title), chapter: text(entry.chapter),
            section: text(entry.section), page: text(entry.page), pageLabel: text(entry.pageLabel), pageRange: text(entry.pageRange),
            examDomain: text(entry.examDomain), task: text(entry.task), focus: text(entry.focus), ecoReference: text(entry.ecoReference), kind: text(entry.kind),
        }];
    }) : [];
    // Existing workbook imports store a publication and ECO metadata in one
    // source. Separate those fields at presentation time so saved attempts and
    // existing question banks work without a destructive data migration.
    const separated = sources.flatMap((source): Reference[] => {
        const hasEco = Boolean(source.ecoReference || source.task || source.focus || source.examDomain);
        const alreadyEco = source.kind === 'eco' || /exam content outline|\beco\b/i.test(source.source ?? '');
        if (!hasEco || alreadyEco) return [source];
        const { examDomain, task, focus, ecoReference, ...publication } = source;
        const match = ecoReference?.match(/^(.+?\s+ECO),\s*Domain\s+([IVXLCDM]+),\s*Task\s+(\d+),\s*p\.\s*(\d+)$/i);
        const section = publication.section ?? '';
        const chapter = publication.chapter || section.match(/^(\d+)\.\d+(?:\.\d+)*$/)?.[1];
        const standard = /^The Standard for Project Management, 8th ed\. volume$/i.test(publication.source ?? '');
        const hasPublication = Boolean(publication.source || publication.title || publication.section || publication.page || publication.chapter || publication.pageRange);
        const book: Reference = standard ? {
            ...publication, kind: 'publication', source: 'PMBOK® GUIDE · 8TH EDITION VOLUME',
            title: 'The Standard for Project Management', chapter,
            section: [section, publication.title].filter(Boolean).join(' · '),
        } : { ...publication, kind: 'publication', chapter };
        const eco: Reference = {
            kind: 'eco', source: 'PMP® Exam Content Outline', title: match?.[1] || undefined,
            examDomain: [match?.[2], examDomain].filter(Boolean).join(' · '),
            task: [task, match ? `Task ${match[3]}` : ''].filter(Boolean).join(' · '),
            focus, page: match?.[4], pageLabel: 'ECO page',
            // Keep the original citation whenever it cannot be safely decomposed.
            ecoReference: match ? undefined : ecoReference,
        };
        return [...(hasPublication ? [book] : []), eco];
    });
    return { sources: separated, performanceDomain: text(data.performanceDomain), knowledgeArea: text(data.knowledgeArea) };
}


/** Filter completed-attempt answers without merging incorrect and unanswered. */
export type ReviewFilter = 'all' | 'missed' | 'unanswered' | 'flagged';
export function matchesReviewFilter(question: ExamQuestion, response: ExamResponse | undefined, filter: ReviewFilter): boolean {
    if (filter === 'missed') return Boolean(response?.choice) && response?.choice !== question.correct;
    if (filter === 'unanswered') return !response?.choice;
    if (filter === 'flagged') return Boolean(response?.marked);
    return true;
}

/** Metadata is shown only when the question author actually supplied it. */
export function reviewQuestionMetadata(question: ExamQuestion) {
    const concepts = conceptsContent(question.concepts);
    return { approach: question.approach ?? concepts.approach, industry: question.industry ?? concepts.industry };
}

