<?php

namespace App\Services;

/**
 * Deterministic offline analytics when Gemini is down or unconfigured.
 * Answers from pre-aggregated portfolio data only — never invents rows or runs SQL.
 */
class LocalAnalyticsFallbackService
{
    /**
     * @param  array<string, mixed>  $dataset
     */
    public function reply(string $message, array $dataset, string $audience = 'general'): string
    {
        $q = mb_strtolower(trim($message));
        $count = (int) ($dataset['project_count'] ?? data_get($dataset, 'kpis.project_count', 0));
        $totalCost = (float) ($dataset['total_project_cost'] ?? data_get($dataset, 'kpis.total_project_cost', 0));
        $byProvince = is_array($dataset['counts_by_province'] ?? null) ? $dataset['counts_by_province'] : [];
        $byStatus = is_array($dataset['counts_by_status'] ?? null) ? $dataset['counts_by_status'] : [];
        $insights = is_array($dataset['computed_insights'] ?? null) ? $dataset['computed_insights'] : [];
        $risks = is_array($dataset['risk_flags'] ?? null) ? $dataset['risk_flags'] : [];

        $lines = [];
        $lines[] = "From live portfolio intelligence: {$count} projects · ₱".$this->peso($totalCost).'.';

        if ($insights !== []) {
            $lines[] = 'Key signals:';
            foreach (array_slice($insights, 0, 4) as $insight) {
                $lines[] = '- '.(string) $insight;
            }
        }

        if ($this->asksAbout($q, ['how many', 'count', 'total project', 'number of'])) {
            $lines[] = "You currently have {$count} projects on file.";
        }

        if ($this->asksAbout($q, ['budget', 'cost', 'funding', 'peso', '₱', 'money', 'due', 'refund'])) {
            $due = (float) data_get($dataset, 'kpis.total_amount_due', 0);
            $lines[] = 'Total project cost: ₱'.$this->peso($totalCost).'.';
            if ($due > 0) {
                $lines[] = 'Amount due: ₱'.$this->peso($due).'.';
            }
        }

        if ($this->asksAbout($q, ['risk', 'watch', 'problem', 'delay', 'terminat', 'hold'])) {
            if ($risks !== []) {
                $lines[] = 'Risk watch:';
                foreach (array_slice($risks, 0, 4) as $risk) {
                    $lines[] = '- '.(string) $risk;
                }
            }
        }

        if ($this->asksAbout($q, [
            'priority', 'plan', 'recommend', 'next', 'focus',
            '2026', '2027', '2028', 'strategy', 'future', 'goal', 'roadmap', 'outlook',
        ])) {
            $lines[] = $this->planningHints($byProvince, $byStatus, $count);
            $lines[] = $this->futurePlanningAdvice($byProvince, $byStatus, $count, $totalCost, $q);
        }

        if (count($lines) <= 2) {
            $topP = array_key_first($byProvince) ?: 'n/a';
            $topS = array_key_first($byStatus) ?: 'n/a';
            if ($byProvince !== []) {
                arsort($byProvince);
                $topP = array_key_first($byProvince) ?: $topP;
            }
            if ($byStatus !== []) {
                arsort($byStatus);
                $topS = array_key_first($byStatus) ?: $topS;
            }
            $lines[] = "Stand-out pattern: {$topP} leads by count, and {$topS} is the most common status.";
            $lines[] = 'Ask about equity, risks, funding due, year trends, or next-year priorities.';
        }

        return implode("\n\n", array_filter($lines, static fn ($line) => trim((string) $line) !== ''));
    }

    /**
     * @param  array<string, mixed>  $dataset
     * @return array{
     *     headline: string,
     *     situation: string,
     *     priorities: list<array{title: string, why: string, action: string}>,
     *     equity: list<array{province: string, signal: string, note: string}>,
     *     risks: list<array{title: string, severity: string, mitigation: string}>,
     *     next_30_days: list<string>,
     *     generated_at: string,
     *     project_count: int
     * }
     */
    public function planningBrief(array $dataset): array
    {
        $count = (int) ($dataset['project_count'] ?? data_get($dataset, 'kpis.project_count', 0));
        $totalCost = (float) ($dataset['total_project_cost'] ?? data_get($dataset, 'kpis.total_project_cost', 0));
        $byProvince = is_array($dataset['counts_by_province'] ?? null) ? $dataset['counts_by_province'] : [];
        $byStatus = is_array($dataset['counts_by_status'] ?? null) ? $dataset['counts_by_status'] : [];
        $insights = is_array($dataset['computed_insights'] ?? null) ? $dataset['computed_insights'] : [];
        $riskFlags = is_array($dataset['risk_flags'] ?? null) ? $dataset['risk_flags'] : [];
        $due = (float) data_get($dataset, 'kpis.total_amount_due', 0);

        arsort($byProvince);
        arsort($byStatus);

        $topProvince = array_key_first($byProvince) ?: 'Unknown';
        $topProvinceCount = (int) ($byProvince[$topProvince] ?? 0);
        $bottomProvince = '';
        $bottomCount = PHP_INT_MAX;
        foreach ($byProvince as $province => $n) {
            if ((int) $n < $bottomCount) {
                $bottomCount = (int) $n;
                $bottomProvince = (string) $province;
            }
        }

        $riskStatus = $this->pickRiskStatus($byStatus);
        $avg = $count > 0 && count($byProvince) > 0 ? $count / count($byProvince) : 0;

        $equity = [];
        foreach ($byProvince as $province => $n) {
            $n = (int) $n;
            $signal = 'balanced';
            if ($avg > 0 && $n < $avg * 0.6) {
                $signal = 'under-served';
            } elseif ($avg > 0 && $n > $avg * 1.4) {
                $signal = 'heavy load';
            }
            $equity[] = [
                'province' => (string) $province,
                'signal' => $signal,
                'note' => "{$n} projects in current portfolio snapshot.",
            ];
        }

        $priorities = [
            [
                'title' => "Give {$bottomProvince} more attention",
                'why' => "{$bottomProvince} has {$bottomCount} projects while {$topProvince} has {$topProvinceCount}.",
                'action' => 'Review upcoming proposals and field capacity for lighter provinces.',
            ],
            [
                'title' => 'Watch status hotspots',
                'why' => $riskStatus
                    ? "{$riskStatus['label']} covers {$riskStatus['count']} projects."
                    : 'Status mix still needs routine checking.',
                'action' => 'Schedule a short status check with teams handling delayed or on-hold work.',
            ],
            [
                'title' => 'Check funding balance',
                'why' => 'Total project cost is ₱'.$this->peso($totalCost).
                    ($due > 0 ? ' with ₱'.$this->peso($due).' still due' : '').
                    ' across '.$count.' projects.',
                'action' => 'Flag big outliers by province before new funding decisions.',
            ],
        ];

        $risks = [
            [
                'title' => 'Uneven province load',
                'severity' => $avg > 0 && $topProvinceCount > $avg * 1.5 ? 'high' : 'medium',
                'mitigation' => "Pause stacking more work on {$topProvince} until the gap narrows.",
            ],
            [
                'title' => $riskStatus ? "Status watch: {$riskStatus['label']}" : 'Status drift',
                'severity' => $riskStatus && $riskStatus['count'] >= max(3, (int) floor($count * 0.15)) ? 'high' : 'medium',
                'mitigation' => 'Ask for weekly updates on projects that look stuck.',
            ],
        ];

        foreach (array_slice($riskFlags, 0, 2) as $flag) {
            $risks[] = [
                'title' => 'Intelligence signal',
                'severity' => 'medium',
                'mitigation' => (string) $flag,
            ];
        }

        $situationBits = [
            "Live portfolio intelligence shows {$count} projects totaling ₱".$this->peso($totalCost).'.',
            "{$topProvince} has the most ({$topProvinceCount}), while {$bottomProvince} has the fewest ({$bottomCount}).",
        ];
        if ($insights !== []) {
            $situationBits[] = (string) $insights[0];
        }

        return [
            'headline' => "Planning notes from live data · {$count} projects",
            'situation' => implode(' ', $situationBits),
            'priorities' => $priorities,
            'equity' => $equity,
            'risks' => array_slice($risks, 0, 4),
            'next_30_days' => [
                "Talk with the {$bottomProvince} team about pipeline gaps.",
                'List projects that need a status check this month.',
                'Compare funding share vs project count by province.',
                'Confirm map locations for projects still missing coordinates.',
            ],
            'generated_at' => now()->toIso8601String(),
            'project_count' => $count,
        ];
    }

    /**
     * @param  array<string, mixed>  $chartContext
     * @param  array<string, mixed>  $dataset
     * @return array{
     *     headline: string,
     *     summary: string,
     *     findings: list<array{title: string, detail: string}>,
     *     recommendations: list<string>,
     *     generated_at: string
     * }
     */
    public function interpretCharts(array $chartContext, array $dataset): array
    {
        $view = (string) ($chartContext['view'] ?? 'region');
        $contextLabel = (string) ($chartContext['context_label'] ?? 'MIMAROPA');
        $charts = is_array($chartContext['charts'] ?? null) ? $chartContext['charts'] : [];
        $findings = [];

        foreach (array_slice($charts, 0, 6) as $chart) {
            if (! is_array($chart)) {
                continue;
            }
            $title = trim((string) ($chart['title'] ?? 'Chart'));
            $rows = is_array($chart['rows'] ?? null) ? $chart['rows'] : [];
            $parsed = [];
            foreach ($rows as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $label = trim((string) ($row['label'] ?? ''));
                $value = (float) ($row['value'] ?? 0);
                if ($label === '' || $value <= 0) {
                    continue;
                }
                $parsed[] = ['label' => $label, 'value' => $value];
            }
            if ($parsed === []) {
                continue;
            }
            usort($parsed, static fn ($a, $b) => $b['value'] <=> $a['value']);
            $total = array_sum(array_column($parsed, 'value'));
            $top = $parsed[0];
            $share = $total > 0 ? round(($top['value'] / $total) * 100) : 0;
            $second = $parsed[1]['label'] ?? null;
            $detail = "{$top['label']} leads at {$this->fmt($top['value'], (string) ($chart['format'] ?? 'number'))} ({$share}% of this series).";
            if ($second) {
                $detail .= " Next is {$second}.";
            }
            $findings[] = [
                'title' => $title,
                'detail' => $detail,
            ];
        }

        if ($findings === []) {
            $findings[] = [
                'title' => 'No chart series',
                'detail' => 'Current view has no positive values to interpret. Widen year filter or switch tab.',
            ];
        }

        $count = (int) ($dataset['project_count'] ?? data_get($chartContext, 'stats.total', 0));
        $recommendations = [
            "Use {$contextLabel} when you brief the team.",
            'Compare the leading and trailing rows before new funding moves.',
            'Refresh this view after you change year or program filters.',
        ];

        if ($view === 'province' || $view === 'municipality') {
            $recommendations[] = 'Open the municipality list and check the lightest LGUs.';
        }
        if ($view === 'program') {
            $recommendations[] = 'Check if this program is balanced across provinces.';
        }

        return [
            'headline' => "What the charts show · {$contextLabel}",
            'summary' => $count > 0
                ? "Quick read of ".count($findings)." chart views covering about {$count} projects. Here are the stand-out patterns."
                : 'Quick read of '.count($findings).' chart views. Here are the stand-out patterns.',
            'findings' => $findings,
            'recommendations' => $recommendations,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * @param  array<string, int|float>  $map
     * @return list<string>
     */
    private function rankLines(array $map, int $limit): array
    {
        arsort($map);
        $lines = [];
        $i = 0;
        foreach ($map as $key => $value) {
            $lines[] = '- '.$key.': '.$value;
            $i++;
            if ($i >= $limit) {
                break;
            }
        }

        return $lines === [] ? ['- No data'] : $lines;
    }

    /**
     * @param  array<string, int|float>  $byProvince
     * @param  array<string, int|float>  $byStatus
     */
    private function futurePlanningAdvice(
        array $byProvince,
        array $byStatus,
        int $count,
        float $totalCost,
        string $q,
    ): string {
        arsort($byProvince);
        arsort($byStatus);
        $topP = array_key_first($byProvince) ?: 'the leading province';
        $bottomP = '';
        $bottomCount = PHP_INT_MAX;
        foreach ($byProvince as $province => $n) {
            if ((int) $n < $bottomCount) {
                $bottomCount = (int) $n;
                $bottomP = (string) $province;
            }
        }
        if ($bottomP === '') {
            $bottomP = 'lighter provinces';
        }

        $year = 'next year';
        if (preg_match('/\b(20\d{2})\b/', $q, $m) === 1) {
            $year = $m[1];
        }

        return "Planning ideas for {$year} (suggestions based on current portfolio patterns, not a locked plan): keep {$topP} from over-concentrating, grow pipeline in {$bottomP}, clear stuck statuses first, and size new obligate against the current ₱".$this->peso($totalCost)." / {$count}-project base.";
    }

    /**
     * @param  array<string, int|float>  $byProvince
     * @param  array<string, int|float>  $byStatus
     */
    private function planningHints(array $byProvince, array $byStatus, int $count): string
    {
        arsort($byProvince);
        arsort($byStatus);
        $topP = array_key_first($byProvince) ?: 'n/a';
        $topS = array_key_first($byStatus) ?: 'n/a';

        return "Suggestion: {$topP} has the most projects, and {$topS} is the most common status. With {$count} projects on file, focus on balance across provinces and a quick status check this month.";
    }

    /**
     * @param  array<string, int|float>  $byStatus
     * @return array{label: string, count: int}|null
     */
    private function pickRiskStatus(array $byStatus): ?array
    {
        $needles = ['delay', 'hold', 'terminat', 'cancel', 'problem', 'at risk'];
        $best = null;
        $bestCount = 0;
        foreach ($byStatus as $label => $count) {
            $hay = mb_strtolower((string) $label);
            foreach ($needles as $needle) {
                if (str_contains($hay, $needle) && (int) $count > $bestCount) {
                    $best = (string) $label;
                    $bestCount = (int) $count;
                }
            }
        }

        return $best ? ['label' => $best, 'count' => $bestCount] : null;
    }

    /**
     * @param  list<string>  $needles
     */
    private function asksAbout(string $q, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($q, $needle)) {
                return true;
            }
        }

        return false;
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

    private function fmt(float $n, string $format): string
    {
        if ($format === 'peso' || $format === 'compact') {
            return '₱'.$this->peso($n);
        }

        return (string) (int) round($n);
    }
}
