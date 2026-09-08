<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiAnalyticsChatService
{
    /**
     * @param  list<array{role: string, content: string}>  $history
     */
    public function reply(
        string $message,
        array $history = [],
        ?string $provinceScope = null,
        string $audience = 'general',
    ): string {
        $projects = $this->loadProjects($provinceScope);
        $payload = $this->buildDataset($projects);

        $contents = [];

        foreach (array_slice($history, -10) as $turn) {
            $role = $turn['role'] ?? '';
            $content = trim((string) ($turn['content'] ?? ''));

            if ($content === '' || ! in_array($role, ['user', 'assistant'], true)) {
                continue;
            }

            $contents[] = [
                'role' => $role === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $content]],
            ];
        }

        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $message]],
        ];

        $systemPrompt = $this->systemPrompt($provinceScope, $audience)."\n\nLIVE PROJECT DATASET (JSON):\n".json_encode(
            $payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        );

        return $this->generate($systemPrompt, $contents);
    }

    /**
     * Executive planning brief for the Regional Director.
     *
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
    public function planningBrief(?string $provinceScope = null): array
    {
        $projects = $this->loadProjects($provinceScope);
        $payload = $this->buildDataset($projects);

        $systemPrompt = <<<PROMPT
You are TARA AI Planning Advisor for the DOST-MIMAROPA Regional Director (TARA PAMIMAROPA).
Use ONLY the LIVE PROJECT DATASET JSON. Do not invent projects, budgets, or statuses.
Focus on actionable regional planning: portfolio balance across provinces, status risk, funding concentration, and what the RD should prioritize next.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "headline": "one sharp line for the RD",
  "situation": "2-4 sentences on the regional portfolio posture",
  "priorities": [
    {"title": "short title", "why": "why it matters", "action": "concrete next step"}
  ],
  "equity": [
    {"province": "province name", "signal": "under-served|balanced|heavy load", "note": "one sentence"}
  ],
  "risks": [
    {"title": "risk title", "severity": "high|medium|low", "mitigation": "what RD can do"}
  ],
  "next_30_days": ["action 1", "action 2", "action 3"]
}

Rules:
- priorities: 3 to 5 items, ordered by urgency for planning.
- equity: cover all MIMAROPA provinces present in the dataset.
- risks: 2 to 4 items grounded in status, refund, or concentration patterns.
- next_30_days: 3 to 5 concrete actions.
- Prefer Philippine peso shorthand (e.g. ₱1.2M) when citing money.
PROMPT;

        $contents = [
            [
                'role' => 'user',
                'parts' => [[
                    'text' => "Generate the Regional Director planning brief from this LIVE PROJECT DATASET (JSON):\n".json_encode(
                        $payload,
                        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
                    ),
                ]],
            ],
        ];

        $text = $this->generate($systemPrompt, $contents);
        $decoded = $this->decodeJsonObject($text);

        return [
            'headline' => (string) ($decoded['headline'] ?? 'Regional planning brief'),
            'situation' => (string) ($decoded['situation'] ?? ''),
            'priorities' => $this->normalizeList($decoded['priorities'] ?? [], ['title', 'why', 'action']),
            'equity' => $this->normalizeList($decoded['equity'] ?? [], ['province', 'signal', 'note']),
            'risks' => $this->normalizeList($decoded['risks'] ?? [], ['title', 'severity', 'mitigation']),
            'next_30_days' => array_values(array_filter(array_map(
                static fn ($item): string => trim((string) $item),
                is_array($decoded['next_30_days'] ?? null) ? $decoded['next_30_days'] : [],
            ))),
            'generated_at' => now()->toIso8601String(),
            'project_count' => (int) ($payload['project_count'] ?? 0),
        ];
    }

    /**
     * @param  list<array{role: string, parts: list<array{text: string}>}>  $contents
     */
    private function generate(string $systemPrompt, array $contents): string
    {
        $apiKey = config('services.gemini.key');

        if (! filled($apiKey)) {
            throw new RuntimeException(
                'Gemini is not configured. Set GEMINI_API_KEY in your .env file.',
            );
        }

        $model = (string) config('services.gemini.model', 'gemini-2.5-flash');
        $url = sprintf(
            'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
            rawurlencode($model),
            urlencode((string) $apiKey),
        );

        try {
            $response = Http::acceptJson()
                ->timeout(90)
                ->post($url, [
                    'system_instruction' => [
                        'parts' => [['text' => $systemPrompt]],
                    ],
                    'contents' => $contents,
                    'generationConfig' => [
                        'temperature' => 0.2,
                    ],
                ])
                ->throw()
                ->json();
        } catch (RequestException $e) {
            report($e);

            $body = $e->response?->json('error.message');

            throw new RuntimeException(
                filled($body)
                    ? "Gemini error: {$body}"
                    : 'Could not reach Gemini. Try again in a moment.',
                previous: $e,
            );
        }

        $parts = data_get($response, 'candidates.0.content.parts', []);
        $text = '';

        if (is_array($parts)) {
            foreach ($parts as $part) {
                $text .= (string) ($part['text'] ?? '');
            }
        }

        $text = trim($text);

        if ($text === '') {
            $blockReason = data_get($response, 'promptFeedback.blockReason')
                ?? data_get($response, 'candidates.0.finishReason');

            throw new RuntimeException(
                filled($blockReason)
                    ? "Gemini returned no reply ({$blockReason})."
                    : 'Gemini returned an empty reply.',
            );
        }

        return $text;
    }

    private function systemPrompt(?string $provinceScope, string $audience): string
    {
        $scope = $provinceScope
            ? "You only have data for the PSTO province: {$provinceScope}."
            : 'You have the full MIMAROPA project portfolio from the TARA database.';

        $role = $audience === 'regional_director'
            ? 'You advise the Regional Director on planning, equity across PSTOs, funding posture, and operational priorities. Lead with decisions and next actions.'
            : 'Be concise and useful for executives and field officers (short paragraphs or tight bullet lists).';

        return <<<PROMPT
You are TARA AI Analytics for DOST-MIMAROPA (TARA PAMIMAROPA).
{$scope}
{$role}

Rules:
- Answer ONLY using the LIVE PROJECT DATASET JSON provided in this conversation.
- If the dataset does not contain enough information, say what is missing. Do not invent projects, budgets, or statuses.
- Prefer Philippine peso formatting when talking about money (e.g. ₱1.2M).
- When listing projects, include code (if any), province, status, and project cost when available.
- Status labels in the data are the real Excel/DB labels (On-going, Graduated, Terminated, etc.).
PROMPT;
    }

    /**
     * @return Collection<int, Project>
     */
    private function loadProjects(?string $provinceScope): Collection
    {
        return Project::query()
            ->when(
                filled($provinceScope),
                fn ($query) => $query->where('province', $provinceScope),
            )
            ->orderBy('province')
            ->orderBy('name')
            ->get();
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJsonObject(string $text): array
    {
        $cleaned = trim($text);
        $cleaned = preg_replace('/^```(?:json)?\s*/i', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\s*```$/', '', $cleaned) ?? $cleaned;

        $decoded = json_decode($cleaned, true);

        if (! is_array($decoded) && preg_match('/\{.*\}/s', $cleaned, $matches) === 1) {
            $decoded = json_decode($matches[0], true);
        }

        if (! is_array($decoded)) {
            throw new RuntimeException('Gemini returned a planning brief that could not be parsed.');
        }

        return $decoded;
    }

    /**
     * @param  mixed  $items
     * @param  list<string>  $keys
     * @return list<array<string, string>>
     */
    private function normalizeList(mixed $items, array $keys): array
    {
        if (! is_array($items)) {
            return [];
        }

        $out = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $row = [];
            foreach ($keys as $key) {
                $row[$key] = trim((string) ($item[$key] ?? ''));
            }

            if (implode('', $row) === '') {
                continue;
            }

            $out[] = $row;
        }

        return $out;
    }

    /**
     * @param  Collection<int, Project>  $projects
     * @return array<string, mixed>
     */
    private function buildDataset(Collection $projects): array
    {
        $rows = $projects->map(function (Project $project): array {
            return [
                'id' => $project->id,
                'code' => $project->code,
                'name' => $project->name,
                'type' => $project->type,
                'year_approved' => $project->year_approved,
                'beneficiary' => $project->beneficiary,
                'collaborators' => $project->collaborators,
                'sector' => $project->sector,
                'province' => $project->province,
                'city' => $project->city,
                'district' => $project->district,
                'status' => $project->status,
                'project_cost' => $project->project_cost !== null ? (float) $project->project_cost : null,
                'amount_due' => $project->amount_due !== null ? (float) $project->amount_due : null,
                'refunded' => $project->refunded !== null ? (float) $project->refunded : null,
                'refund_rate' => $project->refund_rate !== null ? (float) $project->refund_rate : null,
                'latitude' => $project->latitude !== null ? (float) $project->latitude : null,
                'longitude' => $project->longitude !== null ? (float) $project->longitude : null,
                'has_coordinates' => $project->latitude !== null && $project->longitude !== null,
            ];
        })->values()->all();

        $byProvince = [];
        $byStatus = [];
        $byType = [];
        $totalCost = 0.0;

        foreach ($rows as $row) {
            $province = (string) ($row['province'] ?: 'Unknown');
            $status = (string) ($row['status'] ?: 'Unknown');
            $type = (string) ($row['type'] ?: 'Unknown');
            $byProvince[$province] = ($byProvince[$province] ?? 0) + 1;
            $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;
            $byType[$type] = ($byType[$type] ?? 0) + 1;
            $totalCost += (float) ($row['project_cost'] ?? 0);
        }

        arsort($byProvince);
        arsort($byStatus);
        arsort($byType);

        return [
            'generated_at' => now()->toIso8601String(),
            'project_count' => count($rows),
            'total_project_cost' => round($totalCost, 2),
            'counts_by_province' => $byProvince,
            'counts_by_status' => $byStatus,
            'counts_by_type' => $byType,
            'projects' => $rows,
        ];
    }
}
