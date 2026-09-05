<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProjectExcelExporter
{
    /** @var list<string> */
    public const STATUSES = [
        'On-going',
        'Graduated',
        'Terminated',
        'Withdrawn',
        'New',
        'Delayed',
        'On-hold',
    ];

    /** @var list<string> */
    public const TYPES = [
        'SETUP',
        'Roll-out',
        'TAPI-assisted',
        'GIA (Community Based)',
        'GIA (Region-initiated Projects) Internally Funded',
        'GIA (Region-initiated Projects) Externally Funded',
        'CEST',
    ];

    /** @var list<string> */
    public const SECTORS = [
        'Industry',
        'Water',
        'Education',
        'Environment',
        'Energy',
        'DRRM',
        'Agriculture',
        'Tourism',
        'Fisheries',
    ];

    /** @var list<string> */
    public const PROVINCES = [
        'Occidental Mindoro',
        'Oriental Mindoro',
        'Marinduque',
        'Romblon',
        'Palawan',
    ];

    private const HEADER_ROW = 5;

    private const DATA_START = 6;

    private const TEMPLATE_ROWS = 80;

    /**
     * @param  Collection<int, Project>|iterable<int, Project>  $projects
     */
    public function downloadData(iterable $projects, string $province): StreamedResponse
    {
        $spreadsheet = $this->buildWorkbook(
            province: $province,
            title: 'Project Export',
            subtitle: "Live project list · {$province}",
            projects: $projects,
            blankRows: 0,
            forTemplate: false,
        );

        $slug = strtolower(str_replace(' ', '-', $province));
        $filename = sprintf('tara-%s-projects-%s.xlsx', $slug, now()->format('Y-m-d'));

        return $this->stream($spreadsheet, $filename);
    }

    /**
     * Blank import template. Pass a province to lock PSTO scope, or null for MIMAROPA (region).
     */
    public function downloadTemplate(?string $province = null): StreamedResponse
    {
        $isRegion = $province === null;
        $scopeLabel = $isRegion ? 'MIMAROPA (all provinces)' : $province;
        $audience = $isRegion ? 'Region Programs' : 'PSTO Programs';

        $spreadsheet = $this->buildWorkbook(
            province: $province,
            title: 'Project Import Template',
            subtitle: "Fill rows below, then Import Excel on {$audience} · {$scopeLabel}",
            projects: [],
            blankRows: self::TEMPLATE_ROWS,
            forTemplate: true,
        );

        $filename = $isRegion
            ? 'tara-mimaropa-import-template.xlsx'
            : sprintf(
                'tara-%s-import-template.xlsx',
                strtolower(str_replace(' ', '-', $province)),
            );

        return $this->stream($spreadsheet, $filename);
    }

    /**
     * @param  Collection<int, Project>|iterable<int, Project>|array<int, Project>  $projects
     */
    private function buildWorkbook(
        ?string $province,
        string $title,
        string $subtitle,
        iterable $projects,
        int $blankRows,
        bool $forTemplate,
    ): Spreadsheet {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Projects');

        $this->writeBrandBanner($sheet, $title, $subtitle, $province);
        $this->writeHeaders($sheet);
        $lastDataRow = $this->writeDataRows($sheet, $projects, $province, $blankRows, $forTemplate);
        $this->styleSheet($sheet, $lastDataRow);
        $this->addListsSheet($spreadsheet, $province);
        $this->applyDropdowns($sheet, $lastDataRow, $province);
        $this->addInstructionsSheet($spreadsheet, $province, $forTemplate);

        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    private function writeBrandBanner(
        Worksheet $sheet,
        string $title,
        string $subtitle,
        ?string $province,
    ): void {
        $sheet->mergeCells('A1:P1');
        $sheet->mergeCells('A2:P2');
        $sheet->mergeCells('A3:P3');
        $sheet->mergeCells('A4:P4');

        $scope = $province ?? 'MIMAROPA (all provinces)';

        $sheet->setCellValue('A1', 'DOST-MIMAROPA · TARA PAMIMAROPA');
        $sheet->setCellValue('A2', $title);
        $sheet->setCellValue('A3', $subtitle);
        $sheet->setCellValue(
            'A4',
            sprintf(
                'Generated %s · Scope: %s · Columns match Import Excel',
                now()->timezone(config('app.timezone'))->format('Y-m-d H:i'),
                $scope,
            ),
        );

        $sheet->getStyle('A1')->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 11,
                'color' => ['rgb' => 'DBEAFE'],
                'name' => 'Calibri',
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '0F172A'],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
                'horizontal' => Alignment::HORIZONTAL_LEFT,
            ],
        ]);

        $sheet->getStyle('A2')->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 18,
                'color' => ['rgb' => 'FFFFFF'],
                'name' => 'Calibri',
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1D4ED8'],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
                'horizontal' => Alignment::HORIZONTAL_LEFT,
            ],
        ]);

        $sheet->getStyle('A3')->applyFromArray([
            'font' => [
                'size' => 11,
                'color' => ['rgb' => 'E2E8F0'],
                'name' => 'Calibri',
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E3A8A'],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        $sheet->getStyle('A4')->applyFromArray([
            'font' => [
                'size' => 9,
                'italic' => true,
                'color' => ['rgb' => '64748B'],
                'name' => 'Calibri',
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'F8FAFC'],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        $sheet->getRowDimension(1)->setRowHeight(22);
        $sheet->getRowDimension(2)->setRowHeight(30);
        $sheet->getRowDimension(3)->setRowHeight(20);
        $sheet->getRowDimension(4)->setRowHeight(18);
    }

    private function writeHeaders(Worksheet $sheet): void
    {
        foreach (ProjectExcelImporter::HEADERS as $index => $label) {
            $sheet->setCellValue([$index + 1, self::HEADER_ROW], $label);
        }

        $sheet->getStyle('A'.self::HEADER_ROW.':P'.self::HEADER_ROW)->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 10,
                'color' => ['rgb' => 'FFFFFF'],
                'name' => 'Calibri',
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '0F172A'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '334155'],
                ],
            ],
        ]);

        $sheet->getRowDimension(self::HEADER_ROW)->setRowHeight(28);
    }

    /**
     * @param  Collection<int, Project>|iterable<int, Project>|array<int, Project>  $projects
     */
    private function writeDataRows(
        Worksheet $sheet,
        iterable $projects,
        ?string $province,
        int $blankRows,
        bool $forTemplate,
    ): int {
        $row = self::DATA_START;

        foreach ($projects as $project) {
            $this->writeProjectRow($sheet, $row, $project);
            $row++;
        }

        $endBlank = $row + max(0, $blankRows) - 1;
        if ($blankRows > 0) {
            for ($r = $row; $r <= $endBlank; $r++) {
                if ($province !== null) {
                    $sheet->setCellValue([9, $r], $province);
                }
            }
            $row = $endBlank + 1;
        }

        return max(self::DATA_START, $row - 1);
    }

    private function writeProjectRow(Worksheet $sheet, int $row, Project $project): void
    {
        $sheet->setCellValue([1, $row], $project->row_number);
        $sheet->setCellValue([2, $row], $project->code);
        $sheet->setCellValue([3, $row], $project->name);
        $sheet->setCellValue([4, $row], $project->type);
        $sheet->setCellValue([5, $row], $project->year_approved);
        $sheet->setCellValue([6, $row], $project->beneficiary);
        $sheet->setCellValue([7, $row], $project->collaborators);
        $sheet->setCellValue([8, $row], $project->sector);
        $sheet->setCellValue([9, $row], $project->province);
        $sheet->setCellValue([10, $row], $project->city);
        $sheet->setCellValue([11, $row], $project->district);
        $sheet->setCellValue([12, $row], $project->status);
        $sheet->setCellValue([13, $row], $project->project_cost !== null ? (float) $project->project_cost : null);
        $sheet->setCellValue([14, $row], $project->amount_due !== null ? (float) $project->amount_due : null);
        $sheet->setCellValue([15, $row], $project->refunded !== null ? (float) $project->refunded : null);
        $sheet->setCellValue([16, $row], $project->refund_rate !== null ? (float) $project->refund_rate : null);
    }

    private function styleSheet(Worksheet $sheet, int $lastDataRow): void
    {
        $widths = [
            'A' => 8,
            'B' => 22,
            'C' => 36,
            'D' => 28,
            'E' => 12,
            'F' => 28,
            'G' => 24,
            'H' => 16,
            'I' => 18,
            'J' => 16,
            'K' => 12,
            'L' => 14,
            'M' => 14,
            'N' => 14,
            'O' => 12,
            'P' => 12,
        ];

        foreach ($widths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        if ($lastDataRow >= self::DATA_START) {
            $range = 'A'.self::DATA_START.':P'.$lastDataRow;

            $sheet->getStyle($range)->applyFromArray([
                'font' => [
                    'size' => 10,
                    'name' => 'Calibri',
                    'color' => ['rgb' => '0F172A'],
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'CBD5E1'],
                    ],
                ],
                'alignment' => [
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);

            for ($r = self::DATA_START; $r <= $lastDataRow; $r++) {
                if (($r - self::DATA_START) % 2 === 1) {
                    $sheet->getStyle("A{$r}:P{$r}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()
                        ->setRGB('F1F5F9');
                }
            }

            $sheet->getStyle('M'.self::DATA_START.':O'.$lastDataRow)
                ->getNumberFormat()
                ->setFormatCode('#,##0.00');
            $sheet->getStyle('P'.self::DATA_START.':P'.$lastDataRow)
                ->getNumberFormat()
                ->setFormatCode(NumberFormat::FORMAT_NUMBER_00);
            $sheet->getStyle('B'.self::DATA_START.':B'.$lastDataRow)
                ->getFont()
                ->setName('Consolas');

            $sheet->setAutoFilter('A'.self::HEADER_ROW.':P'.$lastDataRow);
        }

        $sheet->freezePane('A'.self::DATA_START);
        $sheet->getStyle('L'.self::HEADER_ROW)->getFont()->setBold(true);
    }

    private function addListsSheet(Spreadsheet $spreadsheet, ?string $province): void
    {
        $lists = $spreadsheet->createSheet();
        $lists->setTitle('Lists');

        $lists->setCellValue('A1', 'Status');
        foreach (self::STATUSES as $i => $status) {
            $lists->setCellValue([1, $i + 2], $status);
        }

        $lists->setCellValue('B1', 'Type');
        foreach (self::TYPES as $i => $type) {
            $lists->setCellValue([2, $i + 2], $type);
        }

        $lists->setCellValue('C1', 'Sector');
        foreach (self::SECTORS as $i => $sector) {
            $lists->setCellValue([3, $i + 2], $sector);
        }

        $lists->setCellValue('D1', 'Province');
        $provinces = $province !== null ? [$province] : self::PROVINCES;
        foreach ($provinces as $i => $name) {
            $lists->setCellValue([4, $i + 2], $name);
        }

        $lists->getStyle('A1:D1')->getFont()->setBold(true);
        $lists->setSheetState(Worksheet::SHEETSTATE_HIDDEN);
    }

    private function applyDropdowns(Worksheet $sheet, int $lastDataRow, ?string $province): void
    {
        if ($lastDataRow < self::DATA_START) {
            return;
        }

        $statusEnd = count(self::STATUSES) + 1;
        $typeEnd = count(self::TYPES) + 1;
        $sectorEnd = count(self::SECTORS) + 1;
        $provinceEnd = ($province !== null ? 1 : count(self::PROVINCES)) + 1;

        $this->applyListValidation(
            $sheet,
            'L'.self::DATA_START.':L'.$lastDataRow,
            "Lists!\$A\$2:\$A\${$statusEnd}",
            'Select project status',
        );
        $this->applyListValidation(
            $sheet,
            'D'.self::DATA_START.':D'.$lastDataRow,
            "Lists!\$B\$2:\$B\${$typeEnd}",
            'Select project type',
        );
        $this->applyListValidation(
            $sheet,
            'H'.self::DATA_START.':H'.$lastDataRow,
            "Lists!\$C\$2:\$C\${$sectorEnd}",
            'Select sector',
        );
        $this->applyListValidation(
            $sheet,
            'I'.self::DATA_START.':I'.$lastDataRow,
            "Lists!\$D\$2:\$D\${$provinceEnd}",
            $province !== null
                ? 'Province is locked to your PSTO'
                : 'Select MIMAROPA province',
        );
    }

    private function applyListValidation(
        Worksheet $sheet,
        string $range,
        string $formula,
        string $prompt,
    ): void {
        $validation = new DataValidation;
        $validation->setType(DataValidation::TYPE_LIST);
        $validation->setErrorStyle(DataValidation::STYLE_STOP);
        $validation->setAllowBlank(true);
        $validation->setShowInputMessage(true);
        $validation->setShowErrorMessage(true);
        $validation->setShowDropDown(true);
        $validation->setFormula1($formula);
        $validation->setPromptTitle('Select value');
        $validation->setPrompt($prompt);
        $validation->setErrorTitle('Invalid value');
        $validation->setError('Please choose a value from the dropdown list.');
        $sheet->setDataValidation($range, $validation);
    }

    private function addInstructionsSheet(
        Spreadsheet $spreadsheet,
        ?string $province,
        bool $forTemplate,
    ): void {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Instructions');

        $isRegion = $province === null;
        $scopeLine = $isRegion
            ? 'Use the Province dropdown (all MIMAROPA provinces).'
            : "This workbook is for {$province} only. Other provinces are skipped on import.";
        $importLine = $isRegion
            ? '4. Save as .xlsx and use Import Excel on Region Programs.'
            : '4. Save as .xlsx and use Import Excel on PSTO Programs.';
        $requiredLine = $isRegion
            ? 'Project (name) and Province are required.'
            : 'Project (name) is required. Province is fixed to your PSTO.';

        $lines = [
            ['TARA PAMIMAROPA — Excel guide', true],
            ['', false],
            ['Province scope', true],
            [$scopeLine, false],
            ['', false],
            ['How to use', true],
            [$forTemplate
                ? '1. Fill the Projects sheet (Status, Type, Sector, and Province have dropdowns).'
                : '1. This file contains your current projects. Edit if needed, then re-import.', false],
            ['2. Keep the header row exactly as-is (row 5). Do not rename columns.', false],
            ['3. Leave Code blank to create a new project, or keep an existing Code to update it.', false],
            [$importLine, false],
            ['', false],
            ['Status dropdown values', true],
            [implode(' · ', self::STATUSES), false],
            ['', false],
            ['Required fields', true],
            [$requiredLine, false],
            ['', false],
            ['Money columns', true],
            ['Project Cost, Amount Due, Refunded — numbers only (no ₱ symbol needed).', false],
            ['Refund Rate — percent number (example: 12.5).', false],
        ];

        foreach ($lines as $i => [$text, $bold]) {
            $row = $i + 1;
            $sheet->setCellValue([1, $row], $text);
            if ($bold) {
                $sheet->getStyle("A{$row}")->getFont()->setBold(true)->setSize($row === 1 ? 14 : 11);
            } else {
                $sheet->getStyle("A{$row}")->getFont()->setSize(10);
            }
        }

        $sheet->getColumnDimension('A')->setWidth(100);
        $sheet->getStyle('A1')->getFont()->getColor()->setRGB('1D4ED8');
    }

    private function stream(Spreadsheet $spreadsheet, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($spreadsheet): void {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
