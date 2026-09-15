<?php

namespace App\Http\Controllers\Psto;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $province = $request->user()?->province?->value;

        if (! filled($province)) {
            return Inertia::render('psto/PstoDashboard', [
                'projects' => [],
                'projectStream' => null,
                'lockedProvince' => null,
            ]);
        }

        $payload = Project::dashboardInertiaPayload($province);
        $payload['projectStream']['url'] = route('projects.dashboard-stream');
        $payload['lockedProvince'] = $province;

        return Inertia::render('psto/PstoDashboard', $payload);
    }
}
