<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-appearance="{{ $appearance ?? 'system' }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- Resolve the same saved browser mode before CSS or React renders. --}}
        <script>
            (function () {
                const root = document.documentElement;
                const valid = value => ['light', 'dark', 'system'].includes(value);
                let mode = valid(root.dataset.appearance) ? root.dataset.appearance : 'system';
                try {
                    const stored = localStorage.getItem('appearance');
                    if (valid(stored)) mode = stored;
                } catch { /* Cookie remains the fallback. */ }
                root.dataset.appearance = mode;
                root.classList.toggle('dark', mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
            })();
        </script>
        <style>
            html { background-color: #f4f8fc; color-scheme: light; }
            @media screen { html.dark { background-color: #111e30; color-scheme: dark; } }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        {{-- The public homepage reference uses Inter-like metrics; central UI tokens select the typeface. --}}
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
