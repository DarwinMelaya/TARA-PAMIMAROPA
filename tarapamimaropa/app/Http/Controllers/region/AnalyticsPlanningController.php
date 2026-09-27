<?php

namespace App\Http\Controllers\Region;

use App\Http\Controllers\Controller;
use App\Services\GeminiAnalyticsChatService;
use Illuminate\Http\JsonResponse;

class AnalyticsPlanningController extends Controller
{
    public function store(GeminiAnalyticsChatService $chat): JsonResponse
    {
        $result = $chat->planningBrief();

        return response()->json([
            'brief' => $result['brief'],
            'source' => $result['source'],
            'fallback_reason' => $result['fallback_reason'],
        ]);
    }
}
