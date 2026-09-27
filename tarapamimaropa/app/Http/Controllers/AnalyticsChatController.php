<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\AnalyticsChatRequest;
use App\Services\GeminiAnalyticsChatService;
use Illuminate\Http\JsonResponse;

class AnalyticsChatController extends Controller
{
    public function store(
        AnalyticsChatRequest $request,
        GeminiAnalyticsChatService $chat,
    ): JsonResponse {
        $user = $request->user();
        $provinceScope = null;

        if ($user?->role === UserRole::Psto) {
            $provinceScope = $user->province?->value;

            if (! filled($provinceScope)) {
                return response()->json([
                    'message' => 'This PSTO account has no province assigned.',
                ], 403);
            }
        }

        $result = $chat->reply(
            message: $request->string('message')->toString(),
            history: $request->input('history', []),
            provinceScope: $provinceScope,
            audience: 'general',
        );

        return response()->json([
            'reply' => $result['reply'],
            'source' => $result['source'],
            'fallback_reason' => $result['fallback_reason'],
        ]);
    }
}
