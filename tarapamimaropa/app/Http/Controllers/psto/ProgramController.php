<?php

namespace App\Http\Controllers\Psto;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProgramController extends Controller
{
    public function index(Request $request): Response
    {
        $province = $request->user()?->province?->value;

        return Inertia::render('psto/PstoPrograms', [
            'projects' => filled($province)
                ? Project::taraCollection($province)
                : collect(),
            'lockedProvince' => $province,
            'nextCodeSequence' => Project::nextCodeSequence(),
        ]);
    }
}
