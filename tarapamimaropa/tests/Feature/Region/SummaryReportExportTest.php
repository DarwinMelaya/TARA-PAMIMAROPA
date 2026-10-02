<?php

use App\Enums\Province;
use App\Enums\UserRole;
use App\Models\Project;
use App\Models\User;
use App\Services\SummaryReportExcelExporter;

function summaryReportPayload(array $overrides = []): array
{
    return [
        'title' => 'Summary graphs report',
        'scope_label' => 'MIMAROPA · All years',
        'stats' => [
            ['label' => 'Total projects', 'value' => '2'],
            ['label' => 'Total funding', 'value' => '₱350,000.00'],
        ],
        'sections' => [
            [
                'title' => 'Projects per province',
                'chart' => 'bar',
                'format' => 'number',
                'rows' => [
                    ['label' => 'Romblon', 'value' => 1, 'color' => '#67e8f9'],
                    ['label' => 'Palawan', 'value' => 1, 'color' => '#2dd4bf'],
                ],
            ],
            [
                'title' => 'Implementation status',
                'chart' => 'donut',
                'format' => 'number',
                'rows' => [
                    ['label' => 'Ongoing', 'value' => 2, 'color' => '#3b82f6'],
                ],
            ],
        ],
        ...$overrides,
    ];
}

test('regional office downloads summary report workbook', function () {
    $user = User::factory()->create(['role' => UserRole::RegionalOffice, 'province' => null]);

    $project = Project::query()->create([
        'name' => 'Report Project',
        'province' => 'Romblon',
        'city' => 'Odiongan',
        'project_cost' => 250000,
    ]);

    $response = $this->actingAs($user)
        ->postJson(route('region.programs.summary-graphs.export'), summaryReportPayload([
            'project_ids' => [$project->id],
        ]));

    $response->assertOk();
    expect($response->headers->get('content-disposition'))->toContain('.xlsx');
});

test('summary report workbook has charts and project sheet', function () {
    $project = Project::query()->create(['name' => 'Sheet Project', 'province' => 'Palawan']);

    $spreadsheet = app(SummaryReportExcelExporter::class)->build(summaryReportPayload([
        'project_ids' => [$project->id],
    ]));

    $report = $spreadsheet->getSheetByName('Report');

    expect($report->getChartCount())->toBe(2)
        ->and($report->getCell('A1')->getValue())->toBe('Summary graphs report')
        ->and($spreadsheet->getSheetByName('Projects')->getCell('B2')->getValue())->toBe('Sheet Project');
});

test('psto cannot export the regional summary report', function () {
    $user = User::factory()->create(['role' => UserRole::Psto, 'province' => Province::cases()[0]]);

    $this->actingAs($user)
        ->postJson(route('region.programs.summary-graphs.export'), summaryReportPayload())
        ->assertForbidden();
});

test('summary report rejects unknown chart types', function () {
    $user = User::factory()->create(['role' => UserRole::RegionalOffice, 'province' => null]);

    $payload = summaryReportPayload();
    $payload['sections'][0]['chart'] = 'radar';

    $this->actingAs($user)
        ->postJson(route('region.programs.summary-graphs.export'), $payload)
        ->assertJsonValidationErrors('sections.0.chart');
});
