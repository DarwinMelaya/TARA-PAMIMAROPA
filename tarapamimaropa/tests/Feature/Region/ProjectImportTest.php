<?php

use App\Enums\UserRole;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\UploadedFile;

test('regional office can view programs page with projects', function () {
    $user = User::factory()->create([
        'role' => UserRole::RegionalOffice,
        'province' => null,
    ]);

    Project::query()->create([
        'code' => 'QR-TEST-001',
        'name' => 'Test Cashew Project',
        'type' => 'SETUP',
        'year_approved' => 2017,
        'beneficiary' => 'Test Coop',
        'sector' => 'Food Processing',
        'province' => 'Palawan',
        'city' => 'Roxas',
        'district' => '1st',
        'status' => 'On-going',
        'project_cost' => 3000000,
    ]);

    $this->actingAs($user)
        ->get(route('region.programs'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('region/RegionPrograms')
            ->has('projects', 1)
            ->where('projects.0.code', 'QR-TEST-001'));
});

test('regional office can import excel projects', function () {
    $user = User::factory()->create([
        'role' => UserRole::RegionalOffice,
        'province' => null,
    ]);

    $path = public_path('List of projects.xlsx');
    expect(file_exists($path))->toBeTrue();

    $upload = new UploadedFile(
        $path,
        'List of projects.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        null,
        true,
    );

    $this->actingAs($user)
        ->post(route('region.programs.import'), [
            'file' => $upload,
        ])
        ->assertRedirect(route('region.programs'));

    expect(Project::query()->count())->toBeGreaterThan(100);
    expect(Project::query()->where('code', 'QR-TTC-C5-1-17-0391')->exists())->toBeTrue();
});
