<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Professional resume — {{ $fields['name'] ?? 'Your name' }}</title>
    <style>
        /* Physical document typography mirrors the uploaded A4 template, independently of app controls. */
        {!! file_get_contents(resource_path('css/pm-design-tokens.css')) !!}
        :root { --cv-font: var(--pm-cv-font); --cv-ink: var(--pm-cv-ink); --cv-muted: var(--pm-cv-muted); --cv-secondary: var(--pm-cv-secondary); }
        @page { size: A4; margin: 7mm 12mm 15mm; @bottom-left { content: '{{ now()->format("M, Y") }}'; font-size: 8pt; color: #777777; } @bottom-right { content: counter(page); font-size: 8pt; color: #777777; } }
        body { margin: 0; background: var(--canvas); color: var(--cv-ink); }
        .cv-toolbar { max-width: 210mm; margin: var(--s4) auto; padding-inline: var(--s3); box-sizing: border-box; }
        .cv-sheet { box-sizing: border-box; width: min(210mm, 100%); min-height: 297mm; margin: 0 auto var(--s4); padding: 7mm 12mm 15mm; background: var(--surface); font: 400 10pt/1.35 var(--cv-font); overflow-wrap: anywhere; }
        .cv-sheet, .cv-sheet * { box-sizing: border-box; }
        header { text-align: center; margin-bottom: 5mm; }
        h1 { font-size: 22pt; font-weight: normal; line-height: 1.15; margin: 0; }
        .headline { font-size: 12pt; font-weight: bold; font-style: italic; color: var(--cv-muted); }
        .location { font-style: italic; color: var(--cv-muted); }
        .contacts { font-size: 8pt; margin-top: 4mm; }
        .contacts { overflow-wrap: anywhere; }
        .contacts .contact-separator { padding-inline: 2mm; color: var(--cv-muted); }
        h2 { display: flex; align-items: baseline; gap: 2mm; font-size: 16pt; line-height: 1.25; margin: 4mm 0 2mm; break-after: avoid; }
        h2::after { content: ''; flex: 1; border-bottom: 1px solid var(--cv-ink); }
        .entry { margin: 2mm 0 1mm; break-after: avoid; }
        .entry strong { display: block; font-size: 12pt; }
        .entry em { display: block; font-size: 8pt; }
        .subtitle { color: var(--cv-secondary); }
        p { margin: 0; white-space: pre-wrap; }
        ul { margin: 0 0 1mm; padding-left: 4mm; }
        li { margin-bottom: .4mm; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        td { padding: .6mm 1mm .6mm 0; vertical-align: top; overflow-wrap: anywhere; }
        tr { break-inside: avoid; }
        .cv-label { width: 25%; font-weight: bold; }
        .cv-year { width: 12%; }.cv-issuer { width: 20%; text-align: right; }
        button { font: var(--pm-guide-weight-control) var(--text-ui)/var(--line-ui) var(--font-ui); min-height: var(--control-touch); color: var(--surface); background: var(--blue); border: 0; border-radius: var(--radius-control); padding: var(--s2) var(--s4); cursor: pointer; }
        @media print { .cv-toolbar { display: none; } body { margin: 0; background: white; } .cv-sheet { width: auto; min-height: 0; margin: 0; padding: 0; } }
    </style>
</head>
<body>
<div class="cv-toolbar"><button type="button" onclick="window.print()">Print / Save as PDF</button></div>
<main class="cv-sheet">
<header>
    <h1>{{ ($fields['name'] ?? '') ?: 'Your name' }}</h1>
    @if(($document['headline'] ?? '') ?: ($fields['role'] ?? ''))<div class="headline">{{ ($document['headline'] ?? '') ?: ($fields['role'] ?? '') }}</div>@endif
    @if(!empty($fields['location']))<div class="location">{{ $fields['location'] }}</div>@endif
    <div class="contacts">@foreach(array_filter([$document['phone'] ?? '', $fields['email'] ?? '', $document['portfolio'] ?? '', $document['github'] ?? '', $document['linkedin'] ?? ''], fn ($value) => trim((string) $value) !== '') as $contact)@unless($loop->first)<span class="contact-separator" aria-hidden="true"> | </span>@endunless<span>{{ $contact }}</span>@endforeach</div>
</header>
@if(!empty($fields['summary']))<h2>Personal Profile</h2><p>{{ $fields['summary'] }}</p>@endif
@foreach(\App\Domain\Identity\Services\ResumeExport::SECTIONS as $section => $title)
    @php($rows = \App\Domain\Identity\Services\ResumeExport::rows($document, $section))
    @if(count($rows))
        <h2>{{ $title }}</h2>
        @if(in_array($section, ['skills', 'interests', 'languages'], true))
            <table>@foreach($rows as $row)<tr><td class="cv-label">{{ $row['title'] ?? '' }}</td><td>{{ $row['description'] ?? '' }}</td></tr>@endforeach</table>
        @elseif($section === 'achievements')
            <table>@foreach($rows as $row)<tr><td class="cv-year">{{ $row['period'] ?? '' }}</td><td>{{ $row['title'] ?? '' }}</td><td class="cv-issuer">{{ $row['subtitle'] ?? '' }}</td></tr>@endforeach</table>
        @else
            @foreach($rows as $row)
                @php($details = \App\Domain\Identity\Services\ResumeExport::details($row))
                <div class="entry" @if(!$details) style="break-after:auto" @endif><strong>{{ $row['title'] ?? '' }}</strong>@if(!empty($row['location']))<em>{{ $row['location'] }}</em>@endif @if(!empty($row['subtitle']))<div class="subtitle">{{ $row['subtitle'] }}</div>@endif @if(!empty($row['period']))<em>{{ $row['period'] }}</em>@endif</div>
                @if($details)
                <ul>@foreach($details as [$label, $line])<li>@if($label)<strong>{{ $label }}:</strong> @endif{{ $line }}</li>@endforeach</ul>
                @endif
            @endforeach
        @endif
    @endif
@endforeach
</main>
</body>
</html>
