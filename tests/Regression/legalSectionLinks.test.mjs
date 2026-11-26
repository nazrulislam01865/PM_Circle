import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { legalLinks, legalLinkText, replaceLegalLink, safeLink } from '../../resources/js/components/pm/legal-links.ts';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('Existing links are located independently, even when labels repeat', () => {
    const body = 'See [Contact](/contact) or [Contact](/help).';
    const links = legalLinks(body);
    assert.equal(links.length, 2);
    assert.equal(replaceLegalLink(body, links[1], '[Support](/help)'), 'See [Contact](/contact) or [Support](/help).');
    assert.equal(replaceLegalLink(body, links[0], links[0].label), 'See Contact or [Contact](/help).');
});
test('Link input accepts local and HTTPS URLs, rejects unsafe targets and broken syntax', () => {
    assert.equal(legalLinkText('Contact', '/contact'), '[Contact](/contact)');
    assert.equal(legalLinkText('Help', 'https://example.com/help?q=1'), '[Help](https://example.com/help?q=1)');
    for (const href of ['javascript:alert(1)', '//example.com', 'http://example.com', 'https://user:pass@example.com', 'https://example.com/a(b)', 'https://example.com/a b', 'https://example.com\\foo']) assert.equal(safeLink(href), null, href);
    assert.equal(legalLinkText('bad]label', '/contact'), null);
});
test('All legacy links remain detectable and valid', () => {
    const defaults = JSON.parse(read('resources/legal/defaults.json'));
    for (const doc of Object.values(defaults)) {
        const links = doc.sections.flatMap(s=>legalLinks(s.body));
        assert.ok(links.length > 0);
        assert.ok(links.every(l=>safeLink(l.href)));
    }
});
test('Contents visibility and label controls do not remove the article section', () => {
    const page = read('resources/js/components/pm/LegalPage.tsx');
    const editor = read('resources/js/pages/admin/LegalPage.tsx');
    assert.match(page, /content.sections.filter\(section => section.show_in_toc !== false\)/);
    assert.match(page, /section.toc_label \|\| section.title/);
    assert.match(page, /content.sections.map\(section => <section/);
    assert.match(editor, /Delete section/);
    assert.match(editor, /Show link in contents/);
    assert.match(editor, /<LegalSectionLinks/);
    assert.match(read('app/Http/Requests/Admin/UpdateLegalPageRequest.php'), /array:id,title,body,toc_label,show_in_toc/);
});
