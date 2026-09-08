<?php

namespace App\Http\Controllers\Region;

use App\Http\Controllers\Controller;
use App\Services\GeminiAnalyticsChatService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class AnalyticsPlanningController extends Controller
{
    public function store(GeminiAnalyticsChatService $chat): JsonResponse
    {
        try {
            $brief = $chat->planningBrief();
        } catch (RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'brief' => $brief,
        ]);
    }
}
