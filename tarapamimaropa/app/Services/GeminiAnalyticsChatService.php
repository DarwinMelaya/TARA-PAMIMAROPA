<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class GeminiAnalyticsChatService
{
    public function __construct(
        private LocalAnalyticsFallbackService $fallback,
        private ProjectIntelligenceSnapshot $intelligence,
    ) {}

    /**
     * @param  list<array{role: string, content: string}>  $history
     * @return array{reply: string, source: string, fallback_reason: string|null}
     */
    public function reply(
        string $message,
        array $history = [],
        ?string $provinceScope = null,
        string $audience = 'general',
    ): array {
        $payload = $this->intelligence->forScope($provinceScope);

        try {
            $contents = [];

            foreach (array_slice($history, -6) as $turn) {
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

            $systemPrompt = $this->systemPrompt($provinceScope)."\n\nPORTFOLIO INTELLIGENCE SNAPSHOT (JSON):\n".json_encode(
                $payload,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
            );

            $text = $this->generate($systemPrompt, $contents, 1100);

            return [
                'reply' => $this->sanitizePublicReply($text),
                'source' => 'gemini',
                'fallback_reason' => null,
            ];
        } catch (Throwable $e) {
            Log::warning('Gemini chat failed; using local fallback.', [
                'message' => $e->getMessage(),
            ]);

            return [
                'reply' => $this->sanitizePublicReply(
                    $this->fallback->reply($message, $payload, $audience),
                ),
                'source' => 'local',
                'fallback_reason' => $this->fallbackReason($e),
            ];
        }
    }

    /**
     * @return array{
     *     brief: array{
     *         headline: string,
     *         situation: string,
     *         priorities: list<array{title: string, why: string, action: string}>,
     *         equity: list<array{province: string, signal: string, note: string}>,
     *         risks: list<array{title: string, severity: string, mitigation: string}>,
     *         next_30_days: list<string>,
     *         generated_at: string,
     *         project_count: int
     *     },
     *     source: string,
     *     fallback_reason: string|null
     * }
     */
    public function planningBrief(?string $provinceScope = null): array
    {
        $payload = $this->intelligence->forScope($provinceScope);

        try {
            $systemPrompt = <<<'PROMPT'
You are TARA, a senior portfolio analyst for DOST-MIMAROPA (TARA PAMIMAROPA).
Anyone on the team may read your brief — write for all staff, not only leadership titles.
Ground every claim in the PORTFOLIO INTELLIGENCE SNAPSHOT JSON. Do not invent projects, budgets, or statuses.
Use computed_insights, province_equity, risk_flags, and trends first.
Focus on clear next steps: province balance, status risk, funding concentration, and what to do soon.
Write in plain language. No markdown asterisks.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "headline": "one clear line",
  "situation": "2-4 plain sentences on the portfolio",
  "priorities": [
    {"title": "short title", "why": "why it matters", "action": "concrete next step"}
  ],
  "equity": [
    {"province": "province name", "signal": "under-served|balanced|heavy load", "note": "one sentence"}
  ],
  "risks": [
    {"title": "risk title", "severity": "high|medium|low", "mitigation": "what the team can do"}
  ],
  "next_30_days": ["action 1", "action 2", "action 3"]
}

Rules:
- priorities: 3 to 5 items, ordered by urgency.
- equity: cover all MIMAROPA provinces present in the dataset.
- risks: 2 to 4 items grounded in status or concentration patterns.
- next_30_days: 3 to 5 concrete actions in everyday words.
- Prefer Philippine peso shorthand (e.g. ₱1.2M) when citing money.
PROMPT;

            $contents = [
                [
                    'role' => 'user',
                    'parts' => [[
                        'text' => "Generate a planning brief from this PORTFOLIO INTELLIGENCE SNAPSHOT (JSON):\n".json_encode(
                            $payload,
                            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
                        ),
                    ]],
                ],
            ];

            $text = $this->generate($systemPrompt, $contents, 1100);
            $decoded = $this->decodeJsonObject($text);

            $brief = [
                'headline' => (string) ($decoded['headline'] ?? 'Planning brief'),
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

            return [
                'brief' => $brief,
                'source' => 'gemini',
                'fallback_reason' => null,
            ];
        } catch (Throwable $e) {
            Log::warning('Gemini planning brief failed; using local fallback.', [
                'message' => $e->getMessage(),
            ]);

            return [
                'brief' => $this->fallback->planningBrief($payload),
                'source' => 'local',
                'fallback_reason' => $this->fallbackReason($e),
            ];
        }
    }

    /**
     * @param  array<string, mixed>  $chartContext
     * @return array{
     *     interpretation: array{
     *         headline: string,
     *         summary: string,
     *         findings: list<array{title: string, detail: string}>,
     *         recommendations: list<string>,
     *         generated_at: string
     *     },
     *     source: string,
     *     fallback_reason: string|null
     * }
     */
    public function interpretCharts(array $chartContext, ?string $provinceScope = null): array
    {
        $intelligence = $this->intelligence->forScope($provinceScope);
        // Charts carry series; intelligence adds DB-grounded KPIs for better recommendations.
        $payload = [
            'project_count' => (int) ($intelligence['project_count'] ?? data_get($chartContext, 'stats.total', 0)),
            'total_project_cost' => (float) ($intelligence['total_project_cost'] ?? data_get($chartContext, 'stats.funding', 0)),
            'counts_by_province' => $intelligence['counts_by_province'] ?? [],
            'counts_by_status' => $intelligence['counts_by_status'] ?? [],
            'counts_by_type' => $intelligence['counts_by_type'] ?? [],
            'computed_insights' => $intelligence['computed_insights'] ?? [],
            'risk_flags' => $intelligence['risk_flags'] ?? [],
            'kpis' => $intelligence['kpis'] ?? [],
        ];

        try {
            $systemPrompt = <<<'PROMPT'
You are TARA, a senior analytics advisor for DOST-MIMAROPA staff.
Write for anyone on the team. Do not address a Regional Director or any one title.
Use CHART CONTEXT for what the graphs show, and PORTFOLIO INTELLIGENCE for live DB KPIs, equity, and risks.
Do not invent values. Prefer concrete numbers from those JSON blocks.
Plain language only — no markdown asterisks.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "headline": "one clear line",
  "summary": "2-3 short sentences on what the charts show",
  "findings": [
    {"title": "chart or theme", "detail": "one or two plain sentences with numbers"}
  ],
  "recommendations": ["simple next step 1", "simple next step 2", "simple next step 3"]
}

Rules:
- findings: 3 to 5 items tied to the provided chart series.
- recommendations: 3 to 4 everyday next steps grounded in equity/risk/KPI signals when useful.
- Prefer Philippine peso shorthand when citing money.
- Never mention Gemini, APIs, models, or JSON.
PROMPT;

            $contents = [
                [
                    'role' => 'user',
                    'parts' => [[
                        'text' => "Explain these charts for decision-making.\n\nCHART CONTEXT (JSON):\n".json_encode(
                            $chartContext,
                            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
                        )."\n\nPORTFOLIO INTELLIGENCE (JSON):\n".json_encode(
                            [
                                'kpis' => $payload['kpis'],
                                'computed_insights' => $payload['computed_insights'],
                                'risk_flags' => $payload['risk_flags'],
                                'counts_by_province' => $payload['counts_by_province'],
                                'counts_by_status' => $payload['counts_by_status'],
                            ],
                            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
                        ),
                    ]],
                ],
            ];

            $text = $this->generate($systemPrompt, $contents, 900);
            $decoded = $this->decodeJsonObject($text);

            $interpretation = [
                'headline' => (string) ($decoded['headline'] ?? 'What the charts show'),
                'summary' => (string) ($decoded['summary'] ?? ''),
                'findings' => $this->normalizeList($decoded['findings'] ?? [], ['title', 'detail']),
                'recommendations' => array_values(array_filter(array_map(
                    static fn ($item): string => trim((string) $item),
                    is_array($decoded['recommendations'] ?? null) ? $decoded['recommendations'] : [],
                ))),
                'generated_at' => now()->toIso8601String(),
            ];

            return [
                'interpretation' => $interpretation,
                'source' => 'gemini',
                'fallback_reason' => null,
            ];
        } catch (Throwable $e) {
            Log::warning('Gemini chart interpret failed; using local fallback.', [
                'message' => $e->getMessage(),
            ]);

            return [
                'interpretation' => $this->fallback->interpretCharts($chartContext, $payload),
                'source' => 'local',
                'fallback_reason' => $this->fallbackReason($e),
            ];
        }
    }

    /**
     * @param  list<array{role: string, parts: list<array{text: string}>}>  $contents
     */
    private function generate(string $systemPrompt, array $contents, int $maxOutputTokens = 1100): string
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
                ->connectTimeout(3)
                ->timeout(22)
                ->post($url, [
                    'system_instruction' => [
                        'parts' => [['text' => $systemPrompt]],
                    ],
                    'contents' => $contents,
                    'generationConfig' => [
                        'temperature' => 0.2,
                        'maxOutputTokens' => $maxOutputTokens,
                    ],
                ])
                ->throw()
                ->json();
        } catch (ConnectionException $e) {
            report($e);

            throw new RuntimeException(
                'Could not reach Gemini. Network unavailable.',
                previous: $e,
            );
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

    private function fallbackReason(Throwable $e): string
    {
        Log::debug('TARA AI fallback reason', ['message' => $e->getMessage()]);

        return 'Used a quick summary so you do not wait.';
    }

    private function sanitizePublicReply(string $text): string
    {
        $cleaned = trim($text);
        $cleaned = preg_replace('/\b(Gemini|Google AI|OpenAI|ChatGPT|GPT-4|GPT-3\.5|API key|language model)\b/iu', 'TARA', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\b(as an AI|I am an AI|I\'m an AI)\b/iu', 'As TARA', $cleaned) ?? $cleaned;

        // Strip markdown so chat UI never shows raw * / ** / # / backticks.
        $cleaned = preg_replace('/```[\s\S]*?```/', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/`([^`]+)`/', '$1', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\*\*(.+?)\*\*/u', '$1', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/__(.+?)__/u', '$1', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/(?<!\w)\*(.+?)\*(?!\w)/u', '$1', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/(?<!\w)_(.+?)_(?!\w)/u', '$1', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/^#{1,6}\s*/mu', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/^\s*>\s?/mu', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/\[([^\]]+)\]\(([^)]+)\)/', '$1', $cleaned) ?? $cleaned;
        $cleaned = str_replace(['*', '_', '`'], '', $cleaned);
        $cleaned = preg_replace("/[ \t]+\n/", "\n", $cleaned) ?? $cleaned;
        $cleaned = preg_replace("/\n{3,}/", "\n\n", $cleaned) ?? $cleaned;

        return trim($cleaned);
    }

    private function systemPrompt(?string $provinceScope): string
    {
        $scope = $provinceScope
            ? "Live TARA records are scoped to PSTO province: {$provinceScope}."
            : 'Live TARA records cover the full MIMAROPA portfolio.';

        return <<<PROMPT
You are TARA, a senior analytics advisor for DOST-MIMAROPA project monitoring (TARA PAMIMAROPA).
{$scope}
You think like an enterprise operations analyst: read the numbers first, then recommend action.
Speak to any staff member. Never address only one title.

You receive a PORTFOLIO INTELLIGENCE SNAPSHOT built from the live database (KPIs, province equity, status/type mixes, year trends, risk flags, computed insights, and top-cost project samples).

ALWAYS answer the user's question.
Grounding rules:
1) Prefer computed_insights, kpis, province_equity, trends, and risk_flags as primary evidence.
2) When citing figures, use the snapshot numbers (counts, pesos, percentages, years). Do not invent project rows, codes, budgets, or statuses.
3) For future strategy (2026/2027/roadmap), extrapolate from equity gaps, status pressure, funding concentration, and year trends. Mark those as planning suggestions, not recorded facts.
4) If asking about a specific project, use top_projects_by_cost / sample only when it matches; otherwise say it is outside the top-cost sample and answer from aggregates.

Answer style (enterprise-grade, still plain language):
- Lead with the decision or insight.
- Support with 1-3 concrete numbers from the snapshot.
- End with a practical next step or one clarifying question when useful.
- Plain text only. No markdown asterisks (* or **), no backticks, no # headings.
- Numbered points as "1. Title: detail" when listing priorities.

Never mention Gemini, Google, OpenAI, APIs, models, prompts, JSON, or that you are an AI language model.
Do not open with capability menus.
Keep answers under ~200 words unless the user asks for more detail.
PROMPT;
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
            throw new RuntimeException('AI returned text that could not be parsed.');
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
}
