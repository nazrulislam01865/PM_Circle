import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    answerRationales, conceptsContent, referenceContent, reviewQuestionMetadata, takeawayContent,
} from '../../resources/js/components/exam/pmpReviewContent.ts';

test('legacy question bank rationales are split into individual answer explanations', () => {
    assert.deepEqual(answerRationales('A: Premature decision. B: Not aligned. D: Documents disagreement.'), [
        { key: 'A', reason: 'Premature decision.' },
        { key: 'B', reason: 'Not aligned.' },
        { key: 'D', reason: 'Documents disagreement.' },
    ]);
    assert.deepEqual(answerRationales(null), []);
});

test('legacy simple takeaway, concept and references remain visible', () => {
    assert.deepEqual(takeawayContent('Discuss benefits first.'), { summary: 'Discuss benefits first.', application: '' });
    assert.deepEqual(conceptsContent('Stakeholder engagement; Success measures').items, [
        { title: 'Stakeholder engagement' }, { title: 'Success measures' },
    ]);
    assert.deepEqual(referenceContent('PMBOK Guide: stakeholders').sources, [{ title: 'PMBOK Guide: stakeholders' }]);
});

test('structured rich review fields preserve all screenshot metadata without inventing it', () => {
    const concepts = JSON.stringify({
        approach: 'Hybrid', industry: 'Healthcare',
        items: [{ title: 'Shared outcome', description: 'Agree on intended success.' }, { title: 'Success measures', description: 'Track outcomes.' }],
        connection: 'Measures show whether the outcome is reached.',
    });
    assert.deepEqual(reviewQuestionMetadata({ id: 1, domain: 'People', difficulty: 'Moderate', prompt: '', options: {}, concepts }),
        { approach: 'Hybrid', industry: 'Healthcare' });
    assert.equal(conceptsContent(concepts).items[0].description, 'Agree on intended success.');
    assert.equal(conceptsContent(concepts).connection, 'Measures show whether the outcome is reached.');
    assert.deepEqual(takeawayContent('{"summary":"Align outcomes.","application":"Agree on measures."}'), {
        summary: 'Align outcomes.', application: 'Agree on measures.',
    });
    assert.deepEqual(answerRationales('{"options":{"A":"Too early.","D":"Documents disagreement."}}'), [
        { key: 'A', reason: 'Too early.' }, { key: 'D', reason: 'Documents disagreement.' },
    ]);
    const references = referenceContent(JSON.stringify({
        performanceDomain: 'Stakeholders', knowledgeArea: 'Stakeholder Management',
        sources: [{ source: 'PMBOK Guide', title: 'The Standard for Project Management', chapter: '3', page: '63' }],
    }));
    assert.equal(references.sources[0].chapter, '3');
    assert.equal(references.sources[0].page, '63');
    assert.equal(references.performanceDomain, 'Stakeholders');
});

test('malformed metadata displays safely instead of crashing or creating fictitious reference pages', () => {
    assert.deepEqual(referenceContent('{bad json').sources, [{ title: '{bad json' }]);
    assert.deepEqual(reviewQuestionMetadata({ id: 2, domain: 'People', difficulty: 'Moderate', prompt: '', options: {} }),
        { approach: '', industry: '' });
    assert.equal(conceptsContent(null).items.length, 0);
});

test('review filters distinguish an incorrect answer from an unanswered question', async () => {
    const { matchesReviewFilter } = await import('../../resources/js/components/exam/pmpReviewContent.ts');
    const question = { id: 42, domain: 'People', difficulty: 'Moderate', prompt: 'Example', options: { A: 'One', B: 'Two', C: 'Three', D: 'Four' }, correct: 'D' };
    const wrong = { choice: 'B', marked: false };
    const right = { choice: 'D', marked: false };
    const blank = { choice: null, marked: false };
    assert.equal(matchesReviewFilter(question, wrong, 'missed'), true);
    assert.equal(matchesReviewFilter(question, right, 'missed'), false);
    assert.equal(matchesReviewFilter(question, blank, 'missed'), false);
    assert.equal(matchesReviewFilter(question, blank, 'unanswered'), true);
    assert.equal(matchesReviewFilter(question, right, 'unanswered'), false);
    assert.equal(matchesReviewFilter(question, { choice: 'D', marked: true }, 'flagged'), true);
    assert.equal(matchesReviewFilter(question, blank, 'all'), true);
});


test('original workbook citation becomes separate publication and ECO cards without changing stored data', () => {
    const raw = JSON.stringify({ sources: [{
        source: 'The Standard for Project Management, 8th ed. volume', title: 'Focus on Value',
        section: '3.4', page: 63, examDomain: 'People', task: 'I-01', focus: 'Build a shared vision',
        ecoReference: 'July 2026 ECO, Domain I, Task 1, p. 7',
    }], performanceDomain: 'Stakeholders', knowledgeArea: 'Stakeholder Management' });
    const result = referenceContent(raw);
    assert.equal(result.sources.length, 2);
    const [book, eco] = result.sources;
    assert.equal(book.title, 'The Standard for Project Management');
    assert.equal(book.chapter, '3');
    assert.equal(book.section, '3.4 · Focus on Value');
    assert.equal(book.page, '63');
    assert.equal(book.task, undefined);
    assert.equal(eco.title, 'July 2026 ECO');
    assert.equal(eco.examDomain, 'I · People');
    assert.equal(eco.task, 'I-01 · Task 1');
    assert.equal(eco.focus, 'Build a shared vision');
    assert.equal(eco.page, '7');
    assert.equal(eco.pageLabel, 'ECO page');
    assert.equal(result.performanceDomain, 'Stakeholders');
    assert.equal(result.knowledgeArea, 'Stakeholder Management');
});

test('appendix citations, unknown ECO formats and separately authored sources remain intact', () => {
    const result = referenceContent(JSON.stringify({sources: [{source: 'PMBOK Guide, 8th ed.', title: 'Source Selection Criteria', section: 'X4.7', page: '354', ecoReference: 'Custom citation', task: 'II-05'}]}));
    assert.equal(result.sources.length, 2);
    assert.equal(result.sources[0].chapter, undefined);
    assert.equal(result.sources[0].section, 'X4.7');
    assert.equal(result.sources[1].ecoReference, 'Custom citation');
    assert.equal(result.sources[1].page, undefined);
    const separated = referenceContent(JSON.stringify({sources: [{source: 'PMBOK Guide', title: 'Source'}, {source: 'PMP Exam Content Outline', title: 'July 2026 ECO', task: 'I-01', page: '7'}]}));
    assert.equal(separated.sources.length, 2);
    assert.equal(separated.sources[1].task, 'I-01');
});

test('workbook and admin authored concepts preserve descriptions and connection with legacy fallback', () => {
    const result = conceptsContent('Shared outcome | Agree what better check-in looks like.\nSuccess measures | Track wait time and staffing.\nHow they connect: Measures show whether the outcome is reached.');
    assert.deepEqual(result.items, [{title:'Shared outcome', description:'Agree what better check-in looks like.'}, {title:'Success measures', description:'Track wait time and staffing.'}]);
    assert.equal(result.connection, 'Measures show whether the outcome is reached.');
    assert.equal(conceptsContent('Shared outcome; success measures').connection, '');
});
