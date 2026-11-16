import type { ExamQuestion } from './ExamShared';

/** Rich text-column schemas, with a backward-compatible plain-text fallback. */
type ContentRecord = Record<string, unknown>;
type Concept = { title: string; description?: string };
type Reference = {
    source?: string; title?: string; chapter?: string; section?: string;
    page?: string; pageLabel?: string; pageRange?: string; examDomain?: string; task?: string; focus?: string;
};

function objectValue(value: string | null | undefined): ContentRecord | null {
    if (!value?.trim().startsWith('{')) return null;
    try {
        const parsed: unknown = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as ContentRecord : null;
    } catch { return null; }
}

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
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
    return { items: (raw ?? '').split(/\s*[;\n]\s*/).map(title => ({ title: title.trim() })).filter(item => item.title), connection: '', approach: '', industry: '' };
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
            examDomain: text(entry.examDomain), task: text(entry.task), focus: text(entry.focus),
        }];
    }) : [];
    return { sources, performanceDomain: text(data.performanceDomain), knowledgeArea: text(data.knowledgeArea) };
}

/** Metadata is shown only when the question author actually supplied it. */
export function reviewQuestionMetadata(question: ExamQuestion) {
    const concepts = conceptsContent(question.concepts);
    return { approach: concepts.approach, industry: concepts.industry };
}

