<?php

namespace App\Http\Controllers\Region;

use App\Http\Controllers\Controller;
use App\Http\Requests\Region\ChartInterpretationRequest;
use App\Services\GeminiAnalyticsChatService;
use Illuminate\Http\JsonResponse;

class ChartInterpretationController extends Controller
{
    public function store(
        ChartInterpretationRequest $request,
        GeminiAnalyticsChatService $chat,
    ): JsonResponse {
        $result = $chat->interpretCharts($request->validated());

        return response()->json([
            'interpretation' => $result['interpretation'],
            'source' => $result['source'],
            'fallback_reason' => $result['fallback_reason'],
        ]);
    }
}
