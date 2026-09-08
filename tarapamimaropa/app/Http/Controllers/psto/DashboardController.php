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

        return Inertia::render('psto/PstoDashboard', [
            'projects' => filled($province)
                ? Project::dashboardCollection($province)
                : collect(),
            'lockedProvince' => $province,
        ]);
    }
}
