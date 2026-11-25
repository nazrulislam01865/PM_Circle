import { useId, useState } from 'react';
import type { ExamQuestion } from './ExamShared';
import { answerRationales, takeawayContent, conceptsContent, referenceContent } from './pmpReviewContent';

/** One explanation panel per question. Switching tabs replaces the panel content. */
const tabs = ['Explanation', 'Key Takeaway', 'Related Concepts', 'References'] as const;
type Tab = (typeof tabs)[number];

export function PmpReviewExplanation({ question }: { question: ExamQuestion }) {
    const [tab, setTab] = useState<Tab>('Explanation');
    const uid = useId();
    const selected = tabs.indexOf(tab);

    // A single branch is rendered, never four hidden or stacked copies.
    const renderSelectedContent = () => {
        switch (tab) {
            case 'Explanation': {
                const rationales = answerRationales(question.otherOptions);
                const wrongText = question.otherOptions?.trim();
                return <>
                    <div className="pm-review-correct-rationale">
                        <strong>Why {question.correct} is correct</strong>
                        <p>{question.explanation || 'No detailed explanation has been provided for this question.'}</p>
                    </div>
                    {wrongText && <div className="pm-review-detail-block">
                        <h3>Why the other options fall short</h3>
                        {rationales.length ? <div className="pm-review-other-options">
                            {rationales.filter(item => item.key !== question.correct).map(item => <div key={item.key}>
                                <strong>{item.key}</strong><p>{item.reason}</p>
                            </div>)}
                        </div> : <p className="pm-review-plain-text">{wrongText}</p>}
                    </div>}
                </>;
            }
            case 'Key Takeaway': {
                const takeaway = takeawayContent(question.takeaway);
                return <>
                    <div className="pm-review-takeaway">
                        <small>REMEMBER THIS</small>
                        <strong>{takeaway.summary || 'Review the explanation and the correct answer.'}</strong>
                    </div>
                    <div className="pm-review-detail-block">
                        <h3>Apply it to this question</h3>
                        <p>{takeaway.application || question.explanation || 'Review the question rationale above.'}</p>
                    </div>
                </>;
            }
            case 'Related Concepts': {
                const concepts = conceptsContent(question.concepts);
                return <>
                    {concepts.items.length ? <div className="pm-review-concept-grid">
                        {concepts.items.map((item, index) => <div className="pm-review-concept-card" key={`${index}-${item.title}`}>
                            <h3>{item.title}</h3>{item.description && <p>{item.description}</p>}
                        </div>)}
                    </div> : <p className="pm-review-empty-detail">No related concepts have been provided for this question.</p>}
                    {(concepts.connection || concepts.items.length > 0) && <div className="pm-review-detail-block">
                        <h3>How they connect</h3><p>{concepts.connection || 'No concept connection has been provided for this question.'}</p>
                    </div>}
                </>;
            }
            case 'References': {
                const references = referenceContent(question.references);
                return <>
                    {references.sources.length ? <div className="pm-review-reference-grid">
                        {references.sources.map((source, index) => <div className="pm-review-reference-card" key={`${index}-${source.title}`}>
                            {source.source && <small>{source.source}</small>}
                            {source.title && <h3>{source.title}</h3>}
                            <dl>
                                {source.chapter && <div><dt>Chapter</dt><dd>{source.chapter}</dd></div>}
                                {source.section && <div><dt>Section</dt><dd>{source.section}</dd></div>}
                                {source.kind !== 'eco' && source.page && <div><dt>{source.pageLabel || 'Reference PDF page'}</dt><dd>{source.page}</dd></div>}
                                {(source.pageRange || source.kind === 'publication') && <div><dt>Section page range</dt><dd>{source.pageRange || 'Not provided'}</dd></div>}
                                {source.examDomain && <div><dt>Exam domain</dt><dd>{source.examDomain}</dd></div>}
                                {source.task && <div><dt>ECO task</dt><dd>{source.task}</dd></div>}
                                {source.focus && <div><dt>Task focus</dt><dd>{source.focus}</dd></div>}
                                {source.kind === 'eco' && source.page && <div><dt>{source.pageLabel || 'ECO page'}</dt><dd>{source.page}</dd></div>}
                                {source.ecoReference && <div><dt>ECO reference</dt><dd>{source.ecoReference}</dd></div>}
                            </dl>
                        </div>)}
                    </div> : <p className="pm-review-empty-detail">No references have been provided for this question.</p>}
                    {(references.performanceDomain || references.knowledgeArea) && <div className="pm-review-reference-secondary">
                        {references.performanceDomain && <div><small>PMBOK 8 performance domain</small><strong>{references.performanceDomain}</strong></div>}
                        {references.knowledgeArea && <div><small>Legacy knowledge area</small><strong>{references.knowledgeArea}</strong></div>}
                    </div>}
                </>;
            }
        }
    };

    return <section className="pm-review-explanation" data-pm-review-single-panel="2026-11-22" aria-label="Detailed explanation">
        <div className="pm-review-tabs" role="tablist" aria-label="Explanation sections">
            {tabs.map((label, index) => <button key={label} id={`${uid}-${index}`} type="button" role="tab"
                aria-selected={tab === label} aria-controls={`${uid}-panel`} tabIndex={tab === label ? 0 : -1}
                onClick={() => setTab(label)} onKeyDown={event => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
                    event.preventDefault();
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
                        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
                    setTab(tabs[next]);
                    document.getElementById(`${uid}-${next}`)?.focus();
                }}>{label}</button>)}
        </div>
        <div className="pm-review-tab-content" id={`${uid}-panel`} role="tabpanel"
            aria-labelledby={`${uid}-${selected}`} tabIndex={0}>
            {renderSelectedContent()}
        </div>
    </section>;
}
