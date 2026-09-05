<?php

use App\Http\Controllers\Psto\ProgramController as PstoProgramController;
use App\Http\Controllers\Region\DashboardController;
use App\Http\Controllers\Region\ProgramController;
use App\Http\Controllers\SuperAdmin\UserController;
use Illuminate\Support\Facades\Route;

// Public Routes
Route::inertia('/', 'public/LandingPage')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::middleware(['role:super_admin'])
        ->prefix('superadmin')
        ->name('superadmin.')
        ->group(function () {
            Route::inertia('/', 'superadmin/SuperAdminDashboard')->name('dashboard');

            Route::get('/users', [UserController::class, 'index'])->name('users');
            Route::post('/users', [UserController::class, 'store'])->name('users.store');
            Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
        });

    Route::middleware(['role:regional_office'])
        ->prefix('region')
        ->name('region.')
        ->group(function () {
            Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
            Route::get('/programs', [ProgramController::class, 'index'])->name('programs');
            Route::post('/programs/import', [ProgramController::class, 'import'])->name('programs.import');
        });

    Route::middleware(['role:psto'])
        ->prefix('psto')
        ->name('psto.')
        ->group(function () {
            Route::inertia('/', 'psto/PstoDashboard')->name('dashboard');
            Route::get('/programs', [PstoProgramController::class, 'index'])->name('programs');
        });
});

require __DIR__.'/settings.php';
