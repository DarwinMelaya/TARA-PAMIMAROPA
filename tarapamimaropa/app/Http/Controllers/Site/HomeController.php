<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(): Response
    {
        $payload = Project::dashboardInertiaPayload();
        $payload['projectStream']['url'] = route('projects.dashboard-stream');

        return Inertia::render('public/LandingPage', $payload);
    }
}
