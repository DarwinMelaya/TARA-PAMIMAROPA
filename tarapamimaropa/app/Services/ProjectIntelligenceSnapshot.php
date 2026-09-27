<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;

/**
 * Pre-computed portfolio intelligence for TARA AI.
 * Pattern: aggregate from Eloquent first, then let Gemini reason on the snapshot
 * (enterprise AI-dashboard approach — not raw table dumps).
 */
class ProjectIntelligenceSnapshot
{
    private const CACHE_TTL_SECONDS = 120;

    /**
     * @return array<string, mixed>
     */
    public function forScope(?string $provinceScope = null): array
    {
        $version = Project::dashboardCacheVersion();
        $cacheKey = 'tara.ai.intelligence.'.md5($version.'|'.($provinceScope ?? 'all'));

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($provinceScope) {
            return $this->build($provinceScope);
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function build(?string $provinceScope): array
    {
        $base = Project::query()->when(
            filled($provinceScope),
            fn (Builder $query) => $query->where('province', $provinceScope),
        );

        $projectCount = (clone $base)->count();
        $totalCost = (float) ((clone $base)->sum('project_cost') ?? 0);
        $totalDue = (float) ((clone $base)->sum('amount_due') ?? 0);
        $totalRefunded = (float) ((clone $base)->sum('refunded') ?? 0);
        $avgRefundRate = (float) ((clone $base)->whereNotNull('refund_rate')->avg('refund_rate') ?? 0);
        $withCoords = (clone $base)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->count();
        $withoutCoords = max(0, $projectCount - $withCoords);
        $uniqueProvinces = (int) ((clone $base)
            ->whereNotNull('province')
            ->where('province', '!=', '')
            ->selectRaw('COUNT(DISTINCT province) as aggregate')
            ->value('aggregate') ?? 0);
        $uniqueCities = (int) ((clone $base)
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->selectRaw('COUNT(DISTINCT city) as aggregate')
            ->value('aggregate') ?? 0);
        $uniqueTypes = (int) ((clone $base)
            ->whereNotNull('type')
            ->where('type', '!=', '')
            ->selectRaw('COUNT(DISTINCT type) as aggregate')
            ->value('aggregate') ?? 0);
        $minYear = (clone $base)->whereNotNull('year_approved')->min('year_approved');
        $maxYear = (clone $base)->whereNotNull('year_approved')->max('year_approved');

        $byProvinceCount = $this->labeledCounts($base, 'province');
        $byProvinceCost = $this->labeledSums($base, 'province', 'project_cost');
        $byStatusCount = $this->labeledCounts($base, 'status');
        $byStatusCost = $this->labeledSums($base, 'status', 'project_cost');
        $byTypeCount = $this->labeledCounts($base, 'type');
        $bySectorCount = array_slice($this->labeledCounts($base, 'sector'), 0, 10, true);
        $byYearCount = $this->labeledCounts($base, 'year_approved', numericLabels: true);
        ksort($byYearCount);

        $equity = $this->provinceEquity($byProvinceCount, $byProvinceCost, $projectCount, $totalCost);
        $trends = $this->yearTrends($byYearCount);
        $riskFlags = $this->riskFlags(
            $byStatusCount,
            $equity,
            $totalDue,
            $totalCost,
            $withoutCoords,
            $projectCount,
            $avgRefundRate,
        );

        $topProjects = (clone $base)
            ->orderByDesc('project_cost')
            ->limit(12)
            ->get([
                'code',
                'name',
                'type',
                'sector',
                'province',
                'city',
                'status',
                'project_cost',
                'amount_due',
                'refunded',
                'refund_rate',
                'year_approved',
            ])
            ->map(static function (Project $project): array {
                return [
                    'code' => $project->code,
                    'name' => $project->name,
                    'type' => $project->type,
                    'sector' => $project->sector,
                    'province' => $project->province,
                    'city' => $project->city,
                    'status' => $project->status,
                    'project_cost' => $project->project_cost !== null ? (float) $project->project_cost : null,
                    'amount_due' => $project->amount_due !== null ? (float) $project->amount_due : null,
                    'refunded' => $project->refunded !== null ? (float) $project->refunded : null,
                    'refund_rate' => $project->refund_rate !== null ? (float) $project->refund_rate : null,
                    'year_approved' => $project->year_approved,
                ];
            })
            ->values()
            ->all();

        $insights = $this->computedInsights(
            $projectCount,
            $totalCost,
            $totalDue,
            $equity,
            $byStatusCount,
            $byTypeCount,
            $trends,
            $riskFlags,
            $withCoords,
            $withoutCoords,
        );

        return [
            'generated_at' => now()->toIso8601String(),
            'scope' => $provinceScope ?: 'MIMAROPA',
            'kpis' => [
                'project_count' => $projectCount,
                'total_project_cost' => round($totalCost, 2),
                'total_amount_due' => round($totalDue, 2),
                'total_refunded' => round($totalRefunded, 2),
                'avg_refund_rate' => round($avgRefundRate, 2),
                'with_coordinates' => $withCoords,
                'without_coordinates' => $withoutCoords,
                'coord_coverage_pct' => $projectCount > 0 ? round(($withCoords / $projectCount) * 100, 1) : 0,
                'unique_provinces' => $uniqueProvinces,
                'unique_cities' => $uniqueCities,
                'unique_types' => $uniqueTypes,
                'year_span' => [
                    'min' => $minYear !== null ? (int) $minYear : null,
                    'max' => $maxYear !== null ? (int) $maxYear : null,
                ],
            ],
            // Compat keys for LocalAnalyticsFallbackService
            'project_count' => $projectCount,
            'total_project_cost' => round($totalCost, 2),
            'counts_by_province' => $byProvinceCount,
            'counts_by_status' => $byStatusCount,
            'counts_by_type' => $byTypeCount,
            'cost_by_province' => $byProvinceCost,
            'cost_by_status' => $byStatusCost,
            'counts_by_sector' => $bySectorCount,
            'counts_by_year' => $byYearCount,
            'province_equity' => $equity,
            'trends' => $trends,
            'risk_flags' => $riskFlags,
            'top_projects_by_cost' => $topProjects,
            'computed_insights' => $insights,
            'sample_projects' => $topProjects,
            'note' => 'Use kpis, province_equity, trends, risk_flags, and computed_insights as ground truth. top_projects_by_cost is a sample, not the full list.',
        ];
    }

    /**
     * @return array<string, int>
     */
    private function labeledCounts(Builder $base, string $column, bool $numericLabels = false): array
    {
        $expr = $numericLabels
            ? "COALESCE({$column}, 0) as label"
            : "COALESCE(NULLIF({$column}, ''), 'Unknown') as label";

        return (clone $base)
            ->selectRaw("{$expr}, COUNT(*) as aggregate")
            ->groupBy('label')
            ->orderByDesc('aggregate')
            ->pluck('aggregate', 'label')
            ->map(static fn ($n): int => (int) $n)
            ->all();
    }

    /**
     * @return array<string, float>
     */
    private function labeledSums(Builder $base, string $column, string $sumColumn): array
    {
        return (clone $base)
            ->selectRaw("COALESCE(NULLIF({$column}, ''), 'Unknown') as label, COALESCE(SUM({$sumColumn}), 0) as aggregate")
            ->groupBy('label')
            ->orderByDesc('aggregate')
            ->pluck('aggregate', 'label')
            ->map(static fn ($n): float => round((float) $n, 2))
            ->all();
    }

    /**
     * @param  array<string, int>  $counts
     * @param  array<string, float>  $costs
     * @return list<array{province: string, count: int, cost: float, share_of_count_pct: float, share_of_cost_pct: float, signal: string}>
     */
    private function provinceEquity(array $counts, array $costs, int $projectCount, float $totalCost): array
    {
        if ($counts === []) {
            return [];
        }

        $avg = $projectCount / max(count($counts), 1);
        $rows = [];

        foreach ($counts as $province => $count) {
            $cost = (float) ($costs[$province] ?? 0);
            $signal = 'balanced';
            if ($avg > 0 && $count < $avg * 0.65) {
                $signal = 'under-served';
            } elseif ($avg > 0 && $count > $avg * 1.35) {
                $signal = 'heavy load';
            }

            $rows[] = [
                'province' => (string) $province,
                'count' => (int) $count,
                'cost' => round($cost, 2),
                'share_of_count_pct' => $projectCount > 0 ? round(($count / $projectCount) * 100, 1) : 0.0,
                'share_of_cost_pct' => $totalCost > 0 ? round(($cost / $totalCost) * 100, 1) : 0.0,
                'signal' => $signal,
            ];
        }

        usort($rows, static fn ($a, $b) => $b['count'] <=> $a['count']);

        return $rows;
    }

    /**
     * @param  array<string|int, int>  $byYear
     * @return array<string, mixed>
     */
    private function yearTrends(array $byYear): array
    {
        $years = [];
        foreach ($byYear as $year => $count) {
            $y = (int) $year;
            if ($y <= 0) {
                continue;
            }
            $years[$y] = (int) $count;
        }
        ksort($years);

        $keys = array_keys($years);
        $latest = $keys !== [] ? (int) end($keys) : null;
        $prior = null;
        if ($latest !== null) {
            foreach (array_reverse($keys) as $y) {
                if ((int) $y < $latest) {
                    $prior = (int) $y;
                    break;
                }
            }
        }

        $latestCount = $latest !== null ? ($years[$latest] ?? 0) : 0;
        $priorCount = $prior !== null ? ($years[$prior] ?? 0) : 0;
        $delta = $latestCount - $priorCount;
        $deltaPct = $priorCount > 0 ? round(($delta / $priorCount) * 100, 1) : null;

        return [
            'by_year' => $years,
            'latest_year' => $latest,
            'prior_year' => $prior,
            'latest_count' => $latestCount,
            'prior_count' => $priorCount,
            'yoy_delta' => $delta,
            'yoy_delta_pct' => $deltaPct,
            'direction' => $delta > 0 ? 'up' : ($delta < 0 ? 'down' : 'flat'),
        ];
    }

    /**
     * @param  array<string, int>  $byStatus
     * @param  list<array{province: string, count: int, signal: string}>  $equity
     * @return list<string>
     */
    private function riskFlags(
        array $byStatus,
        array $equity,
        float $totalDue,
        float $totalCost,
        int $withoutCoords,
        int $projectCount,
        float $avgRefundRate,
    ): array {
        $flags = [];

        foreach ($byStatus as $status => $count) {
            $hay = mb_strtolower((string) $status);
            if (
                (str_contains($hay, 'terminat') || str_contains($hay, 'delay') || str_contains($hay, 'hold') || str_contains($hay, 'cancel'))
                && $count >= max(3, (int) floor($projectCount * 0.08))
            ) {
                $flags[] = "Status pressure: {$status} covers {$count} projects.";
            }
        }

        foreach ($equity as $row) {
            if ($row['signal'] === 'under-served') {
                $flags[] = "Equity gap: {$row['province']} is under-served ({$row['count']} projects, {$row['share_of_count_pct']}% share).";
            }
            if ($row['signal'] === 'heavy load' && $row['share_of_count_pct'] >= 28) {
                $flags[] = "Concentration: {$row['province']} holds {$row['share_of_count_pct']}% of projects.";
            }
        }

        if ($totalCost > 0 && $totalDue / $totalCost >= 0.15) {
            $flags[] = 'Collections watch: amount due is '.round(($totalDue / $totalCost) * 100, 1).'% of total project cost.';
        }

        if ($projectCount > 0 && $withoutCoords / $projectCount >= 0.25) {
            $flags[] = "Map coverage gap: {$withoutCoords} projects missing coordinates ({$this->pct($withoutCoords, $projectCount)}%).";
        }

        if ($avgRefundRate > 0 && $avgRefundRate < 40) {
            $flags[] = 'Refund performance soft: average refund rate about '.round($avgRefundRate, 1).'%.';
        }

        return array_values(array_unique($flags));
    }

    /**
     * @param  list<array{province: string, count: int, cost: float, share_of_count_pct: float, signal: string}>  $equity
     * @param  array<string, int>  $byStatus
     * @param  array<string, int>  $byType
     * @param  array<string, mixed>  $trends
     * @param  list<string>  $riskFlags
     * @return list<string>
     */
    private function computedInsights(
        int $projectCount,
        float $totalCost,
        float $totalDue,
        array $equity,
        array $byStatus,
        array $byType,
        array $trends,
        array $riskFlags,
        int $withCoords,
        int $withoutCoords,
    ): array {
        $insights = [];
        $insights[] = "Portfolio now holds {$projectCount} projects totaling ₱".$this->peso($totalCost).'.';

        if ($equity !== []) {
            $top = $equity[0];
            $light = null;
            foreach (array_reverse($equity) as $row) {
                if ($row['signal'] === 'under-served' || $light === null) {
                    $light = $row;
                    if ($row['signal'] === 'under-served') {
                        break;
                    }
                }
            }
            $insights[] = "{$top['province']} leads volume ({$top['count']} projects, {$top['share_of_count_pct']}% share).";
            if ($light) {
                $insights[] = "{$light['province']} is lightest in this cut ({$light['count']} projects) — a natural place to grow presence.";
            }
        }

        if ($byStatus !== []) {
            arsort($byStatus);
            $status = array_key_first($byStatus);
            $insights[] = "Most common status is {$status} (".(int) $byStatus[$status].' projects).';
        }

        if ($byType !== []) {
            arsort($byType);
            $type = array_key_first($byType);
            $insights[] = "Dominant type/program bucket is {$type} (".(int) $byType[$type].' projects).';
        }

        if (($trends['latest_year'] ?? null) && ($trends['prior_year'] ?? null)) {
            $dir = (string) ($trends['direction'] ?? 'flat');
            $pct = $trends['yoy_delta_pct'];
            $insights[] = $pct === null
                ? "Approvals in {$trends['latest_year']}: {$trends['latest_count']} vs {$trends['prior_year']}: {$trends['prior_count']} ({$dir})."
                : "Year trend {$trends['prior_year']}→{$trends['latest_year']}: {$dir} by {$pct}% ({$trends['prior_count']}→{$trends['latest_count']}).";
        }

        if ($totalDue > 0) {
            $insights[] = 'Amount still due across the portfolio: ₱'.$this->peso($totalDue).'.';
        }

        $insights[] = "Map readiness: {$withCoords} with coordinates, {$withoutCoords} still missing.";

        foreach (array_slice($riskFlags, 0, 3) as $flag) {
            $insights[] = $flag;
        }

        return array_values(array_unique($insights));
    }

    private function pct(int $part, int $whole): float
    {
        return $whole > 0 ? round(($part / $whole) * 100, 1) : 0.0;
    }

    private function peso(float $n): string
    {
        if ($n >= 1_000_000) {
            return number_format($n / 1_000_000, 1).'M';
        }
        if ($n >= 1_000) {
            return number_format($n / 1_000, 1).'K';
        }

        return number_format($n, 0);
    }
}
