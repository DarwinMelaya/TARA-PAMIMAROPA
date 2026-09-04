<?php

namespace App\Http\Requests\SuperAdmin;

use App\Concerns\ProfileValidationRules;
use App\Concerns\ProvinceValidationRules;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    use ProfileValidationRules;
    use ProvinceValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::SuperAdmin;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('password') === '') {
            $this->merge(['password' => null]);
        }

        $this->normalizeProvinceForRole();
    }

    /**
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    public function rules(): array
    {
        /** @var User $user */
        $user = $this->route('user');

        return [
            ...$this->profileRules($user->id),
            'password' => ['nullable', 'string', Password::default(), 'confirmed'],
            'role' => ['required', 'string', Rule::enum(UserRole::class)],
            ...$this->provinceRules(),
        ];
    }
}
