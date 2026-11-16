import { useId, useState } from 'react';
import type { ExamQuestion } from './ExamShared';
import { answerRationales, takeawayContent, conceptsContent, referenceContent } from './pmpReviewContent';

/**
 * Questions imported before the richer review layout contain plain text.
 * Rich authoring is optional: a JSON object in an existing text column adds
 * detail without requiring a migration or changing old question imports.
 */
const tabs = ['Explanation', 'Key Takeaway', 'Related Concepts', 'References'] as const;
type Tab = (typeof tabs)[number];

export function PmpReviewExplanation({ question }: { question: ExamQuestion }) {
    const [tab, setTab] = useState<Tab>('Explanation');
    const uid = useId();
    const takeaway = takeawayContent(question.takeaway);
    const concepts = conceptsContent(question.concepts);
    const references = referenceContent(question.references);
    const rationales = answerRationales(question.otherOptions);
    const wrongText = question.otherOptions?.trim();

    return <section className="pm-review-explanation" aria-label="Detailed explanation">
        <div className="pm-review-tabs" role="tablist" aria-label="Explanation sections">
            {tabs.map(label => <button key={label} id={`${uid}-${tabs.indexOf(label)}`} type="button" role="tab"
                aria-selected={tab === label} aria-controls={`${uid}-panel`} tabIndex={tab === label ? 0 : -1}
                onClick={() => setTab(label)} onKeyDown={event => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
                    event.preventDefault();
                    const current = tabs.indexOf(label);
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
                        : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
                    setTab(tabs[next]);
                    document.getElementById(`${uid}-${next}`)?.focus();
                }}>{label}</button>)}
        </div>
        <div className="pm-review-tab-content" id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-${tabs.indexOf(tab)}`} tabIndex={0}>
            {tab === 'Explanation' && <>
                <div className="pm-review-correct-rationale"><strong>Why {question.correct} is correct</strong><p>{question.explanation || 'No detailed explanation has been provided for this question.'}</p></div>
                {wrongText && <div className="pm-review-detail-block"><h3>Why the other options fall short</h3>
                    {rationales.length ? <div className="pm-review-other-options">{rationales.filter(item => item.key !== question.correct).map(item => <div key={item.key}><strong>{item.key}</strong><p>{item.reason}</p></div>)}</div>
                        : <p className="pm-review-plain-text">{wrongText}</p>}
                </div>}
            </>}
            {tab === 'Key Takeaway' && <>
                <div className="pm-review-takeaway"><small>REMEMBER THIS</small><strong>{takeaway.summary || 'Review the explanation and the correct answer.'}</strong></div>
                <div className="pm-review-detail-block"><h3>Apply it to this question</h3><p>{takeaway.application || question.explanation || 'Review the question rationale above.'}</p></div>
            </>}
            {tab === 'Related Concepts' && <>
                {concepts.items.length ? <div className="pm-review-concept-grid">
                    {concepts.items.map((item, index) => <div className="pm-review-concept-card" key={`${index}-${item.title}`}><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</div>)}
                </div> : <p className="pm-review-empty-detail">No related concepts have been provided for this question.</p>}
                {concepts.connection && <div className="pm-review-detail-block"><h3>How they connect</h3><p>{concepts.connection}</p></div>}
            </>}
            {tab === 'References' && <>
                {references.sources.length ? <div className="pm-review-reference-grid">{references.sources.map((source, index) =>
                    <div className="pm-review-reference-card" key={`${index}-${source.title}`}>
                        {source.source && <small>{source.source}</small>}
                        {source.title && <h3>{source.title}</h3>}
                        <dl>
                            {source.chapter && <div><dt>Chapter</dt><dd>{source.chapter}</dd></div>}
                            {source.section && <div><dt>Section</dt><dd>{source.section}</dd></div>}
                            {source.page && <div><dt>{source.pageLabel || 'Reference PDF page'}</dt><dd>{source.page}</dd></div>}
                            {source.pageRange && <div><dt>Section page range</dt><dd>{source.pageRange}</dd></div>}
                            {source.examDomain && <div><dt>Exam domain</dt><dd>{source.examDomain}</dd></div>}
                            {source.task && <div><dt>ECO task</dt><dd>{source.task}</dd></div>}
                            {source.focus && <div><dt>Task focus</dt><dd>{source.focus}</dd></div>}
                        </dl>
                    </div>)} </div> : <p className="pm-review-empty-detail">No references have been provided for this question.</p>}
                {(references.performanceDomain || references.knowledgeArea) && <div className="pm-review-reference-secondary">
                    {references.performanceDomain && <div><small>PMBOK 8 performance domain</small><strong>{references.performanceDomain}</strong></div>}
                    {references.knowledgeArea && <div><small>Legacy knowledge area</small><strong>{references.knowledgeArea}</strong></div>}
                </div>}
            </>}
        </div>
    </section>;
}
