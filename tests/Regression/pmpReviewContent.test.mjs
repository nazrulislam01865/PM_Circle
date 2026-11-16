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
