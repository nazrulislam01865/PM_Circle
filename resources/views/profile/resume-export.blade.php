<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Professional resume — {{ $member->name }}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #172b4d; margin: 38px auto; padding: 0 28px; max-width: 850px; line-height: 1.5; }
        h1 { margin-bottom: 4px; } h2 { border-bottom: 1px solid #dce3ec; padding-bottom: 5px; margin-top: 24px; font-size: 18px; }
        .subtitle { color: #52657d; margin-top: 0; } .record { margin: 0 0 14px; } .record strong { display: block; }
        button { background: #0a66c2; color: white; border: 0; border-radius: 8px; padding: 12px 18px; cursor: pointer; }
        @media print { button { display: none; } body { padding: 0; margin: 0; } }
    </style>
</head>
<body>
@if($format === 'pdf')<button type="button" onclick="window.print()">Print / Save as PDF</button>@endif
<h1>{{ $member->name }}</h1>
<p class="subtitle">{{ $member->profile?->headline }} @if($member->profile?->city) · {{ $member->profile->city }} @endif</p>
@if($member->profile?->about)<h2>Profile</h2><p>{{ $member->profile->about }}</p>@endif
@if($member->profile?->skills)<h2>Skills</h2><p>{{ implode(' · ', $member->profile->skills) }}</p>@endif
@if($member->experiences->isNotEmpty())<h2>Experience</h2>
@foreach($member->experiences as $entry)
<div class="record"><strong>{{ $entry->job_title }} — {{ $entry->organization }}</strong>
<span>{{ $entry->start_date }} – {{ $entry->is_current ? 'Present' : $entry->end_date }}</span>
@if($entry->responsibilities)<p>{{ $entry->responsibilities }}</p>@endif
</div>@endforeach
@endif
@if($member->educations->isNotEmpty())<h2>Education</h2>
@foreach($member->educations as $entry)<div class="record"><strong>{{ $entry->degree }}</strong>{{ $entry->institution }} {{ $entry->year }}</div>@endforeach
@endif
@if($member->certifications->isNotEmpty())<h2>Certifications (self-reported)</h2>
@foreach($member->certifications as $entry)<div class="record">{{ $entry->name }} @if($entry->credential_number)· {{ $entry->credential_number }}@endif</div>@endforeach
@endif
</body></html>
