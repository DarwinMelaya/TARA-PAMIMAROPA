<?php

use App\Enums\DropdownCategory;
use App\Enums\UserRole;
use App\Models\DropdownOption;
use App\Models\Project;
use App\Models\User;

function superAdmin(): User
{
    return User::factory()->create(['role' => UserRole::SuperAdmin, 'province' => null]);
}

function makeProject(array $attributes = []): Project
{
    return Project::query()->create(array_merge([
        'code' => 'DD-TEST-001',
        'name' => 'Dropdown Test Project',
        'type' => 'SETUP',
        'year_approved' => 2024,
        'beneficiary' => 'Test Coop',
        'sector' => 'Agriculture',
        'province' => 'Palawan',
        'city' => 'Roxas',
        'district' => '1st',
        'status' => 'On-going',
        'project_cost' => 1000000,
    ], $attributes));
}

test('super admin sees type and sector options with project counts', function () {
    makeProject();

    $this->actingAs(superAdmin())
        ->get(route('superadmin.settings.dropdowns'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/DropdownManagement')
            ->has('categories', 2)
            ->where('categories.0.value', 'type')
            ->where('categories.1.value', 'sector'));
});

test('super admin can add an option', function () {
    $this->actingAs(superAdmin())
        ->post(route('superadmin.settings.dropdowns.store'), [
            'category' => 'sector',
            'label' => '  Health  ',
        ])
        ->assertRedirect(route('superadmin.settings.dropdowns'));

    expect(DropdownOption::labels(DropdownCategory::Sector))->toContain('Health');
});

test('duplicate options are rejected within a category', function () {
    $this->actingAs(superAdmin())
        ->post(route('superadmin.settings.dropdowns.store'), [
            'category' => 'type',
            'label' => 'SETUP',
        ])
        ->assertSessionHasErrors('label');
});

test('renaming an option renames matching projects', function () {
    $project = makeProject(['sector' => 'Agriculture']);
    $option = DropdownOption::query()
        ->where('category', 'sector')
        ->where('label', 'Agriculture')
        ->firstOrFail();

    $this->actingAs(superAdmin())
        ->put(route('superadmin.settings.dropdowns.update', $option), [
            'label' => 'Agri-Food',
        ])
        ->assertRedirect(route('superadmin.settings.dropdowns'));

    expect($option->fresh()->label)->toBe('Agri-Food')
        ->and($project->fresh()->sector)->toBe('Agri-Food');
});

test('removing an option keeps existing project values', function () {
    $project = makeProject(['sector' => 'Agriculture']);
    $option = DropdownOption::query()
        ->where('category', 'sector')
        ->where('label', 'Agriculture')
        ->firstOrFail();

    $this->actingAs(superAdmin())
        ->delete(route('superadmin.settings.dropdowns.destroy', $option))
        ->assertRedirect(route('superadmin.settings.dropdowns'));

    expect(DropdownOption::query()->find($option->id))->toBeNull()
        ->and($project->fresh()->sector)->toBe('Agriculture');
});

test('type and sector options store a color', function () {
    $admin = superAdmin();

    $this->actingAs($admin)
        ->post(route('superadmin.settings.dropdowns.store'), [
            'category' => 'type',
            'label' => 'iFWD',
            'color' => '#B91C1C',
        ])
        ->assertRedirect(route('superadmin.settings.dropdowns'));

    $this->actingAs($admin)
        ->post(route('superadmin.settings.dropdowns.store'), [
            'category' => 'sector',
            'label' => 'Health',
            'color' => '#b91c1c',
        ]);

    expect(DropdownOption::colors(DropdownCategory::Type))->toHaveKey('iFWD', '#b91c1c')
        ->and(DropdownOption::colors(DropdownCategory::Sector))->toHaveKey('Health', '#b91c1c');
});

test('invalid colors are rejected', function () {
    $option = DropdownOption::query()->where('category', 'type')->firstOrFail();

    $this->actingAs(superAdmin())
        ->put(route('superadmin.settings.dropdowns.update', $option), [
            'label' => $option->label,
            'color' => 'red',
        ])
        ->assertSessionHasErrors('color');
});

test('type colors are shared with every page', function () {
    $this->get(route('home'))
        ->assertInertia(fn ($page) => $page
            ->where('typeColors.SETUP', '#16823c')
            ->where('sectorColors.Agriculture', '#4d7c0f'));
});

test('non super admins cannot manage dropdown options', function () {
    $user = User::factory()->create(['role' => UserRole::RegionalOffice, 'province' => null]);

    $this->actingAs($user)
        ->post(route('superadmin.settings.dropdowns.store'), [
            'category' => 'type',
            'label' => 'New Type',
        ])
        ->assertForbidden();
});
