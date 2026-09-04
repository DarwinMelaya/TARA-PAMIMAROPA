<?php

namespace App\Http\Requests\SuperAdmin;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Concerns\ProvinceValidationRules;
use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    use PasswordValidationRules;
    use ProfileValidationRules;
    use ProvinceValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::SuperAdmin;
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeProvinceForRole();
    }

    /**
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'role' => ['required', 'string', Rule::enum(UserRole::class)],
            ...$this->provinceRules(),
        ];
    }
}
