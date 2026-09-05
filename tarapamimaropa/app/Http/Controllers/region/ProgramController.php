<?php

namespace App\Http\Controllers\Region;

use App\Http\Controllers\Controller;
use App\Http\Requests\Region\ImportProjectsRequest;
use App\Models\Project;
use App\Services\ProjectExcelImporter;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;

class ProgramController extends Controller
{
    public function index(): Response
    {
        $projects = Project::query()
            ->orderBy('province')
            ->orderBy('name')
            ->get()
            ->map(fn (Project $project): array => $project->toTaraArray())
            ->values();

        return Inertia::render('region/RegionPrograms', [
            'projects' => $projects,
        ]);
    }

    public function import(
        ImportProjectsRequest $request,
        ProjectExcelImporter $importer,
    ): RedirectResponse {
        try {
            $result = $importer->importUpload($request->file('file'));
        } catch (RuntimeException $e) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => $e->getMessage(),
            ]);

            return back();
        } catch (Throwable $e) {
            report($e);

            Inertia::flash('toast', [
                'type' => 'error',
                'message' => __('Could not import spreadsheet. Check the file format.'),
            ]);

            return back();
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __(
                'Import done: :imported new, :updated updated, :skipped skipped.',
                $result,
            ),
        ]);

        return to_route('region.programs');
    }
}
