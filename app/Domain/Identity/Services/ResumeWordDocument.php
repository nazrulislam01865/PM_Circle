<?php

namespace App\Domain\Identity\Services;

/** Native WordprocessingML, with no user-supplied markup or external relationships. */
final class ResumeWordDocument
{
    private const NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    private const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    private const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
    private const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

    private static function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES | ENT_SUBSTITUTE | ENT_DISALLOWED, 'UTF-8');
    }

    private static function run(string $text, string $properties = ''): string
    {
        $lines = preg_split('/\R/u', $text) ?: [$text];
        return '<w:r><w:rPr>'.$properties.'</w:rPr>'.implode('<w:br/>', array_map(fn ($line) => '<w:t xml:space="preserve">'.self::escape($line).'</w:t>', $lines)).'</w:r>';
    }

    private static function paragraph(string $runs, string $style = 'Body', string $properties = ''): string
    {
        return '<w:p><w:pPr><w:pStyle w:val="'.$style.'"/>'.$properties.'</w:pPr>'.$runs.'</w:p>';
    }

    private static function text(string $text, string $style = 'Body', string $properties = ''): string
    {
        return self::paragraph(self::run($text.($style === 'Section' ? ' ' : '')).($style === 'Section' ? '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:tab/></w:r>' : ''), $style, $properties);
    }

    private static function tableRow(array $cells, array $widths, array $bold = []): string
    {
        $row = '<w:tr><w:trPr><w:cantSplit/></w:trPr>';
        foreach ($cells as $i => $cell) {
            $row .= '<w:tc><w:tcPr><w:tcW w:w="'.$widths[$i].'" w:type="dxa"/></w:tcPr>'.self::paragraph(self::run((string) $cell, in_array($i, $bold, true) ? '<w:b/>' : '')).'</w:tc>';
        }
        return $row.'</w:tr>';
    }

    private static function table(array $rows, array $widths): string
    {
        return '<w:tbl><w:tblPr><w:tblW w:w="'.array_sum($widths).'" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>'.implode('', array_map(fn ($width) => '<w:gridCol w:w="'.$width.'"/>', $widths)).'</w:tblGrid>'.implode('', $rows).'</w:tbl>';
    }

    public static function parts(array $fields, array $document, string $date): array
    {
        $body = self::text((string) (($fields['name'] ?? '') ?: 'Your name'), 'Candidate');
        foreach ([['Headline', ($document['headline'] ?? '') ?: ($fields['role'] ?? '')], ['Location', $fields['location'] ?? '']] as [$style, $value]) {
            if (trim((string) $value) !== '') $body .= self::text((string) $value, $style);
        }
        $contacts = array_filter([$document['phone'] ?? '', $fields['email'] ?? '', $document['portfolio'] ?? '', $document['github'] ?? '', $document['linkedin'] ?? ''], fn ($value) => trim((string) $value) !== '');
        if ($contacts) $body .= self::text(implode(' | ', $contacts), 'Contacts');
        if (trim((string) ($fields['summary'] ?? '')) !== '') {
            $body .= self::text('Personal Profile', 'Section').self::text((string) $fields['summary']);
        }
        foreach (ResumeExport::SECTIONS as $section => $title) {
            $rows = ResumeExport::rows($document, $section);
            if (!$rows) continue;
            $body .= self::text($title, 'Section');
            if (in_array($section, ['skills', 'interests', 'languages'], true)) {
                $body .= self::table(array_map(fn ($row) => self::tableRow([$row['title'] ?? '', $row['description'] ?? ''], [2635, 7905], [0]), $rows), [2635, 7905]);
                continue;
            }
            if ($section === 'achievements') {
                $body .= self::table(array_map(fn ($row) => self::tableRow([$row['period'] ?? '', $row['title'] ?? '', $row['subtitle'] ?? ''], [1265, 7167, 2108]), $rows), [1265, 7167, 2108]);
                continue;
            }
            foreach ($rows as $row) {
                $entry = [];
                foreach (['title' => 'Entry', 'location' => 'LocationEntry', 'subtitle' => 'Subtitle', 'period' => 'Period'] as $key => $style) {
                    if (trim((string) ($row[$key] ?? '')) !== '') $entry[] = [$row[$key], $style];
                }
                $details = ResumeExport::details($row);
                foreach ($entry as $i => [$value, $style]) {
                    $body .= self::text((string) $value, $style, ($i < count($entry) - 1 || $details) ? '<w:keepNext/>' : '');
                }
                foreach ($details as [$label, $line]) {
                    $body .= self::paragraph(($label ? self::run($label.': ', '<w:b/>') : '').self::run($line), 'Bullet', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>');
                }
            }
        }
        $styles = [
            'Body' => [20, '333333', '', '', 0, 45],
            'Candidate' => [44, '333333', '', 'center', 0, 20],
            'Headline' => [24, '777777', '<w:b/><w:i/>', 'center', 0, 20],
            'Location' => [20, '777777', '<w:i/>', 'center', 0, 20],
            'Contacts' => [16, '333333', '', 'center', 170, 120],
            'Section' => [32, '333333', '<w:b/>', '', 210, 80],
            'Entry' => [24, '333333', '<w:b/>', '', 90, 10],
            'LocationEntry' => [16, '777777', '<w:i/>', '', 0, 10],
            'Subtitle' => [20, '5D5D5D', '', '', 0, 10],
            'Period' => [16, '333333', '<w:i/>', '', 0, 35],
            'Bullet' => [20, '333333', '', '', 0, 35],
            'Footer' => [16, '777777', '', '', 0, 0],
        ];
        $styleXml = '';
        foreach ($styles as $id => [$size, $color, $emphasis, $align, $before, $after]) {
            $p = ($id === 'Section' ? '<w:keepNext/><w:tabs><w:tab w:val="right" w:leader="underscore" w:pos="10540"/></w:tabs>' : '')
                .'<w:spacing w:before="'.$before.'" w:after="'.$after.'" w:line="300" w:lineRule="auto"/>'
                .($align ? '<w:jc w:val="'.$align.'"/>' : '');
            $styleXml .= '<w:style w:type="paragraph" w:styleId="'.$id.'"><w:name w:val="'.$id.'"/><w:pPr>'.$p.'</w:pPr><w:rPr><w:rFonts w:ascii="Source Sans Pro" w:hAnsi="Source Sans Pro" w:cs="Arial"/>'.$emphasis.'<w:color w:val="'.$color.'"/><w:sz w:val="'.$size.'"/><w:szCs w:val="'.$size.'"/>'.'</w:rPr></w:style>';
        }
        $rels = fn (array $items) => self::XML.'<Relationships xmlns="'.self::PKG.'">'.implode('', array_map(fn ($id, $type, $target) => '<Relationship Id="'.$id.'" Type="'.self::REL.'/'.$type.'" Target="'.$target.'"/>', array_keys($items), array_column($items, 0), array_column($items, 1))).'</Relationships>';
        $footer = self::paragraph(self::run($date).'<w:r><w:tab/></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple>', 'Footer', '<w:tabs><w:tab w:val="right" w:pos="10540"/></w:tabs>');
        return [
            '[Content_Types].xml' => self::XML.'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'.implode('', array_map(fn ($part, $type) => '<Override PartName="/word/'.$part.'.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.'.$type.'+xml"/>', ['document','styles','numbering','footer1','fontTable'], ['document.main','styles','numbering','footer','fontTable'])).'</Types>',
            '_rels/.rels' => $rels(['rId1' => ['officeDocument', 'word/document.xml']]),
            'word/_rels/document.xml.rels' => $rels(['rId1' => ['styles', 'styles.xml'], 'rId2' => ['numbering', 'numbering.xml'], 'rId3' => ['footer', 'footer1.xml'], 'rId4' => ['fontTable', 'fontTable.xml']]),
            'word/document.xml' => self::XML.'<w:document xmlns:w="'.self::NS.'" xmlns:r="'.self::REL.'"><w:body>'.$body.'<w:sectPr><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="397" w:right="683" w:bottom="850" w:left="683" w:header="0" w:footer="425" w:gutter="0"/></w:sectPr></w:body></w:document>',
            'word/styles.xml' => self::XML.'<w:styles xmlns:w="'.self::NS.'"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Source Sans Pro" w:hAnsi="Source Sans Pro" w:cs="Arial"/><w:sz w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults>'.$styleXml.'</w:styles>',
            'word/fontTable.xml' => self::XML.'<w:fonts xmlns:w="'.self::NS.'"><w:font w:name="Source Sans Pro"><w:altName w:val="Arial"/><w:panose1 w:val="020B0503030403020204"/><w:charset w:val="00"/><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font></w:fonts>',
            'word/numbering.xml' => self::XML.'<w:numbering xmlns:w="'.self::NS.'"><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="240"/></w:tabs><w:ind w:left="240" w:hanging="150"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num></w:numbering>',
            'word/footer1.xml' => self::XML.'<w:ftr xmlns:w="'.self::NS.'">'.$footer.'</w:ftr>',
        ];
    }
}
