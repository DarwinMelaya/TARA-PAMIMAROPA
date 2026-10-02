<?php

use App\Enums\Province;
use App\Enums\UserRole;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('psto can create a project with a short description and pictures', function () {
    Storage::fake('public');

    $user = User::factory()->create([
        'role' => UserRole::Psto,
        'province' => Province::cases()[0],
    ]);

    $this->actingAs($user)
        ->post(route('psto.projects.store'), [
            'name' => 'Photo Project',
            'short_description' => 'Solar dryer for coffee farmers.',
            'images' => [
                UploadedFile::fake()->image('one.jpg'),
                UploadedFile::fake()->image('two.png'),
            ],
        ])
        ->assertRedirect(route('psto.programs'))
        ->assertSessionHasNoErrors();

    $project = Project::query()->where('name', 'Photo Project')->firstOrFail();

    expect($project->short_description)->toBe('Solar dryer for coffee farmers.')
        ->and($project->images)->toHaveCount(2);

    foreach ($project->images as $path) {
        Storage::disk('public')->assertExists($path);
    }

    expect($project->toTaraArray()['photo_url'])->toBe(Storage::disk('public')->url($project->images[0]));
});

test('project pictures must be images', function () {
    Storage::fake('public');

    $user = User::factory()->create([
        'role' => UserRole::Psto,
        'province' => Province::cases()[0],
    ]);

    $this->actingAs($user)
        ->post(route('psto.projects.store'), [
            'name' => 'Bad Upload',
            'images' => [UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf')],
        ])
        ->assertSessionHasErrors('images.0');

    expect(Project::query()->where('name', 'Bad Upload')->exists())->toBeFalse();
});
