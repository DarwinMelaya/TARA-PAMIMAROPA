<?php

use App\Enums\UserRole;
use App\Models\Project;
use App\Models\User;

test('regional office dashboard receives database projects', function () {
    $user = User::factory()->create([
        'role' => UserRole::RegionalOffice,
        'province' => null,
    ]);

    Project::query()->create([
        'code' => 'QR-DASH-001',
        'name' => 'Dashboard Feed Project',
        'type' => 'SETUP',
        'year_approved' => 2020,
        'beneficiary' => 'Test Coop',
        'sector' => 'Food Processing',
        'province' => 'Romblon',
        'city' => 'Romblon',
        'status' => 'On-going',
        'project_cost' => 500000,
    ]);

    $this->actingAs($user)
        ->get(route('region.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('region/RegionDashboard')
            ->has('projects', 1)
            ->where('projects.0.code', 'QR-DASH-001')
            ->where('projects.0.province', 'Romblon'));
});
