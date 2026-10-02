<?php

use App\Enums\Province;
use App\Enums\UserRole;
use App\Models\Project;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('psto summary graphs only receive projects from the psto province', function () {
    [$own, $other] = Province::cases();

    $user = User::factory()->create([
        'role' => UserRole::Psto,
        'province' => $own,
    ]);

    Project::query()->create(['name' => 'Own Project', 'province' => $own->value, 'city' => 'Town A', 'barangay' => 'Poblacion']);
    Project::query()->create(['name' => 'Other Project', 'province' => $other->value]);

    $this->actingAs($user)
        ->get(route('psto.programs.summary-graphs'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('psto/PstoSummaryGraphs')
            ->where('lockedProvince', $own->value)
            ->has('projects', 1)
            ->where('projects.0.name', 'Own Project')
            ->where('projects.0.barangay', 'Poblacion'));
});

test('regional office cannot open psto summary graphs', function () {
    $user = User::factory()->create([
        'role' => UserRole::RegionalOffice,
        'province' => null,
    ]);

    $this->actingAs($user)
        ->get(route('psto.programs.summary-graphs'))
        ->assertForbidden();
});
