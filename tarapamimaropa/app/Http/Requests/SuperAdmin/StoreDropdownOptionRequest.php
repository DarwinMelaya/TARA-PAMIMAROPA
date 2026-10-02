<?php

namespace App\Http\Requests\SuperAdmin;

use App\Enums\DropdownCategory;
use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDropdownOptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::SuperAdmin;
    }

    protected function prepareForValidation(): void
    {
        $color = trim((string) $this->input('color'));

        $this->merge([
            'label' => trim((string) $this->input('label')),
            'color' => $color === '' ? null : strtolower($color),
        ]);
    }

    /**
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    public function rules(): array
    {
        return [
            'category' => ['required', 'string', Rule::enum(DropdownCategory::class)],
            'label' => [
                'required',
                'string',
                'max:255',
                Rule::unique('dropdown_options', 'label')
                    ->where('category', $this->input('category')),
            ],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-f]{6}$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'label.unique' => __('This option already exists.'),
            'color.regex' => __('Pick a color in #RRGGBB format.'),
        ];
    }
}
