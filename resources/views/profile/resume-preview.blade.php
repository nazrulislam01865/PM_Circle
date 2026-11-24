<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Resume preview — {{ $documentName }}</title>
<style>
{!! file_get_contents(resource_path('css/pm-design-tokens.css')) !!}
body { font: var(--regular) var(--text-body)/var(--line-body) var(--font-ui); color: var(--pm-guide-body-color); background: var(--pm-guide-soft); margin: 0; padding: var(--s8); }
main { max-width: var(--pm-guide-reading-width); margin: auto; border: 1px solid var(--pm-guide-line); border-radius: var(--pm-guide-radius-card); background: var(--pm-guide-white); padding: var(--s6); min-width: 0; }
h1 { font-size: var(--pm-guide-text-h1); line-height: var(--line-h1); color: var(--pm-guide-ink); overflow-wrap: anywhere; }
pre { font: inherit; white-space: pre-wrap; overflow-wrap: anywhere; }
@media (max-width: 540px) { body { padding: var(--s4); } main { padding: var(--s3); } }
</style></head>
<body><main><h1>{{ $documentName }}</h1><p>Text-only preview of your private uploaded document.</p><pre>{{ $text }}</pre></main></body>
</html>
