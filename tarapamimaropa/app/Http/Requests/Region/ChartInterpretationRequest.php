<?php

namespace App\Http\Requests\Region;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ChartInterpretationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        return [
            'view' => ['required', 'string', 'in:region,province,municipality,program'],
            'context_label' => ['required', 'string', 'max:120'],
            'year' => ['nullable', 'string', 'max:12'],
            'stats' => ['nullable', 'array'],
            'stats.total' => ['nullable', 'numeric'],
            'stats.funding' => ['nullable', 'numeric'],
            'stats.beneficiaries' => ['nullable', 'numeric'],
            'stats.active' => ['nullable', 'numeric'],
            'stats.completed' => ['nullable', 'numeric'],
            'charts' => ['required', 'array', 'min:1', 'max:12'],
            'charts.*.title' => ['required', 'string', 'max:120'],
            'charts.*.format' => ['nullable', 'string', 'in:number,peso,compact'],
            'charts.*.rows' => ['required', 'array', 'max:40'],
            'charts.*.rows.*.label' => ['required', 'string', 'max:120'],
            'charts.*.rows.*.value' => ['required', 'numeric'],
        ];
    }
}
