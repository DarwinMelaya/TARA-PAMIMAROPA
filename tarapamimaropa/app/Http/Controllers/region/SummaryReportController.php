<?php

namespace App\Http\Controllers\Region;

use App\Http\Controllers\Controller;
use App\Http\Requests\Region\ExportSummaryReportRequest;
use App\Services\SummaryReportExcelExporter;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SummaryReportController extends Controller
{
    public function __invoke(
        ExportSummaryReportRequest $request,
        SummaryReportExcelExporter $exporter,
    ): StreamedResponse {
        return $exporter->download($request->validated());
    }
}
