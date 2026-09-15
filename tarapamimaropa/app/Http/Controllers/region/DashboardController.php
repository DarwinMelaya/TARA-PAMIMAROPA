<?php

namespace App\Http\Controllers\Region;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $payload = Project::dashboardInertiaPayload();
        $payload['projectStream']['url'] = route('projects.dashboard-stream');

        return Inertia::render('region/RegionDashboard', $payload);
    }
}
