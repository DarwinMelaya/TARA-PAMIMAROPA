<?php

use App\Http\Controllers\AnalyticsChatController;
use App\Http\Controllers\ProjectDashboardStreamController;
use App\Http\Controllers\Psto\DashboardController as PstoDashboardController;
use App\Http\Controllers\Psto\ProgramController as PstoProgramController;
use App\Http\Controllers\Psto\ProjectController as PstoProjectController;
use App\Http\Controllers\Region\AnalyticsPlanningController;
use App\Http\Controllers\Region\ChartInterpretationController;
use App\Http\Controllers\Region\DashboardController;
use App\Http\Controllers\Region\ProgramController;
use App\Http\Controllers\Region\SummaryReportController;
use App\Http\Controllers\Site\HomeController;
use App\Http\Controllers\SuperAdmin\DropdownOptionController;
use App\Http\Controllers\SuperAdmin\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public Routes
Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/projects/dashboard-stream', ProjectDashboardStreamController::class)
    ->middleware('throttle:120,1')
    ->name('projects.dashboard-stream');
Route::post('/analytics-chat', [AnalyticsChatController::class, 'store'])
    ->middleware('throttle:30,1')
    ->name('analytics-chat');

Route::middleware(['auth', 'verified'])->group(function () {
    // Legacy /dashboard → bounce each role to its real home (avoids skeleton page).
    Route::get('/dashboard', function (Request $request) {
        return redirect()->route($request->user()->homeRouteName());
    })->name('dashboard');

    Route::middleware(['role:super_admin'])
        ->prefix('superadmin')
        ->name('superadmin.')
        ->group(function () {
            Route::inertia('/', 'superadmin/SuperAdminDashboard')->name('dashboard');

            Route::get('/users', [UserController::class, 'index'])->name('users');
            Route::post('/users', [UserController::class, 'store'])->name('users.store');
            Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');

            Route::get('/settings/dropdowns', [DropdownOptionController::class, 'index'])->name('settings.dropdowns');
            Route::post('/settings/dropdowns', [DropdownOptionController::class, 'store'])->name('settings.dropdowns.store');
            Route::put('/settings/dropdowns/{dropdownOption}', [DropdownOptionController::class, 'update'])->name('settings.dropdowns.update');
            Route::delete('/settings/dropdowns/{dropdownOption}', [DropdownOptionController::class, 'destroy'])->name('settings.dropdowns.destroy');
        });

    Route::middleware(['role:regional_office'])
        ->prefix('region')
        ->name('region.')
        ->group(function () {
            Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
            Route::post('/analytics-planning-brief', [AnalyticsPlanningController::class, 'store'])
                ->middleware('throttle:12,1')
                ->name('analytics-planning-brief');
            Route::post('/analytics-chart-interpret', [ChartInterpretationController::class, 'store'])
                ->middleware('throttle:20,1')
                ->name('analytics-chart-interpret');
            Route::get('/programs', [ProgramController::class, 'index'])->name('programs');
            Route::get('/programs/summary-graphs', [ProgramController::class, 'summaryGraphs'])->name('programs.summary-graphs');
            Route::post('/programs/summary-graphs/export', SummaryReportController::class)
                ->middleware('throttle:20,1')
                ->name('programs.summary-graphs.export');
            Route::post('/programs/import', [ProgramController::class, 'import'])->name('programs.import');
            Route::get('/programs/export-template', [ProgramController::class, 'exportTemplate'])->name('programs.export-template');
        });

    Route::middleware(['role:psto'])
        ->prefix('psto')
        ->name('psto.')
        ->group(function () {
            Route::get('/', [PstoDashboardController::class, 'index'])->name('dashboard');
            Route::get('/programs', [PstoProgramController::class, 'index'])->name('programs');
            Route::get('/programs/summary-graphs', [PstoProgramController::class, 'summaryGraphs'])->name('programs.summary-graphs');
            Route::post('/programs/import', [PstoProgramController::class, 'import'])->name('programs.import');
            Route::get('/programs/export', [PstoProgramController::class, 'export'])->name('programs.export');
            Route::get('/programs/export-template', [PstoProgramController::class, 'exportTemplate'])->name('programs.export-template');
            Route::post('/projects', [PstoProjectController::class, 'store'])->name('projects.store');
            Route::put('/projects/{project}', [PstoProjectController::class, 'update'])->name('projects.update');
        });
});

require __DIR__.'/settings.php';
