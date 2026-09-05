<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use RuntimeException;

class ProjectExcelImporter
{
    /**
     * Expected header labels (row 1), case-insensitive.
     *
     * @var list<string>
     */
    private const HEADERS = [
        '#',
        'Code',
        'Project',
        'Type',
        'Year Approved',
        'Beneficiaries',
        'Collaborators',
        'Sector',
        'Province',
        'City',
        'District',
        'Status',
        'Project Cost',
        'Amount Due',
        'Refunded',
        'Refund Rate',
    ];

    /**
     * @return array{imported: int, updated: int, skipped: int}
     */
    public function import(string $absolutePath): array
    {
        if (! is_readable($absolutePath)) {
            throw new RuntimeException("Spreadsheet not readable: {$absolutePath}");
        }

        $spreadsheet = IOFactory::load($absolutePath);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, false);

        if ($rows === []) {
            throw new RuntimeException('Spreadsheet is empty.');
        }

        $header = array_map(
            fn (mixed $cell): string => trim((string) $cell),
            array_slice($rows[0], 0, count(self::HEADERS)),
        );

        $this->assertHeaders($header);

        $imported = 0;
        $updated = 0;
        $skipped = 0;

        DB::transaction(function () use ($rows, &$imported, &$updated, &$skipped): void {
            foreach (array_slice($rows, 1) as $row) {
                $payload = $this->mapRow($row);

                if ($payload === null) {
                    $skipped++;

                    continue;
                }

                if ($payload['code'] !== null) {
                    $existing = Project::query()->where('code', $payload['code'])->first();

                    if ($existing) {
                        $existing->fill($payload)->save();
                        $updated++;

                        continue;
                    }
                }

                Project::query()->create($payload);
                $imported++;
            }
        });

        return compact('imported', 'updated', 'skipped');
    }

    /**
     * @return array{imported: int, updated: int, skipped: int}
     */
    public function importUpload(UploadedFile $file): array
    {
        return $this->import($file->getRealPath() ?: $file->path());
    }

    /**
     * @param  list<string>  $header
     */
    private function assertHeaders(array $header): void
    {
        foreach (self::HEADERS as $i => $expected) {
            $actual = $header[$i] ?? '';

            if (strcasecmp($actual, $expected) !== 0) {
                throw new RuntimeException(
                    "Invalid spreadsheet header at column {$i}. Expected \"{$expected}\", got \"{$actual}\".",
                );
            }
        }
    }

    /**
     * @param  list<mixed>  $row
     * @return array<string, mixed>|null
     */
    private function mapRow(array $row): ?array
    {
        $code = $this->stringOrNull($row[1] ?? null);
        $name = $this->stringOrNull($row[2] ?? null);
        $type = $this->stringOrNull($row[3] ?? null);

        // Footer / junk rows in the source workbook.
        if ($name === null && $code === null) {
            return null;
        }

        if ($name === null) {
            return null;
        }

        if ($type !== null && (
            str_contains(strtolower($type), 'total amount')
            || is_numeric(str_replace([',', ' '], '', $type))
        )) {
            return null;
        }

        $province = $this->stringOrNull($row[8] ?? null);
        $validProvinces = [
            'Occidental Mindoro',
            'Oriental Mindoro',
            'Marinduque',
            'Romblon',
            'Palawan',
        ];

        if ($province !== null && ! in_array($province, $validProvinces, true)) {
            return null;
        }

        return [
            'row_number' => $this->intOrNull($row[0] ?? null),
            'code' => $code,
            'name' => $name,
            'type' => $type,
            'year_approved' => $this->intOrNull($row[4] ?? null),
            'beneficiary' => $this->stringOrNull($row[5] ?? null),
            'collaborators' => $this->stringOrNull($row[6] ?? null),
            'sector' => $this->stringOrNull($row[7] ?? null),
            'province' => $province,
            'city' => $this->stringOrNull($row[9] ?? null),
            'district' => $this->stringOrNull($row[10] ?? null),
            'status' => $this->stringOrNull($row[11] ?? null),
            'project_cost' => $this->moneyOrNull($row[12] ?? null),
            'amount_due' => $this->moneyOrNull($row[13] ?? null),
            'refunded' => $this->moneyOrNull($row[14] ?? null),
            'refund_rate' => $this->percentOrNull($row[15] ?? null),
        ];
    }

    private function stringOrNull(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $text = trim((string) $value);

        if ($text === '' || $text === '--' || $text === '—') {
            return null;
        }

        return $text;
    }

    private function intOrNull(mixed $value): ?int
    {
        $text = $this->stringOrNull($value);

        if ($text === null || ! is_numeric($text)) {
            return null;
        }

        return (int) $text;
    }

    private function moneyOrNull(mixed $value): ?float
    {
        $text = $this->stringOrNull($value);

        if ($text === null) {
            return null;
        }

        $normalized = str_replace([',', '₱', 'PHP', ' '], '', $text);

        if ($normalized === '' || ! is_numeric($normalized)) {
            return null;
        }

        return round((float) $normalized, 2);
    }

    private function percentOrNull(mixed $value): ?float
    {
        $text = $this->stringOrNull($value);

        if ($text === null) {
            return null;
        }

        $normalized = str_replace(['%', ' '], '', $text);

        if ($normalized === '' || $normalized === '--' || ! is_numeric($normalized)) {
            return null;
        }

        return round((float) $normalized, 2);
    }
}
