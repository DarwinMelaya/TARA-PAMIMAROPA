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
    public function reply(string $message, array $history = [], ?string $provinceScope = null): string
    {
        $apiKey = config('services.gemini.key');

        if (! filled($apiKey)) {
            throw new RuntimeException(
                'Gemini is not configured. Set GEMINI_API_KEY in your .env file.',
            );
        }

        $projects = Project::query()
            ->when(
                filled($provinceScope),
                fn ($query) => $query->where('province', $provinceScope),
            )
            ->orderBy('province')
            ->orderBy('name')
            ->get();

        $payload = $this->buildDataset($projects);
        $model = (string) config('services.gemini.model', 'gemini-2.5-flash');
        $url = sprintf(
            'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent',
            rawurlencode($model),
        );

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

        $systemPrompt = $this->systemPrompt($provinceScope)."\n\nLIVE PROJECT DATASET (JSON):\n".json_encode(
            $payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        );

        try {
            $response = Http::acceptJson()
                ->timeout(90)
                ->withQueryParameters(['key' => (string) $apiKey])
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

    private function systemPrompt(?string $provinceScope): string
    {
        $scope = $provinceScope
            ? "You only have data for the PSTO province: {$provinceScope}."
            : 'You have the full MIMAROPA project portfolio from the TARA database.';

        return <<<PROMPT
You are TARA AI Analytics for DOST-MIMAROPA (TARA PAMIMAROPA).
{$scope}

Rules:
- Answer ONLY using the LIVE PROJECT DATASET JSON provided in this conversation.
- If the dataset does not contain enough information, say what is missing. Do not invent projects, budgets, or statuses.
- Be concise and useful for executives and field officers (short paragraphs or tight bullet lists).
- Prefer Philippine peso formatting when talking about money (e.g. ₱1.2M).
- When listing projects, include code (if any), province, status, and project cost when available.
- Status labels in the data are the real Excel/DB labels (On-going, Graduated, Terminated, etc.).
PROMPT;
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
