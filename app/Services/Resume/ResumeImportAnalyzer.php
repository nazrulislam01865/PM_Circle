<?php

namespace App\Services\Resume;

/**
 * Conservative offline extraction: propose only text actually present in the file.
 * Ambiguous data remains unselected; members must review every change.
 */
class ResumeImportAnalyzer
{
    public function analyze(string $text): array
    {
        $lines = array_values(array_filter(array_map('trim', preg_split('/\R/u', $text)), fn ($line) => $line !== ''));
        $fields = [];
        $section = null;
        $sections = ['skills' => [], 'experience' => [], 'education' => [], 'certifications' => []];

        foreach ($lines as $line) {
            $header = mb_strtolower(trim($line, " :\t-"));
            if (preg_match('/^(?:technical |key |core )?skills(?: & competencies| and tools)?$/i', $header)) {
                $section = 'skills';
                continue;
            }
            if (preg_match('/^(?:professional |work |employment )?experience(?: & projects| history)?$/i', $header)) {
                $section = 'experience';
                continue;
            }
            if (preg_match('/^education(?: & qualifications)?$/i', $header)) {
                $section = 'education';
                continue;
            }
            if (preg_match('/^(?:certifications?|credentials?|licenses?)(?: & awards)?$/i', $header)) {
                $section = 'certifications';
                continue;
            }
            if (preg_match('/^(summary|about me|profile|professional summary|projects|contact|references|languages|awards)$/i', $header)) {
                $section = null;
                continue;
            }
            if ($section !== null && count($sections[$section]) < 22) {
                $sections[$section][] = mb_substr($line, 0, 400);
            }
        }

        $first = $lines[0] ?? '';
        if (preg_match('/^[\p{L}][\p{L} .\x{2019}\'-]{2,79}$/u', $first) && count(explode(' ', $first)) <= 6 && ! preg_match('/(?:resume|curriculum|vitae|profile)/i', $first)) {
            $fields['name'] = $first;
        }

        foreach (array_slice($lines, 1, 6) as $line) {
            if (preg_match('/[@\d]|https?:|linkedin|^phone|^email/i', $line)) {
                continue;
            }
            if (mb_strlen($line) >= 7 && mb_strlen($line) <= 180 && ! preg_match('/^(summary|about|profile|skills)$/i', $line)) {
                $fields['headline'] = $line;
                $possibleRole = trim(preg_split('/[|–—]/u', $line)[0]);
                if (preg_match('/\b(manager|coordinator|director|analyst|engineer|consultant|designer|scrum master|product owner|lead)\b/i', $possibleRole)) {
                    $fields['role'] = mb_substr($possibleRole, 0, 80);
                }
                break;
            }
        }

        if (preg_match('/(?:\+?\d[\d\s().-]{8,}\d)/', $text, $match)) {
            $fields['phone'] = trim(mb_substr($match[0], 0, 32));
        }

        if ($sections['skills']) {
            $tokens = preg_split('/[,;•\n|]+/u', implode("\n", array_slice($sections['skills'], 0, 12)));
            $skills = array_values(array_unique(array_filter(array_map(fn ($v) => trim(preg_replace('/^[-*\s]+/', '', $v)), $tokens), fn ($v) => mb_strlen($v) >= 2 && mb_strlen($v) <= 50 && count(preg_split('/\s+/', $v)) <= 7)));
            if ($skills) {
                $fields['skills'] = array_slice($skills, 0, 30);
            }
        }

        if ($sections['experience']) {
            $entries = [];
            $experienceLines = array_slice($sections['experience'], 0, 18);
            foreach ($experienceLines as $index => $line) {
                $title = null;
                $organization = null;
                if (preg_match('/^(.{3,90}?)\s+(?:at|@|\|)\s+(.{2,90})$/iu', $line, $matches)) {
                    [$title, $organization] = [trim($matches[1]), trim($matches[2])];
                } elseif (preg_match('/\b(manager|director|coordinator|lead|consultant|analyst|engineer|scrum master|product owner)\b/i', $line)
                    && isset($experienceLines[$index + 1]) && ! preg_match('/\b(manager|director|coordinator|lead|consultant|analyst|engineer|present|20\d{2})\b/i', $experienceLines[$index + 1])
                    && mb_strlen($experienceLines[$index + 1]) <= 90) {
                    [$title, $organization] = [trim($line), trim($experienceLines[$index + 1])];
                }
                if ($title && $organization) {
                    $entries[] = ['job_title' => mb_substr($title, 0, 150), 'organization' => mb_substr($organization, 0, 150),
                        'start_date' => 'Not provided', 'employment_type' => 'Not specified', 'is_current' => false];
                }
            }
            if ($entries) {
                $fields['experiences'] = array_slice($entries, 0, 5);
            }
        }

        if (count($sections['education']) >= 2) {
            $fields['educations'] = [['degree' => mb_substr($sections['education'][0], 0, 180), 'institution' => mb_substr($sections['education'][1], 0, 180), 'year' => null]];
        } elseif (count($sections['education']) === 1 && preg_match('/^(.+?)\s+(?:at|—|–|\|)\s+(.+)$/u', $sections['education'][0], $match)) {
            $fields['educations'] = [['degree' => mb_substr($match[1], 0, 180), 'institution' => mb_substr($match[2], 0, 180), 'year' => null]];
        }

        if ($sections['certifications']) {
            $fields['certifications'] = array_slice(array_map(fn ($name) => ['name' => mb_substr(ltrim($name, '- •'), 0, 100), 'credential_number' => null], $sections['certifications']), 0, 8);
        }

        return [
            'fields' => $fields,
            'warnings' => count($fields) < 2 ? ['Only a few fields could be read. You can still edit your profile manually.'] : [],
        ];
    }
}
