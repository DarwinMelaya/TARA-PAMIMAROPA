<?php

use Illuminate\Support\Facades\Route;

// Public Routes
Route::inertia('/', 'public/LandingPage')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
