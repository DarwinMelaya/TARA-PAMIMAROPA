<?php

namespace App\Http\Controllers\Psto;

use App\Http\Controllers\Controller;
use App\Http\Requests\Psto\ImportProjectsRequest;
use App\Models\Project;
use App\Services\ProjectExcelImporter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;

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

    public function import(
        ImportProjectsRequest $request,
        ProjectExcelImporter $importer,
    ): RedirectResponse {
        $province = $request->user()->province->value;

        try {
            $result = $importer->importUpload($request->file('file'), $province);
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

        return to_route('psto.programs');
    }
}
