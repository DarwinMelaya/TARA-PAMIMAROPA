<?php

use App\Enums\UserRole;
use App\Models\Project;
use App\Models\User;

test('chart interpretation falls back locally when gemini is not configured', function () {
    config(['services.gemini.key' => null]);

    $user = User::factory()->create([
        'role' => UserRole::RegionalOffice,
        'province' => null,
    ]);

    Project::query()->create([
        'code' => 'AI-CHART-001',
        'name' => 'Chart Interpret Project',
        'type' => 'SETUP',
        'year_approved' => 2024,
        'beneficiary' => 'Test Coop',
        'sector' => 'Food Processing',
        'province' => 'Romblon',
        'city' => 'Romblon',
        'status' => 'On-going',
        'project_cost' => 250000,
    ]);

    $this->actingAs($user)
        ->postJson(route('region.analytics-chart-interpret'), [
            'view' => 'region',
            'context_label' => 'MIMAROPA',
            'year' => null,
            'stats' => ['total' => 1, 'funding' => 250000],
            'charts' => [
                [
                    'title' => 'Projects per province',
                    'format' => 'number',
                    'rows' => [
                        ['label' => 'Romblon', 'value' => 1],
                    ],
                ],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('source', 'local')
        ->assertJsonStructure([
            'interpretation' => [
                'headline',
                'summary',
                'findings',
                'recommendations',
                'generated_at',
            ],
            'source',
            'fallback_reason',
        ]);
});

test('analytics chat falls back locally when gemini is not configured', function () {
    config(['services.gemini.key' => null]);

    $user = User::factory()->create([
        'role' => UserRole::RegionalOffice,
        'province' => null,
    ]);

    Project::query()->create([
        'code' => 'AI-CHAT-001',
        'name' => 'Chat Fallback Project',
        'type' => 'GIA',
        'year_approved' => 2023,
        'beneficiary' => 'Test LGU',
        'sector' => 'Agriculture',
        'province' => 'Palawan',
        'city' => 'Puerto Princesa',
        'status' => 'On-going',
        'project_cost' => 100000,
    ]);

    $this->actingAs($user)
        ->postJson(route('analytics-chat'), [
            'message' => 'How many projects by province?',
            'audience' => 'regional_director',
        ])
        ->assertOk()
        ->assertJsonPath('source', 'local')
        ->assertJsonStructure(['reply', 'source', 'fallback_reason']);
});
