<?php

namespace App\Http\Requests\Psto;

use App\Enums\Province;
use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->role === UserRole::Psto
            && filled($user->province?->value);
    }

    protected function prepareForValidation(): void
    {
        $nullable = [
            'code',
            'type',
            'beneficiary',
            'collaborators',
            'sector',
            'city',
            'district',
            'status',
            'row_number',
            'year_approved',
            'project_cost',
            'amount_due',
            'refunded',
            'refund_rate',
        ];

        $payload = [];
        foreach ($nullable as $field) {
            if ($this->exists($field) && $this->input($field) === '') {
                $payload[$field] = null;
            }
        }

        if ($payload !== []) {
            $this->merge($payload);
        }
    }

    /**
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:255', 'unique:projects,code'],
            'type' => ['nullable', 'string', 'max:255'],
            'year_approved' => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'beneficiary' => ['nullable', 'string', 'max:500'],
            'collaborators' => ['nullable', 'string', 'max:2000'],
            'sector' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'district' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'max:255'],
            'row_number' => ['nullable', 'integer', 'min:1'],
            'project_cost' => ['nullable', 'numeric', 'min:0'],
            'amount_due' => ['nullable', 'numeric', 'min:0'],
            'refunded' => ['nullable', 'numeric', 'min:0'],
            'refund_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'province' => [
                'sometimes',
                'string',
                Rule::enum(Province::class),
                Rule::in([$this->user()?->province?->value]),
            ],
        ];
    }
}
