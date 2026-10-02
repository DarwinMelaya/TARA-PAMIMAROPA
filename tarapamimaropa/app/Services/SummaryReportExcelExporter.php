<?php

namespace App\Services;

use App\Models\Project;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Chart\Chart;
use PhpOffice\PhpSpreadsheet\Chart\DataSeries;
use PhpOffice\PhpSpreadsheet\Chart\DataSeriesValues;
use PhpOffice\PhpSpreadsheet\Chart\Layout;
use PhpOffice\PhpSpreadsheet\Chart\Legend;
use PhpOffice\PhpSpreadsheet\Chart\PlotArea;
use PhpOffice\PhpSpreadsheet\Chart\Title;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Builds the Summary graphs report workbook with native (editable) Excel charts.
 */
class SummaryReportExcelExporter
{
    /** @var list<string> */
    public const CHART_TYPES = ['bar', 'column', 'donut'];

    private const REPORT_SHEET = 'Report';

    private const INK = '0F172A';

    private const MUTED = '64748B';

    private const LINE = 'E2E8F0';

    private const SOFT = 'F8FAFC';

    private const PESO_FORMAT = '"₱"#,##0.00';

    private const NUMBER_FORMAT = '#,##0';

    /** Rows reserved per section so charts never overlap. */
    private const CHART_ROWS = 18;

    /**
     * @param  array{
     *     title: string,
     *     scope_label: string,
     *     stats: list<array{label: string, value: string}>,
     *     sections: list<array{title: string, chart: string, format: string, rows: list<array{label: string, value: int|float|string, color?: string|null}>}>,
     *     project_ids?: list<int>|null
     * }  $report
     */
    public function download(array $report): StreamedResponse
    {
        $spreadsheet = $this->build($report);
        $filename = sprintf(
            'tara-summary-report-%s.xlsx',
            now()->format('Y-m-d-His'),
        );

        return response()->streamDownload(function () use ($spreadsheet): void {
            $writer = new Xlsx($spreadsheet);
            $writer->setIncludeCharts(true);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @param  array<string, mixed>  $report
     */
    public function build(array $report): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator('TARA PAMIMAROPA')
            ->setTitle($report['title'])
            ->setSubject($report['scope_label']);

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(self::REPORT_SHEET);
        $sheet->setShowGridlines(false);
        $sheet->getColumnDimension('A')->setWidth(36);
        $sheet->getColumnDimension('B')->setWidth(18);
        $sheet->getColumnDimension('C')->setWidth(10);
        $sheet->getColumnDimension('D')->setWidth(3);

        $row = $this->writeHeader($sheet, $report);
        $row = $this->writeStats($sheet, $report['stats'], $row);

        foreach ($report['sections'] as $index => $section) {
            $row = $this->writeSection($sheet, $section, $index, $row);
        }

        $projectIds = $report['project_ids'] ?? null;
        if (is_array($projectIds) && $projectIds !== []) {
            $this->writeProjects($spreadsheet->createSheet(), $projectIds);
        }

        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    /**
     * @param  array<string, mixed>  $report
     */
    private function writeHeader(Worksheet $sheet, array $report): int
    {
        $sheet->setCellValue('A1', $report['title']);
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(18)->getColor()->setRGB(self::INK);
        $sheet->getRowDimension(1)->setRowHeight(28);

        $sheet->setCellValue('A2', 'TARA PAMIMAROPA · DOST-MIMAROPA');
        $sheet->setCellValue('A3', 'Scope: '.$report['scope_label']);
        $sheet->setCellValue('A4', 'Generated: '.now()->format('F j, Y g:i A'));
        $sheet->getStyle('A2:A4')->getFont()->setSize(10)->getColor()->setRGB(self::MUTED);

        $sheet->getStyle('A5:L5')->getBorders()->getBottom()
            ->setBorderStyle(Border::BORDER_MEDIUM)->getColor()->setRGB(self::INK);

        return 7;
    }

    /**
     * @param  list<array{label: string, value: string}>  $stats
     */
    private function writeStats(Worksheet $sheet, array $stats, int $row): int
    {
        if ($stats === []) {
            return $row;
        }

        $this->writeSectionTitle($sheet, 'Key figures', $row);
        $row++;

        foreach ($stats as $stat) {
            $sheet->setCellValue("A{$row}", $stat['label']);
            $sheet->setCellValueExplicit("B{$row}", $stat['value'], DataType::TYPE_STRING);
            $sheet->getStyle("B{$row}")->getFont()->setBold(true);
            $sheet->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            $sheet->getStyle("A{$row}:B{$row}")->getBorders()->getBottom()
                ->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB(self::LINE);
            $row++;
        }

        return $row + 2;
    }

    /**
     * @param  array{title: string, chart: string, format: string, rows: list<array{label: string, value: int|float|string, color?: string|null}>}  $section
     */
    private function writeSection(Worksheet $sheet, array $section, int $index, int $start): int
    {
        $rows = array_values($section['rows']);
        $count = count($rows);
        $isPeso = $section['format'] === 'peso';
        $total = array_sum(array_map(fn (array $r) => (float) $r['value'], $rows)) ?: 1;

        $this->writeSectionTitle($sheet, $section['title'], $start);

        $head = $start + 1;
        $sheet->fromArray(['Label', $isPeso ? 'Amount' : 'Count', 'Share'], null, "A{$head}");
        $sheet->getStyle("A{$head}:C{$head}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::INK]],
        ]);

        $first = $head + 1;
        foreach ($rows as $i => $item) {
            $r = $first + $i;
            $value = (float) $item['value'];
            $sheet->setCellValue("A{$r}", $item['label']);
            $sheet->setCellValue("B{$r}", $value);
            $sheet->setCellValue("C{$r}", $value / $total);
            if ($i % 2 === 1) {
                $sheet->getStyle("A{$r}:C{$r}")->getFill()
                    ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::SOFT);
            }
        }

        $last = $first + $count - 1;
        $sheet->getStyle("B{$first}:B{$last}")->getNumberFormat()
            ->setFormatCode($isPeso ? self::PESO_FORMAT : self::NUMBER_FORMAT);
        $sheet->getStyle("C{$first}:C{$last}")->getNumberFormat()->setFormatCode('0.0%');

        $totalRow = $last + 1;
        $sheet->setCellValue("A{$totalRow}", 'Total');
        $sheet->setCellValue("B{$totalRow}", "=SUM(B{$first}:B{$last})");
        $sheet->getStyle("B{$totalRow}")->getNumberFormat()
            ->setFormatCode($isPeso ? self::PESO_FORMAT : self::NUMBER_FORMAT);
        $sheet->getStyle("A{$totalRow}:C{$totalRow}")->getFont()->setBold(true);
        $sheet->getStyle("A{$totalRow}:C{$totalRow}")->getBorders()->getTop()
            ->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB(self::INK);

        $sheet->addChart($this->chart($section, $index, $first, $last, $start));

        return $start + max($count + 5, self::CHART_ROWS + 2);
    }

    /**
     * @param  array{title: string, chart: string, format: string, rows: list<array{label: string, value: int|float|string, color?: string|null}>}  $section
     */
    private function chart(array $section, int $index, int $first, int $last, int $start): Chart
    {
        $ref = "'".self::REPORT_SHEET."'";
        $count = $last - $first + 1;
        $isDonut = $section['chart'] === 'donut';

        $categories = new DataSeriesValues(
            DataSeriesValues::DATASERIES_TYPE_STRING,
            "{$ref}!\$A\${$first}:\$A\${$last}",
            null,
            $count,
        );

        $values = new DataSeriesValues(
            DataSeriesValues::DATASERIES_TYPE_NUMBER,
            "{$ref}!\$B\${$first}:\$B\${$last}",
            null,
            $count,
            array_map(fn (array $r) => (float) $r['value'], $section['rows']),
        );

        $colors = array_map(
            fn (array $r) => ltrim((string) ($r['color'] ?? '334155'), '#'),
            $section['rows'],
        );
        $values->setFillColor($isDonut ? $colors : array_fill(0, $count, '334155'));

        $series = new DataSeries(
            $isDonut ? DataSeries::TYPE_DOUGHNUTCHART : DataSeries::TYPE_BARCHART,
            $isDonut ? null : DataSeries::GROUPING_CLUSTERED,
            [0],
            [],
            [$categories],
            [$values],
        );

        if (! $isDonut) {
            $series->setPlotDirection(
                $section['chart'] === 'column' ? DataSeries::DIRECTION_COL : DataSeries::DIRECTION_BAR,
            );
        }

        $layout = new Layout;
        if ($isDonut) {
            $layout->setShowPercent(true);
        } else {
            $layout->setShowVal(true);
        }

        $chart = new Chart(
            'chart'.($index + 1),
            new Title($section['title']),
            $isDonut ? new Legend(Legend::POSITION_RIGHT, null, false) : null,
            new PlotArea($layout, [$series]),
        );

        $chart->setTopLeftPosition("E{$start}");
        $chart->setBottomRightPosition('M'.($start + self::CHART_ROWS));

        return $chart;
    }

    private function writeSectionTitle(Worksheet $sheet, string $title, int $row): void
    {
        $sheet->setCellValue("A{$row}", $title);
        $sheet->getStyle("A{$row}")->getFont()->setBold(true)->setSize(12)->getColor()->setRGB(self::INK);
    }

    /**
     * @param  list<int>  $projectIds
     */
    private function writeProjects(Worksheet $sheet, array $projectIds): void
    {
        $sheet->setTitle('Projects');

        $headers = [
            'Code', 'Project name', 'Type', 'Sector', 'Province', 'Municipality',
            'Barangay', 'Status', 'Year approved', 'Project cost', 'Beneficiary',
        ];
        $widths = [24, 48, 18, 22, 20, 20, 20, 14, 14, 18, 36];

        $sheet->fromArray($headers, null, 'A1');
        foreach ($widths as $i => $width) {
            $sheet->getColumnDimensionByColumn($i + 1)->setWidth($width);
        }
        $sheet->getStyle('A1:K1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::INK]],
        ]);

        $row = 2;
        foreach (array_chunk(array_values(array_unique($projectIds)), 500) as $chunk) {
            $projects = Project::query()
                ->whereIn('id', $chunk)
                ->orderBy('province')
                ->orderBy('city')
                ->orderBy('name')
                ->get();

            foreach ($projects as $project) {
                $sheet->fromArray([
                    $project->code,
                    $project->name,
                    $project->type,
                    $project->sector,
                    $project->province,
                    $project->city,
                    $project->barangay,
                    $project->status,
                    $project->year_approved,
                    $project->project_cost !== null ? (float) $project->project_cost : null,
                    $project->beneficiary,
                ], null, "A{$row}", true);
                $row++;
            }
        }

        $last = max(2, $row - 1);
        $sheet->getStyle("J2:J{$last}")->getNumberFormat()->setFormatCode(self::PESO_FORMAT);
        $sheet->setAutoFilter("A1:K{$last}");
        $sheet->freezePane('A2');
    }
}
