<?php

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
            Route::inertia('/', 'region/RegionDashboard')->name('dashboard');
            Route::inertia('/programs', 'region/RegionPrograms')->name('programs');
        });
});

require __DIR__.'/settings.php';
