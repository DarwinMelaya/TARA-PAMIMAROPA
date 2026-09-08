<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\AnalyticsChatRequest;
use App\Services\GeminiAnalyticsChatService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

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

        $audience = $user?->role === UserRole::RegionalOffice
            ? 'regional_director'
            : (string) $request->input('audience', 'general');

        try {
            $reply = $chat->reply(
                message: $request->string('message')->toString(),
                history: $request->input('history', []),
                provinceScope: $provinceScope,
                audience: $audience === 'regional_director' ? 'regional_director' : 'general',
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
