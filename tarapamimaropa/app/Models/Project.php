<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * @property int $id
 * @property int|null $row_number
 * @property string|null $code
 * @property string $name
 * @property string|null $type
 * @property int|null $year_approved
 * @property string|null $beneficiary
 * @property string|null $collaborators
 * @property string|null $sector
 * @property string|null $province
 * @property string|null $city
 * @property string|null $district
 * @property string|null $status
 * @property string|null $project_cost
 * @property string|null $amount_due
 * @property string|null $refunded
 * @property string|null $refund_rate
 */
#[Fillable([
    'row_number',
    'code',
    'name',
    'type',
    'year_approved',
    'beneficiary',
    'collaborators',
    'sector',
    'province',
    'city',
    'district',
    'status',
    'project_cost',
    'amount_due',
    'refunded',
    'refund_rate',
])]
class Project extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'row_number' => 'integer',
            'year_approved' => 'integer',
            'project_cost' => 'decimal:2',
            'amount_due' => 'decimal:2',
            'refunded' => 'decimal:2',
            'refund_rate' => 'decimal:2',
        ];
    }

    /**
     * Shape expected by Region Programs / ProgramsGraphs (TaraProject).
     *
     * @return array<string, mixed>
     */
    public function toTaraArray(): array
    {
        $year = $this->year_approved ?? (int) now()->format('Y');
        $status = self::mapStatus($this->status);
        $program = self::mapProgram($this->type);

        return [
            'id' => (string) ($this->code ?: 'project-'.$this->id),
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->buildDescription(),
            'beneficiary' => $this->beneficiary ?? '',
            'program' => $program,
            'type' => $this->type ?: $program,
            'sector' => $this->sector ?: 'Others',
            'province' => $this->province ?: 'Palawan',
            'municipality' => $this->city ?: '',
            'barangay' => '',
            'partner_agency' => $this->collaborators ?: 'DOST-MIMAROPA',
            'collaborators' => $this->collaborators,
            'district' => $this->district,
            'status' => $status,
            'status_label' => $this->status ?: 'Unknown',
            'row_number' => $this->row_number,
            'progress' => match ($status) {
                'completed' => 100,
                'cancelled' => 0,
                'ongoing' => 50,
                default => 10,
            },
            'budget' => (float) ($this->project_cost ?? 0),
            'funding_source' => $this->type ?: 'DOST',
            'beneficiaries' => 0,
            'start_date' => sprintf('%04d-01-01', $year),
            'end_date' => sprintf('%04d-12-31', $year + 1),
            'year_approved' => $year,
            'latest_accomplishment' => '',
            ...$this->approximateCoordinates(),
            'amount_due' => $this->amount_due !== null ? (float) $this->amount_due : null,
            'refunded' => $this->refunded !== null ? (float) $this->refunded : null,
            'refund_rate' => $this->refund_rate !== null ? (float) $this->refund_rate : null,
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public static function taraCollection(): Collection
    {
        return static::query()
            ->orderBy('province')
            ->orderBy('name')
            ->get()
            ->map(fn (self $project): array => $project->toTaraArray())
            ->values();
    }

    /**
     * Stable pseudo-random point inside each province bbox (no lat/lng in Excel).
     *
     * @return array{latitude: float, longitude: float}
     */
    private function approximateCoordinates(): array
    {
        // [latMin, latMax, lngMin, lngMax] — rough MIMAROPA land boxes
        $boxes = [
            'Occidental Mindoro' => [12.35, 13.52, 120.52, 121.22],
            'Oriental Mindoro' => [12.32, 13.52, 121.05, 121.55],
            'Marinduque' => [13.18, 13.58, 121.82, 122.18],
            'Romblon' => [12.15, 12.78, 121.85, 122.55],
            'Palawan' => [8.15, 11.45, 117.45, 119.55],
        ];

        [$latMin, $latMax, $lngMin, $lngMax] = $boxes[$this->province ?? '']
            ?? [12.0, 13.0, 120.5, 122.0];

        $seed = crc32((string) ($this->code ?: ('project-'.$this->id)));
        // Two independent [0,1) fractions from the seed
        $u = (($seed & 0xFFFF) % 10000) / 10000;
        $v = ((($seed >> 16) & 0xFFFF) % 10000) / 10000;

        return [
            'latitude' => round($latMin + $u * ($latMax - $latMin), 5),
            'longitude' => round($lngMin + $v * ($lngMax - $lngMin), 5),
        ];
    }

    /**
     * Slim payload for command-map / graphs / chat (less Inertia JSON).
     *
     * @return array<string, mixed>
     */
    public function toDashboardArray(): array
    {
        $full = $this->toTaraArray();

        return [
            'id' => $full['id'],
            'code' => $full['code'],
            'name' => $full['name'],
            'beneficiary' => $full['beneficiary'],
            'program' => $full['program'],
            'type' => $full['type'],
            'sector' => $full['sector'],
            'province' => $full['province'],
            'municipality' => $full['municipality'],
            'barangay' => $full['barangay'],
            'partner_agency' => $full['partner_agency'],
            'status' => $full['status'],
            'progress' => $full['progress'],
            'budget' => $full['budget'],
            'funding_source' => $full['funding_source'],
            'beneficiaries' => $full['beneficiaries'],
            'start_date' => $full['start_date'],
            'end_date' => $full['end_date'],
            'year_approved' => $full['year_approved'],
            'latitude' => $full['latitude'],
            'longitude' => $full['longitude'],
            'description' => '',
            'latest_accomplishment' => '',
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public static function dashboardCollection(): Collection
    {
        return static::query()
            ->orderBy('province')
            ->orderBy('name')
            ->get()
            ->map(fn (self $project): array => $project->toDashboardArray())
            ->values();
    }

    public static function mapStatus(?string $raw): string
    {
        $key = strtolower(trim((string) $raw));
        $key = str_replace(['_', ' '], '-', $key);

        return match ($key) {
            'on-going', 'ongoing' => 'ongoing',
            'graduated', 'completed' => 'completed',
            'terminated', 'cancelled', 'canceled', 'widthdrawn', 'withdrawn' => 'cancelled',
            'delayed' => 'delayed',
            'on-hold', 'onhold' => 'on_hold',
            'new', 'planning' => 'planning',
            default => 'planning',
        };
    }

    public static function mapProgram(?string $type): string
    {
        $type = strtoupper(trim((string) $type));

        if (str_contains($type, 'SETUP')) {
            return 'SETUP';
        }

        if (str_contains($type, 'CEST')) {
            return 'CEST';
        }

        if (str_contains($type, 'STARBOOK')) {
            return 'STARBOOKS';
        }

        if (str_contains($type, 'GIA')) {
            return 'GIA';
        }

        if (str_contains($type, 'WATER')) {
            return 'Water';
        }

        if (str_contains($type, 'ENERGY')) {
            return 'Energy';
        }

        return 'Community';
    }

    private function buildDescription(): string
    {
        $bits = array_filter([
            $this->type ? "Type: {$this->type}." : null,
            $this->sector ? "Sector: {$this->sector}." : null,
            $this->district ? "District: {$this->district}." : null,
            $this->status ? "Status: {$this->status}." : null,
        ]);

        return $bits !== []
            ? implode(' ', $bits)
            : $this->name;
    }
}
