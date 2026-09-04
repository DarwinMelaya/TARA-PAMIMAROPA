<?php

namespace App\Concerns;

use App\Enums\Province;
use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait ProvinceValidationRules
{
    /**
     * Province is required only for PSTO accounts.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function provinceRules(): array
    {
        return [
            'province' => [
                Rule::requiredIf(
                    fn (): bool => $this->input('role') === UserRole::Psto->value,
                ),
                'nullable',
                'string',
                Rule::enum(Province::class),
            ],
        ];
    }

    protected function normalizeProvinceForRole(): void
    {
        if ($this->input('role') !== UserRole::Psto->value) {
            $this->merge(['province' => null]);
        }

        if ($this->input('province') === '') {
            $this->merge(['province' => null]);
        }
    }
}
