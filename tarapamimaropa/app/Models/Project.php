<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

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
 * @property string|null $latitude
 * @property string|null $longitude
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
    'latitude',
    'longitude',
])]
class Project extends Model
{
    /** Cursor / lazy chunk size — Medium-style large-table batching. */
    public const DASHBOARD_PAGE_SIZE = 1000;

    /** Seconds to cache each cursor page. */
    public const DASHBOARD_CACHE_TTL = 600;

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
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    protected static function booted(): void
    {
        // Invalidate versioned dashboard/stream caches on any write.
        static::saved(fn () => static::bumpDashboardCache());
        static::deleted(fn () => static::bumpDashboardCache());
    }

    public static function dashboardCacheVersionKey(): string
    {
        return 'projects.dashboard.cache_version';
    }

    public static function bumpDashboardCache(): void
    {
        Cache::forever(static::dashboardCacheVersionKey(), (string) Str::uuid());
    }

    public static function dashboardCacheVersion(): string
    {
        return (string) Cache::get(static::dashboardCacheVersionKey(), '0');
    }

    /**
     * Slim column set for map/dashboard reads (never SELECT *).
     *
     * @return list<string>
     */
    public static function dashboardColumns(): array
    {
        return [
            'id',
            'code',
            'name',
            'type',
            'year_approved',
            'beneficiary',
            'collaborators',
            'sector',
            'province',
            'city',
            'status',
            'project_cost',
            'latitude',
            'longitude',
        ];
    }

    /**
     * Base query for large-table dashboard/map reads.
     */
    public static function dashboardBaseQuery(?string $province = null): Builder
    {
        return static::query()
            ->select(static::dashboardColumns())
            ->when(
                filled($province),
                fn (Builder $query) => $query->where('province', $province),
            );
    }

    /**
     * Shape expected by Region Programs / Summary graphs (TaraProject).
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
            'db_id' => $this->id,
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
            ...$this->resolveCoordinates(),
            'amount_due' => $this->amount_due !== null ? (float) $this->amount_due : null,
            'refunded' => $this->refunded !== null ? (float) $this->refunded : null,
            'refund_rate' => $this->refund_rate !== null ? (float) $this->refund_rate : null,
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public static function taraCollection(?string $province = null): Collection
    {
        $rows = [];

        // lazyById: never hydrate millions of models in one get().
        static::query()
            ->when(
                filled($province),
                fn (Builder $query) => $query->where('province', $province),
            )
            ->orderBy('id')
            ->lazyById(static::DASHBOARD_PAGE_SIZE)
            ->each(function (self $project) use (&$rows): void {
                $rows[] = $project->toTaraArray();
            });

        return collect($rows)->values();
    }

    /**
     * Prefer saved pin; otherwise stable approximate point for map display.
     *
     * @return array{latitude: float, longitude: float, has_coordinates: bool}
     */
    private function resolveCoordinates(): array
    {
        if ($this->latitude !== null && $this->longitude !== null) {
            return [
                'latitude' => (float) $this->latitude,
                'longitude' => (float) $this->longitude,
                'has_coordinates' => true,
            ];
        }

        return [
            ...$this->approximateCoordinates(),
            'has_coordinates' => false,
        ];
    }

    /**
     * Stable pseudo-random point inside each province bbox (no lat/lng saved yet).
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
     * Avoids buildDescription() — description not used on dashboards.
     *
     * @return array<string, mixed>
     */
    public function toDashboardArray(): array
    {
        $year = $this->year_approved ?? (int) now()->format('Y');
        $status = self::mapStatus($this->status);
        $program = self::mapProgram($this->type);
        $coords = $this->resolveCoordinates();

        return [
            'id' => (string) ($this->code ?: 'project-'.$this->id),
            'db_id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'beneficiary' => $this->beneficiary ?? '',
            'program' => $program,
            'type' => $this->type ?: $program,
            'sector' => $this->sector ?: 'Others',
            'province' => $this->province ?: 'Palawan',
            'municipality' => $this->city ?: '',
            'barangay' => '',
            'partner_agency' => $this->collaborators ?: 'DOST-MIMAROPA',
            'status' => $status,
            'status_label' => $this->status ?: 'Unknown',
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
            'latitude' => $coords['latitude'],
            'longitude' => $coords['longitude'],
            'has_coordinates' => $coords['has_coordinates'],
            'description' => '',
            'latest_accomplishment' => '',
        ];
    }

    /**
     * Full dashboard dump via lazyById + versioned cache (compat / exports).
     * Prefer dashboardInertiaPayload() + cursor stream for UI (no giant Inertia JSON).
     *
     * @return Collection<int, array<string, mixed>>
     */
    public static function dashboardCollection(?string $province = null): Collection
    {
        $version = static::dashboardCacheVersion();
        $key = 'projects.dashboard.full.'.$version.'.'.md5($province ?? 'all');

        /** @var list<array<string, mixed>> $rows */
        $rows = Cache::remember($key, static::DASHBOARD_CACHE_TTL, function () use ($province): array {
            $built = [];

            static::dashboardBaseQuery($province)
                ->orderBy('id')
                ->lazyById(static::DASHBOARD_PAGE_SIZE)
                ->each(function (self $project) use (&$built): void {
                    $built[] = $project->toDashboardArray();
                });

            return $built;
        });

        return collect($rows)->values();
    }

    /**
     * First cursor page for Inertia + meta so the client can stream the rest.
     *
     * @return array{projects: list<array<string, mixed>>, projectStream: array{next_cursor: string|null, per_page: int, province: string|null}}
     */
    public static function dashboardInertiaPayload(?string $province = null, ?int $perPage = null): array
    {
        $perPage = max(100, min(2000, $perPage ?? static::DASHBOARD_PAGE_SIZE));
        $page = static::dashboardCursorPage($province, null, $perPage);

        return [
            'projects' => $page['data'],
            'projectStream' => [
                'next_cursor' => $page['next_cursor'],
                'per_page' => $perPage,
                'province' => $province,
            ],
        ];
    }

    /**
     * One cursor page — cached, indexed order by id (Medium: cursor pagination).
     *
     * @return array{data: list<array<string, mixed>>, next_cursor: string|null}
     */
    public static function dashboardCursorPage(?string $province, ?string $cursor, int $perPage = self::DASHBOARD_PAGE_SIZE): array
    {
        $perPage = max(100, min(2000, $perPage));
        $version = static::dashboardCacheVersion();
        $key = 'projects.dashboard.page.'.$version.'.'.md5(($province ?? 'all').'|'.($cursor ?? '').'|'.$perPage);

        /** @var array{data: list<array<string, mixed>>, next_cursor: string|null} */
        return Cache::remember($key, static::DASHBOARD_CACHE_TTL, function () use ($province, $cursor, $perPage): array {
            $paginator = static::dashboardBaseQuery($province)
                ->orderBy('id')
                ->cursorPaginate($perPage, static::dashboardColumns(), 'cursor', $cursor);

            return [
                'data' => $paginator->getCollection()
                    ->map(fn (self $project): array => $project->toDashboardArray())
                    ->values()
                    ->all(),
                'next_cursor' => $paginator->nextCursor()?->encode(),
            ];
        });
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

        if (str_contains($type, 'SSCP')) {
            return 'SSCP';
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

    /**
     * Province → QR-TTC cluster number (C1…C5), matching imported Excel codes.
     */
    public static function provinceClusterNumber(string $province): int
    {
        return match ($province) {
            'Occidental Mindoro' => 1,
            'Oriental Mindoro' => 2,
            'Marinduque' => 3,
            'Romblon' => 4,
            'Palawan' => 5,
            default => 5,
        };
    }

    /**
     * Next trailing sequence used by QR-TTC-…-{seq} codes.
     */
    public static function nextCodeSequence(): int
    {
        $max = 0;

        foreach (static::query()->whereNotNull('code')->pluck('code') as $code) {
            $normalized = preg_replace('/\s+/', '', (string) $code) ?? '';

            if (preg_match('/-(\d+)$/', $normalized, $matches) === 1) {
                $max = max($max, (int) $matches[1]);
            }
        }

        return $max + 1;
    }

    /**
     * Build a code in the imported layout: QR-TTC-C{n}-{district}-{yy}-{seq}.
     */
    public static function buildCode(
        string $province,
        ?int $yearApproved = null,
        ?string $district = null,
        ?int $sequence = null,
    ): string {
        $cluster = self::provinceClusterNumber($province);
        $districtNum = 1;

        if (filled($district) && preg_match('/(\d+)/', $district, $matches) === 1) {
            $districtNum = max(1, (int) $matches[1]);
        }

        $year = ($yearApproved !== null && $yearApproved >= 1990)
            ? $yearApproved
            : (int) now()->format('Y');
        $yy = substr((string) $year, -2);
        $seq = $sequence ?? self::nextCodeSequence();

        return sprintf('QR-TTC-C%d-%d-%s-%04d', $cluster, $districtNum, $yy, $seq);
    }

    /**
     * Allocate a unique code matching the Excel QR-TTC layout.
     */
    public static function generateCode(
        string $province,
        ?int $yearApproved = null,
        ?string $district = null,
    ): string {
        $sequence = self::nextCodeSequence();

        do {
            $code = self::buildCode($province, $yearApproved, $district, $sequence);
            $sequence++;
        } while (static::query()->where('code', $code)->exists());

        return $code;
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
