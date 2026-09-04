<?php

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
            Route::inertia('/users', 'superadmin/SuperAdminUsers')->name('users');
        });
});

require __DIR__.'/settings.php';
