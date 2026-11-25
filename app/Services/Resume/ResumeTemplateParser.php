<?php

namespace App\Services\Resume;

use App\Domain\Identity\Services\ResumeDocument;

/** Local, conservative parser for the approved CV layout. Never invent missing values. */
final class ResumeTemplateParser
{
    private const HEADINGS = [
        'personal profile' => 'summary', 'professional summary' => 'summary', 'summary' => 'summary', 'about me' => 'summary',
        'education' => 'education', 'work experience' => 'experience', 'professional experience' => 'experience', 'experience' => 'experience',
        'research work' => 'research', 'research' => 'research', 'university projects' => 'projects', 'projects' => 'projects',
        'skills' => 'skills', 'technical skills' => 'skills', 'achievements' => 'achievements', 'awards' => 'achievements',
        'interests' => 'interests', 'languages' => 'languages', 'certifications' => 'certifications',
    ];

    public function parse(string $text): array
    {
        $groups = ['header' => []];
        $section = 'header';
        foreach (preg_split('/\R/u', $text) as $line) {
            $line = trim($line);
            if ($line === '' || preg_match('/^(?:[A-Z]{3,9},?\s+\d{4}\s+)?\d+$/u', $line)) continue;
            $heading = strtolower(trim($line, " :"));
            if (isset(self::HEADINGS[$heading])) {
                $section = self::HEADINGS[$heading];
                continue;
            }
            $groups[$section][] = $line;
        }
        $fields = [];
        $document = [];
        $warnings = [];
        $header = $groups['header'];
        if (isset($header[0]) && preg_match('/^[\p{L}][\p{L} .\x{2019}\x{27}-]{2,79}$/u', $header[0])) $fields['name'] = $header[0];
        if (isset($header[1]) && !preg_match('/@|https?:|\d{5}/i', $header[1]) && !preg_match('/^[\p{L} .-]+\s*,\s*[\p{L} .-]+$/u', $header[1])) {
            $document['headline'] = mb_substr($header[1], 0, 255);
            $fields['role'] = mb_substr(trim(explode('|', $header[1])[0]), 0, 80);
        }
        if (isset($header[2]) && preg_match('/^[\p{L} .-]+\s*,\s*[\p{L} .-]+$/u', $header[2])) $fields['location'] = mb_substr($header[2], 0, 241);
        $contact = implode("\n", $header);
        if (preg_match('/(?<!\d)\+?\d[\d ()-]{7,18}\d(?!\d)/', $contact, $match)) $document['phone'] = trim($match[0]);
        if (preg_match('/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i', $contact, $match)) $warnings[] = 'Email found in the document: '.$match[0].'. Your account email is not changed by import.';
        foreach (['github', 'linkedin'] as $site) {
            if (preg_match('~(?:https?://)?(?:www\.)?'.$site.'\.com/[^\s|]+~i', $contact, $match)) $document[$site] = mb_substr($match[0], 0, 255);
        }
        if (preg_match('~(?:portfolio|website)\s*:\s*(https?://[^\s|]+)~i', $contact, $match)) $document['portfolio'] = mb_substr($match[1], 0, 255);
        if (isset($groups['summary'])) $fields['summary'] = mb_substr(implode("\n", $groups['summary']), 0, 2000);
        foreach (ResumeDocument::SECTIONS as $key => $allowed) {
            if (!isset($groups[$key])) continue;
            $rows = match ($key) {
                'skills', 'interests', 'languages' => $this->labelRows($groups[$key], $key),
                'achievements' => $this->awards($groups[$key]),
                default => $this->entries($groups[$key], $key),
            };
            if (count($rows) > 20) $warnings[] = 'Only the first 20 '.$key.' entries can be imported. Review the source text for the remainder.';
            $document[$key] = array_map(function ($row) use ($allowed) {
                $row = array_intersect_key($row, array_flip($allowed));
                foreach ($row as $field => $value) {
                    $row[$field] = mb_substr(trim($value), 0, in_array($field, ['description', 'courses'], true) ? 4000 : 255);
                }
                return $row;
            }, array_slice($rows, 0, 20));
        }
        if (count($groups) === 1) $warnings[] = 'No recognized CV section headings were found. Use the source text to complete the template manually.';
        $warnings[] = 'Local extraction is format-dependent. Check dates, entry boundaries, links and any unmatched text before applying. Long fields may need manual shortening. No AI is used.';
        return ['fields' => $fields, 'document' => $document, 'warnings' => $warnings, 'source_text' => $text];
    }

    private function columns(string $line): array
    {
        return preg_split('/\s{2,}|\t+/u', trim($line), 2);
    }

    private function labelRows(array $lines, string $section): array
    {
        $rows = [];
        foreach ($lines as $line) {
            $parts = $this->columns($line);
            if (count($parts) === 1 && $section === 'skills' && preg_match('/^(Programming|Miscellaneous|Soft Skills|Research Skills|Technical Skills|Professional Skills)\s+(.+)$/iu', $line, $m)) $parts = [$m[1], $m[2]];
            if (count($parts) === 1 && preg_match('/^([^:]{1,60}):\s*(.+)$/u', $line, $m)) $parts = [$m[1], $m[2]];
            if (count($parts) === 2) $rows[] = ['title' => $parts[0], 'description' => $parts[1]];
            elseif ($section === 'languages' && preg_match('/^(.+?)\s+((?:native|professional|full|limited|elementary|fluent|basic|intermediate|advanced).*)$/i', $line, $m)) $rows[] = ['title' => $m[1], 'description' => $m[2]];
            elseif ($rows && $section !== 'languages') $rows[array_key_last($rows)]['description'] .= ' '.$line;
            else $rows[] = ['title' => $section === 'skills' ? 'Skills' : $line, 'description' => $section === 'skills' ? $line : ''];
        }
        return $rows;
    }

    private function awards(array $lines): array
    {
        $rows = [];
        foreach ($lines as $line) {
            if (preg_match('/^(\d{4})\s+(.+)$/u', $line, $m)) {
                $parts = preg_split('/\s{2,}|\t+/u', trim($m[2]));
                $rows[] = ['period' => $m[1], 'title' => $parts[0], 'subtitle' => $parts[1] ?? ''];
            } else $rows[] = ['title' => $line];
        }
        return $rows;
    }

    private function entries(array $lines, string $section): array
    {
        $rows = [];
        $row = [];
        $skipUntil = -1;
        foreach ($lines as $i => $line) {
            if ($i <= $skipUntil) continue;
            $parts = $this->columns($line);
            $next = $lines[$i+1] ?? '';
            $date = '/(?:\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?\b(?:19|20)\d{2}(?:[-\/]\d{2})?\s*[-\x{2010}-\x{2014}]\s*.+$/iu';
            // PDF exports may put title, location, subtitle and period on separate lines.
            $locationNext = preg_match('/^[\p{L} .-]+\s*,\s*[\p{L} .-]+$/u', $next);
            if ($locationNext && preg_match($date, $lines[$i+3] ?? '') && !preg_match('/^[•*\-]/u', $line)) {
                if ($row) $rows[] = $row;
                $row = ['title' => $line, 'location' => $next, 'subtitle' => $lines[$i+2], 'period' => $lines[$i+3]];
                $skipUntil = $i+3;
                continue;
            }
            $starts = !preg_match('/^[•*\-]/u', $line) && preg_match($date, $next) && !preg_match($date, $line) && !(preg_match($date, $next, $nextDate, PREG_OFFSET_CAPTURE) && $nextDate[0][1] === 0);
            if ($starts || !$row) {
                if ($row) $rows[] = $row;
                $row = ['title' => $parts[0], 'location' => $parts[1] ?? ''];
                continue;
            }
            if (!isset($row['period']) && !isset($row['subtitle']) && preg_match($date, $next, $nextDate, PREG_OFFSET_CAPTURE) && $nextDate[0][1] === 0) {
                $row['subtitle'] = $line;
                continue;
            }
            if (!isset($row['period']) && preg_match($date, $line, $m, PREG_OFFSET_CAPTURE)) {
                $row['period'] = $m[0][0];
                $subtitle = trim(substr($line, 0, $m[0][1]));
                if ($subtitle !== '') $row['subtitle'] = $subtitle;
                continue;
            }
            if (preg_match('/^[•*\s-]*(Courses|Technical Skills|Soft Skills|Team Members?)\s*:\s*(.*)$/iu', $line, $m)) {
                $field = match (strtolower($m[1])) {'courses'=>'courses','technical skills'=>'technical','soft skills'=>'soft',default=>'team'};
                $row[$field] = $m[2];
                continue;
            }
            $row['description'] = trim(($row['description'] ?? '')."\n".preg_replace('/^[•*]\s*/u', '', $line));
        }
        if ($row) $rows[] = $row;
        return $rows;
    }
}
