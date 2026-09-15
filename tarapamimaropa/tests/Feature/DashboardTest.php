<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users are redirected from dashboard to their role home', function () {
    $user = User::factory()->create([
        'role' => \App\Enums\UserRole::RegionalOffice,
    ]);
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('region.dashboard', absolute: false));
});

test('authenticated users visiting login are redirected to their role home', function () {
    $user = User::factory()->create([
        'role' => \App\Enums\UserRole::RegionalOffice,
    ]);
    $this->actingAs($user);

    $response = $this->get(route('login'));
    $response->assertRedirect(route('region.dashboard', absolute: false));
});
