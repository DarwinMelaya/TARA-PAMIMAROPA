<?php

namespace App\Http\Controllers\Psto;

use App\Http\Controllers\Controller;
use App\Http\Requests\Psto\StoreProjectRequest;
use App\Http\Requests\Psto\UpdateProjectRequest;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;

class ProjectController extends Controller
{
    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $province = $request->user()->province->value;

        unset($data['code'], $data['province'], $data['images']);

        $images = array_map(
            fn (UploadedFile $file) => $file->store('projects', 'public'),
            $request->file('images', []),
        );

        Project::query()->create([
            ...$data,
            'images' => $images ?: null,
            'province' => $province,
            'code' => Project::generateCode(
                $province,
                isset($data['year_approved']) ? (int) $data['year_approved'] : null,
                $data['district'] ?? null,
            ),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Project created successfully.'),
        ]);

        return to_route('psto.programs');
    }

    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        $data = $request->validated();
        $province = $request->user()->province->value;

        $project->fill([
            ...$data,
            'province' => $province,
        ])->save();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Project updated successfully.'),
        ]);

        return to_route('psto.programs');
    }
}
