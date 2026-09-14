<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class HandleAppearance
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Map cookie → allowlisted literal only (never share raw cookie into Blade).
        // Default light until product wants system/dark-first again.
        $appearance = match ($request->cookie('appearance')) {
            'light' => 'light',
            'dark' => 'dark',
            'system' => 'system',
            default => 'light',
        };

        View::share('appearance', $appearance);

        return $next($request);
    }
}
