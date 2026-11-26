<?php

namespace App\Http\Controllers\PublicSite;

use App\Http\Controllers\Controller;
use App\Support\Legal\LegalPages;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LegalPageController extends Controller
{
    public function terms(Request $request): Response
    {
        return $this->show($request, 'terms', 'public/Terms');
    }

    public function privacy(Request $request): Response
    {
        return $this->show($request, 'privacy', 'public/Privacy');
    }

    private function show(Request $request, string $document, string $component): Response
    {
        $version = $request->query('version');
        abort_if($version !== null && ! is_string($version), 404);

        return Inertia::render($component, ['legalPage' => LegalPages::publicDocument($document, $version)]);
    }
}
