<?php

namespace App\Http\Requests\Region;

use App\Enums\UserRole;
use App\Services\SummaryReportExcelExporter;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExportSummaryReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::RegionalOffice;
    }

    /**
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'scope_label' => ['required', 'string', 'max:150'],
            'stats' => ['present', 'array', 'max:12'],
            'stats.*.label' => ['required', 'string', 'max:60'],
            'stats.*.value' => ['required', 'string', 'max:60'],
            'sections' => ['present', 'array', 'max:20'],
            'sections.*.title' => ['required', 'string', 'max:120'],
            'sections.*.chart' => ['required', Rule::in(SummaryReportExcelExporter::CHART_TYPES)],
            'sections.*.format' => ['required', Rule::in(['number', 'peso'])],
            'sections.*.rows' => ['required', 'array', 'min:1', 'max:100'],
            'sections.*.rows.*.label' => ['required', 'string', 'max:150'],
            'sections.*.rows.*.value' => ['required', 'numeric'],
            'sections.*.rows.*.color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'project_ids' => ['nullable', 'array'],
            'project_ids.*' => ['integer'],
        ];
    }
}
