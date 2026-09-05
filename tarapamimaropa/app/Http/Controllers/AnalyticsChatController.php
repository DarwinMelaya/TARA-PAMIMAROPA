<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\AnalyticsChatRequest;
use App\Services\OpenAiAnalyticsChatService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class AnalyticsChatController extends Controller
{
    public function store(
        AnalyticsChatRequest $request,
        OpenAiAnalyticsChatService $chat,
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

        try {
            $reply = $chat->reply(
                message: $request->string('message')->toString(),
                history: $request->input('history', []),
                provinceScope: $provinceScope,
            );
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'reply' => $reply,
        ]);
    }
}
