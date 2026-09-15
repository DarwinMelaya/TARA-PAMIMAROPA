<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Cursor-paginated dashboard project stream (Medium large-DB pattern).
 * Client appends pages so Inertia never ships millions of rows at once.
 */
class ProjectDashboardStreamController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', Project::DASHBOARD_PAGE_SIZE);
        $cursor = $request->query('cursor');
        $province = $request->query('province');

        $user = $request->user();
        if ($user?->role === UserRole::Psto) {
            $province = $user->province?->value;
        }

        $page = Project::dashboardCursorPage(
            filled($province) ? (string) $province : null,
            is_string($cursor) && $cursor !== '' ? $cursor : null,
            $perPage,
        );

        return response()->json($page);
    }
}
